import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';

export type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // epoch seconds
  scope?: string;
  token_type?: string;
};

const baseDir = join(os.homedir(), '.mcp', 'docusign');
const tokenPath = join(baseDir, 'tokens.json');

export function loadTokens(): Tokens | null {
  try {
    if (!existsSync(tokenPath)) return null;
    const raw = readFileSync(tokenPath, 'utf-8');
    return JSON.parse(raw) as Tokens;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: Tokens) {
  mkdirSync(baseDir, { recursive: true });
  const data = JSON.stringify(tokens, null, 2);
  writeFileSync(tokenPath, data, 'utf-8');
}

export function clearTokens() {
  if (existsSync(tokenPath)) {
    writeFileSync(tokenPath, '', 'utf-8');
  }
}

export function isExpired(tokens: Tokens | null): boolean {
  if (!tokens?.expires_at) return true;
  const now = Math.floor(Date.now() / 1000);
  // Refresh a minute early to be safe
  return now >= (tokens.expires_at - 60);
}
