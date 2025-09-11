# Test Files Organization

This directory contains all test and debug files organized by functionality.

## Directory Structure

### 📊 `portfolio/`
Portfolio analytics and risk analysis tests:
- `test-final-portfolio.js` - Comprehensive portfolio dashboard test
- `test-portfolio-analytics.js` - Portfolio analytics engine test  
- `test-corrected-portfolio.js` - Corrected data extraction test
- `debug-portfolio-dashboard.js` - Portfolio dashboard debugging

### 🔐 `auth/`
Authentication and authorization tests:
- `auth-test.js` - OAuth authentication testing

### 📄 `documents/`
Document management and intelligence tests:
- `document-test.js` - Basic document retrieval test
- `working-doc-test.js` - Working document analysis test
- `test-download.js` - Document download functionality
- `test-download-url.js` - Download URL generation test
- `test-final-download.js` - Final download implementation test
- `test-text-extraction.js` - Text extraction from documents test
- `test-clm-intelligence.js` - CLM document intelligence test

### 🧭 `navigation/`
Navigator API and endpoint tests:
- `test-navigator-endpoints.js` - Navigator API endpoints test
- `test-navigator-status.js` - Navigator status checking
- `test-navigator-with-accountid.js` - Navigator with account ID test
- `test-navigator-api.js` - Navigator API integration test

### 🔄 `workflow/`
Workflow automation and XML conversion tests:
- `test-workflow.js` - CLM workflow execution test
- `test-xml-format.js` - JSON to XML conversion test

### 🐛 `debug/`
Debug and troubleshooting utilities:
- `debug-clm-data.js` - CLM data structure debugging
- `debug-desktop-integration.js` - Claude Desktop integration debugging

### 📋 `general/`
General CLM functionality tests:
- `test-expanded.js` - Expanded CLM functionality test
- `test-enhanced-schema.js` - Enhanced schema validation test
- `clm-test.js` - Basic CLM connectivity test
- `test-search.js` - Document search functionality test
- `test-comprehensive-search.js` - Comprehensive search test
- `test-pagination.js` - Search pagination test
- `final-test.js` - Final integration test
- `simple-test.js` - Simple CLM connection test
- `test-clm-structure.js` - CLM data structure test
- `test-client.js` - CLM client functionality test
- `url-test.js` - URL generation and validation test
- `test-foxtrot-actions.js` - Foxtrot actions test

## Running Tests

Execute tests from the project root directory:

```bash
# Run specific test category
node tests/portfolio/test-final-portfolio.js
node tests/workflow/test-workflow.js
node tests/auth/auth-test.js

# Run debug utilities  
node tests/debug/debug-clm-data.js
node tests/debug/debug-desktop-integration.js
```

## Test Environment

All tests require:
- Proper `.env` configuration
- Built project (`npm run build`)
- Valid DocuSign CLM credentials
- Active network connection

## Notes

- Tests may modify CLM data - use with caution in production environments
- Some tests require specific document IDs or workflow names
- Debug files provide detailed logging for troubleshooting
- Portfolio tests require contracts with proper AttributeGroups structure