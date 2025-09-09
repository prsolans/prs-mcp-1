# MCP DocuSign CLM Server

An MCP (Model Context Protocol) server that connects Claude to DocuSign CLM (Contract Lifecycle Management) using OAuth PKCE authentication.

## Quick Setup

1. **Prerequisites**
   - Node.js 18 or higher
   - DocuSign Developer account with CLM access
   - DocuSign app configured as "Native OS Application" (public client)

2. **DocuSign App Setup**
   - Go to your DocuSign Apps & Keys dashboard
   - Create a new application with type: "Native OS Application"
   - Set redirect URI: `http://localhost:53705/callback`
   - Required scopes: `signature`, `spring_read`, `spring_write`
   - Note your Integration Key (Client ID)

3. **Installation**
   ```bash
   npm install
   npm run build
   ```

4. **Configuration**
   Create a `.env` file with your DocuSign settings:
   ```
   CLIENT_ID=your_integration_key_here
   ACCOUNT_ENV=demo
   CLM_BASE_URL=https://apiuatna11.springcm.com/v2/your_tenant_guid/
   OAUTH_CALLBACK_PORT=53705
   ```

5. **Claude Desktop Configuration**
   Add this to your `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "docusign-clm": {
         "command": "node",
         "args": ["dist/index.js"],
         "cwd": "/absolute/path/to/mcp-docusign-clm",
         "env": {
           "CLIENT_ID": "your_integration_key_here",
           "ACCOUNT_ENV": "demo",
           "CLM_BASE_URL": "https://apiuatna11.springcm.com/v2/your_tenant_guid/",
           "OAUTH_CALLBACK_PORT": "53705"
         }
       }
     }
   }
   ```

## Available Tools

- **docusign_login**: Start OAuth flow and authenticate
- **clm_status**: Check authentication status and token expiry
- **clm_search**: Search CLM content using free text queries
- **clm_get_contract**: Get detailed contract information by ID
- **clm_list_recent**: List recently modified contracts
- **clm_download_document**: Download documents to local files using dedicated download endpoint (https://apidownloaduatna11.springcm.com/v2) with original filenames preserved
- **clm_open_in_web**: Get web URLs for contracts/documents

## Usage

1. Start by running `docusign_login` to authenticate
2. Use `clm_status` to verify your authentication
3. Search and explore your CLM data with the other tools

## Notes

- Tokens are stored at `~/.mcp/docusign/tokens.json`
- Authentication tokens automatically refresh when needed
- This is a proof-of-concept implementation