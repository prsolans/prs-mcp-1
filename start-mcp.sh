#!/bin/bash

# MCP DocuSign CLM Server Launcher
export CLIENT_ID="83e44ab1-18a8-4a7a-9ac8-8396dc8986f8"
export ACCOUNT_ENV="demo"
export CLM_BASE_URL="https://apiuatna11.springcm.com/v2/9bb5a5f6-9bd2-4956-bacc-0bdc19387c91/"
export OAUTH_CALLBACK_PORT="53705"

# Change to project directory
cd "/Users/paul.solans/Projects/mcp-navigator/mcp-docusign-clm"

# Start the server
exec /opt/homebrew/bin/node dist/index.js