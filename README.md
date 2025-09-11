# MCP DocuSign CLM Server

Advanced MCP server providing comprehensive DocuSign CLM integration with portfolio analytics, contract intelligence, and workflow automation capabilities.

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

## Features

### 🔐 Authentication & Core Access
- **OAuth 2.0 PKCE Flow**: Secure authentication with DocuSign CLM
- **Token Management**: Automatic token refresh and secure storage
- **Multi-environment Support**: Demo, UAT, and Production environments

### 📄 Document & Contract Management
- **Document Search**: Advanced text-based search across CLM documents
- **Contract Analysis**: AI-powered document intelligence and metadata extraction
- **Document Relationships**: Automatic suggestion of related contracts
- **Document Download**: PDF/DOCX download with text extraction

### 📊 Portfolio-Level Analytics
- **Portfolio Risk Dashboard**: Comprehensive risk analysis with concentration metrics
- **Renewal Pipeline**: Strategic renewal analysis with optimization opportunities  
- **Portfolio Intelligence**: Performance benchmarking and strategic insights
- **Contract Lifecycle Management**: Action item extraction and prioritization

### 🔄 Workflow Automation
- **Workflow Execution**: Start CLM workflows with structured parameters
- **JSON to XML Conversion**: Automatic parameter formatting for CLM workflows
- **Workflow Monitoring**: Status tracking and result reporting

## Tools

### Authentication
- `docusign_login`: Launch OAuth login and store tokens
- `clm_status`: Show authentication status and token expiry

### Search & Discovery  
- `clm_search`: Advanced document search with metadata and pagination
- `clm_list_recent`: List recent CLM items ordered by modification date
- `clm_get_document`: Get document by ID with full metadata and structured summary
- `clm_get_contract`: Get contract by ID with complete details

### Document Intelligence
- `clm_analyze_document`: AI-powered document analysis with relationship suggestions
- `clm_confirm_relationship`: Confirm suggested document relationships
- `clm_download_document`: Download and extract text content from documents
- `clm_open_in_web`: Generate CLM web UI deep links

### Portfolio Analytics
- `clm_portfolio_risk_dashboard`: Comprehensive portfolio risk analysis with concentration metrics
- `clm_renewal_pipeline`: Strategic renewal pipeline with optimization recommendations  
- `clm_portfolio_intelligence`: Performance benchmarking and strategic contract insights
- `clm_extract_action_items`: Extract and prioritize action items from contract metadata

### Workflow Management
- `clm_start_workflow`: Execute CLM workflows with JSON-to-XML parameter conversion

### Analysis Templates
- `clm_get_analysis_template`: Get contract analysis presentation templates for consistent Claude artifact formatting

### Utility
- `clm_attribute_search`: Search CLM attribute definitions and values

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   Claude Code   │◄──►│   MCP Server     │◄──►│  DocuSign CLM   │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │                  │
                       │ Portfolio Engine │
                       │ - Risk Analysis  │
                       │ - Intelligence   │
                       │ - Workflows      │
                       │                  │
                       └──────────────────┘
```

## Usage Examples

### Portfolio Risk Analysis
```typescript
// Get comprehensive portfolio risk dashboard
await clm_portfolio_risk_dashboard({
  includeDetailedBreakdown: true,
  minContractValue: 100000,
  focusArea: "concentration"
});
```

### Contract Intelligence  
```typescript
// Analyze specific document with relationships
await clm_analyze_document({
  documentId: "contract-id-123",
  includeRelationships: true,
  includeActionItems: true
});
```

### Workflow Automation
```typescript
// Start workflow with structured data
await clm_start_workflow({
  workflowName: "Attribute Update",
  parameters: {
    Business_Name: "Acme Corporation",
    Contact_Information: {
      Contact_Name: "John Doe",
      Contact_Email: "john@acme.com"
    },
    Agreement_Terms: {
      Payment_Terms: "30",
      Include_GDPR_Language: "True"
    }
  }
});
```

### Analysis Templates
```typescript
// Get presentation templates for consistent Claude artifacts
await clm_get_analysis_template({
  templateType: "short-form"  // or "detailed" or "instructions"
});
```

## Configuration

Environment variables in `.env`:

```bash
# DocuSign OAuth Configuration
CLIENT_ID=your_client_id_here
ACCOUNT_ENV=demo  # demo, uat, or production
OAUTH_CALLBACK_PORT=53705

# CLM Configuration  
CLM_BASE_URL=https://apiuatna11.springcm.com/v2/your-tenant-guid/
```

## Data Security

- **Token Storage**: Encrypted storage at `~/.mcp/docusign/tokens.json`
- **HTTPS Only**: All API communications use HTTPS
- **No Data Persistence**: No contract data stored locally
- **OAuth 2.0**: Industry-standard authentication with PKCE

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build  

# Run development server
npm run dev

# Run all tests
node run-tests.js

# Run specific test categories
node run-tests.js portfolio workflow
node run-tests.js auth documents
```

## Testing

The project includes comprehensive test suites organized by functionality:

```bash
tests/
├── portfolio/     # Portfolio analytics tests
├── auth/          # Authentication tests  
├── documents/     # Document management tests
├── navigation/    # Navigator API tests
├── workflow/      # Workflow automation tests
├── debug/         # Debug utilities
└── general/       # General CLM functionality tests
```

See `tests/README.md` for detailed information about each test category.

## License

MIT License - See LICENSE file for details
