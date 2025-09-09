# MCP DocuSign CLM (POC)

Local MCP server exposing DocuSign CLM data to Claude Desktop using OAuth Authorization Code + PKCE.

## Prerequisites

- Node.js 18+
- DocuSign Demo account with CLM and an app in Apps & Keys
  - Application type: Native OS Application (public client)
  - Redirect URI: `http://localhost:53705/callback`
  - Scopes: `signature spring_read spring_write`
  - Client ID (Integration Key)
- Your CLM base URL (tenant): e.g. `https://apiuatna11.springcm.com/v2/<tenant-guid>/`

## Setup

1. Copy `.env.example` to `.env` and edit values:

```
CLIENT_ID=YOUR_CLIENT_ID
ACCOUNT_ENV=demo
CLM_BASE_URL=https://apiuatna11.springcm.com/v2/<tenant-guid>/
OAUTH_CALLBACK_PORT=53705
```

2. Install and build:

```
npm install
npm run build
```

3. Run locally:

```
npm start
```

## Claude Desktop config

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-docusign-clm": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "<absolute-path-to>/mcp-docusign-clm",
      "env": {
        "CLIENT_ID": "YOUR_CLIENT_ID",
        "ACCOUNT_ENV": "demo",
        "CLM_BASE_URL": "https://apiuatna11.springcm.com/v2/<tenant-guid>/",
        "OAUTH_CALLBACK_PORT": "53705"
      }
    }
  }
}
```

## Tools

- `docusign_login`: Launch OAuth login and store tokens.
- `clm_status`: Show auth status and token expiry.
- `clm_search`: POC free-text search via `/search/query`.

## Notes

- Tokens are stored at `~/.mcp/docusign/tokens.json`.
- For production hardening: secure storage, better logging, typed CLM entities, error mapping.
