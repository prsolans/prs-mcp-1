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

### Authentication & Status
- **docusign_login**: Start OAuth flow and authenticate
- **clm_status**: Check authentication status and token expiry

### Enhanced CLM Intelligence Tools 🧠

| Tool | Description | Key Features |
|------|-------------|--------------|
| **clm_analyze_document** | **Full document intelligence analysis** | • Normalized contract metadata<br>• Automatic relationship suggestions<br>• Action items extraction<br>• Risk assessment |
| **clm_confirm_relationship** | **Confirm document relationships** | • Link amendments to master agreements<br>• Connect SOWs to MSAs<br>• Track document versions<br>• Add relationship notes |
| **clm_extract_action_items** | **Smart action items extraction** | • Renewal reminders<br>• Compliance deadlines<br>• Risk factor alerts<br>• Priority-based filtering |

### Portfolio-Level Analytics Tools 📊

| Tool | Description | Strategic Value |
|------|-------------|-----------------|
| **clm_portfolio_risk_dashboard** | **Comprehensive portfolio risk analysis** | • Concentration risk metrics (HHI index)<br>• Risk distribution across portfolio<br>• Counterparty concentration alerts<br>• Geographic & industry diversification |
| **clm_renewal_pipeline** | **Strategic renewal planning & optimization** | • Timeline-based renewal analysis<br>• Consolidation opportunities<br>• Renegotiation priorities<br>• Portfolio efficiency scoring |
| **clm_portfolio_intelligence** | **Strategic contract intelligence & benchmarking** | • Performance relationship analysis<br>• Market benchmarking & pricing trends<br>• Compliance portfolio overview<br>• Executive insights & recommendations |

#### Individual Contract Intelligence Features:
- **🏗️ Normalized Metadata**: Standardized contract structure across all document types (parties, financial terms, key dates, risk indicators)
- **🔗 Relationship Intelligence**: Automatic detection of amendments, master agreements, SOWs, and document versions
- **⚡ Action Items**: Smart extraction of renewals, compliance requirements, termination notices, and risk factors with due dates
- **🛡️ Risk Assessment**: Automatic identification of high-risk clauses (unlimited liability, auto-renewal, short termination notice)
- **📋 Compliance Tracking**: GDPR, SOX, and international compliance flag detection

#### Portfolio-Level Strategic Analytics:
- **📊 Risk Concentration Analysis**: Herfindahl-Hirschman Index for measuring counterparty concentration with critical thresholds
- **📅 Renewal Pipeline Management**: Strategic timeline view with 30/90/365-day horizons and priority-based action planning
- **🎯 Consolidation Opportunities**: Automatic identification of multi-contract relationships for efficiency gains
- **📈 Performance Benchmarking**: Contract performance scoring against industry standards and market positioning
- **🔍 Compliance Portfolio View**: Regulatory compliance tracking across GDPR, SOX, and international requirements
- **💡 Strategic Recommendations**: Executive-level insights with actionable next steps and business impact analysis

### Core CLM Tools
- **clm_search**: Search CLM content using free text queries with enhanced formatting
- **clm_search_attributes**: Search using specific attribute field criteria (Group/Field/Value structure)
- **clm_get_document**: Get detailed document information with full AttributeGroups metadata
- **clm_download_document**: Download documents with automatic text extraction for DOCX files
- **clm_open_in_web**: Get web URLs for contracts/documents

### Navigator API Tools (Beta Access Required)
- **navigator_status**: Check Navigator API availability and beta access status
- **navigator_search_agreements**: Search agreements using Navigator AI with natural language queries
- **navigator_get_agreement**: Get detailed agreement information with AI insights
- **navigator_get_insights**: Get AI-powered insights for a specific agreement
- **navigator_extract_data**: Extract specific data fields from agreements using AI

**Important:** Navigator API is currently in closed beta. Set `NAVIGATOR_BETA_ACCESS=true` in `.env` if you have beta access from DocuSign.

## Usage

1. Start by running `docusign_login` to authenticate
2. Use `clm_status` to verify your authentication
3. Search and explore your CLM data with the other tools

## Notes

- Tokens are stored at `~/.mcp/docusign/tokens.json`
- Authentication tokens automatically refresh when needed
- This is a proof-of-concept implementation