import http from 'node:http';
import crypto from 'node:crypto';
import { URLSearchParams } from 'node:url';
import open from 'open';
import { loadTokens, saveTokens, isExpired, type Tokens } from './storage/tokenStore.js';

const CLIENT_ID = process.env.CLIENT_ID;
if (!CLIENT_ID) {
  throw new Error('CLIENT_ID environment variable is required');
}
const VERIFIED_CLIENT_ID: string = CLIENT_ID;

const ACCOUNT_ENV = process.env.ACCOUNT_ENV || 'demo';
const CALLBACK_PORT = parseInt(process.env.OAUTH_CALLBACK_PORT || '53705', 10);

const AUTH_BASE = ACCOUNT_ENV === 'prod' ? 'https://account.docusign.com' : 'https://account-d.docusign.com';
const AUTH_URL = `${AUTH_BASE}/oauth/auth`;
const TOKEN_URL = `${AUTH_BASE}/oauth/token`;
const USERINFO_URL = `${AUTH_BASE}/oauth/userinfo`;

const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;
// Required scopes for CLM demo per user input
const SCOPES = ['signature', 'spring_read', 'spring_write'];

function base64url(input: Buffer) {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createPKCE() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

async function postToken(params: Record<string, string>): Promise<any> {
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token endpoint error ${resp.status}: ${text}`);
  }
  return resp.json();
}

export async function ensureTokens(interactive = false): Promise<Tokens> {
  let tokens = loadTokens();
  if (tokens && !isExpired(tokens)) return tokens;
  if (tokens && tokens.refresh_token) {
    try {
      const refreshed = await refresh(tokens.refresh_token);
      saveTokens(refreshed);
      return refreshed;
    } catch (e) {
      // fallthrough to interactive
    }
  }
  if (!interactive) throw new Error('Not authenticated. Run docusign_login first.');
  const newTokens = await authCodePkce();
  saveTokens(newTokens);
  return newTokens;
}

export async function getUserInfo(accessToken: string): Promise<any> {
  const resp = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`userinfo error ${resp.status}`);
  return resp.json();
}

async function refresh(refreshToken: string): Promise<Tokens> {
  const body = await postToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: VERIFIED_CLIENT_ID,
  });
  const expires_at = Math.floor(Date.now() / 1000) + (body.expires_in ?? 3600);
  return { ...body, expires_at } as Tokens;
}

async function authCodePkce(): Promise<Tokens> {
  const { verifier, challenge } = createPKCE();
  const state = base64url(crypto.randomBytes(16));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: VERIFIED_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  const authUrl = `${AUTH_URL}?${params.toString()}`;

  // Start local callback server
  const code: { value?: string } = {};
  const server = http.createServer((req, res) => {
    if (!req.url) return;
    
    try {
      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
      if (url.pathname === '/callback') {
        const error = url.searchParams.get('error');
        if (error) {
          const errorDescription = url.searchParams.get('error_description') || error;
          res.statusCode = 400;
          res.end(`OAuth error: ${errorDescription}`);
          return;
        }
        
        const receivedState = url.searchParams.get('state');
        if (receivedState !== state) {
          res.statusCode = 400;
          res.end('State mismatch - possible security issue');
          return;
        }
        
        const c = url.searchParams.get('code');
        if (!c) {
          res.statusCode = 400;
          res.end('Missing authorization code');
          return;
        }
        
        code.value = c;
        res.statusCode = 200;
        res.end('✅ Authentication successful! You may close this window and return to the app.');
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    } catch (err) {
      res.statusCode = 500;
      res.end('Internal server error processing callback');
    }
  });

  await new Promise<void>((resolve) => server.listen(CALLBACK_PORT, resolve));
  await open(authUrl);

  const authorizationCode = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('OAuth timeout')), 5 * 60_000);
    const interval = setInterval(() => {
      if (code.value) {
        clearTimeout(timeout);
        clearInterval(interval);
        resolve(code.value);
      }
    }, 250);
  }).finally(() => server.close());

  const body = await postToken({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: REDIRECT_URI,
    client_id: VERIFIED_CLIENT_ID,
    code_verifier: verifier,
  });
  const expires_at = Math.floor(Date.now() / 1000) + (body.expires_in ?? 3600);
  return { ...body, expires_at } as Tokens;
}
