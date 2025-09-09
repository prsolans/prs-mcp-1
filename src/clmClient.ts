import { ensureTokens } from './docusignAuth.js';

const CLM_BASE_URL = process.env.CLM_BASE_URL?.replace(/\/$/, '') || '';
const CLM_DOWNLOAD_URL = process.env.CLM_DOWNLOAD_URL?.replace(/\/$/, '') || 'https://apidownloaduatna11.springcm.com/v2';

// Extract tenant GUID from CLM_BASE_URL for download endpoint
const tenantMatch = CLM_BASE_URL.match(/\/v2\/([a-f0-9-]+)/);
const TENANT_GUID = tenantMatch ? tenantMatch[1] : '';

if (!CLM_BASE_URL) {
  console.warn('Warning: CLM_BASE_URL is not set. Set it in .env or environment.');
}
if (!TENANT_GUID) {
  console.warn('Warning: Could not extract tenant GUID from CLM_BASE_URL for downloads.');
}

async function authHeader() {
  const tokens = await ensureTokens(false);
  return { Authorization: `Bearer ${tokens.access_token}` } as const;
}

export async function clmGet(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const headers = { 'Accept': 'application/json', ...(await authHeader()) } as Record<string, string>;
  const url = new URL(`${CLM_BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`CLM GET ${url} -> ${resp.status}`);
  return resp.json();
}

export async function clmPost(path: string, body: unknown) {
  const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(await authHeader()) } as Record<string, string>;
  const url = `${CLM_BASE_URL}${path}`;
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`CLM POST ${url} -> ${resp.status}: ${text}`);
  }
  return resp.json();
}

export async function clmDownload(path: string, filename?: string): Promise<{ path: string } & { bytes: number }> {
  const headers = { ...(await authHeader()) } as Record<string, string>;
  
  // If path already includes the tenant GUID (from DownloadDocumentHref), use as-is
  // Otherwise, prepend tenant GUID for relative paths
  const fullPath = path.includes(`/${TENANT_GUID}/`) ? path : (TENANT_GUID ? `/${TENANT_GUID}${path}` : path);
  const url = `${CLM_DOWNLOAD_URL}${fullPath}`;
  
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`CLM DOWNLOAD ${url} -> ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const tmp = await import('node:os');
  const fs = await import('node:fs');
  const p = await import('node:path');
  
  // Use provided filename or generate default
  const safeFilename = filename ? filename.replace(/[^a-zA-Z0-9.-]/g, '_') : `clm-${Date.now()}.bin`;
  const outPath = p.join(tmp.tmpdir(), safeFilename);
  
  fs.writeFileSync(outPath, buf);
  return { path: outPath, bytes: buf.length };
}
