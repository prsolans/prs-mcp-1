import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ensureTokens, getUserInfo } from './docusignAuth.js';
import { loadTokens } from './storage/tokenStore.js';
import { clmPost, clmGet, clmDownload } from './clmClient.js';

// Load .env if present (optional)
try { await import('dotenv/config'); } catch {}

const server = new McpServer({
  name: 'mcp-docusign-clm',
  version: '0.1.0',
});

server.registerTool(
  'docusign_login',
  {
    description: 'Interactive OAuth login via PKCE for DocuSign (scopes: signature spring_read spring_write)'.trim(),
    inputSchema: {},
  },
  async () => {
    const tokens = await ensureTokens(true);
    const info = await getUserInfo(tokens.access_token);
    const expiresAt = tokens.expires_at ? new Date(tokens.expires_at * 1000).toISOString() : 'unknown';
    return { content: [{ type: 'text', text: JSON.stringify({ user: info?.name || info?.email || 'unknown', expiresAt }, null, 2) }] };
  }
);

server.registerTool(
  'clm_status',
  {
    description: 'Show authentication status and token expiry',
    inputSchema: {},
  },
  async () => {
    const tokens = loadTokens();
    if (!tokens) return { content: [{ type: 'text', text: 'Not authenticated' }] };
    const expiresAt = tokens.expires_at ? new Date(tokens.expires_at * 1000).toISOString() : 'unknown';
    return { content: [{ type: 'text', text: JSON.stringify({ scope: tokens.scope, expiresAt }, null, 2) }] };
  }
);

server.registerTool(
  'clm_search_attributes',
  {
    description: 'Search CLM documents using specific attribute field criteria with pagination and structured output',
    inputSchema: {
      group: z.string().describe('Attribute group name (e.g., "CLM Agreement Details", "Contract Templates")'),
      field: z.string().describe('Field name within the group (e.g., "Type", "Status", "Party Name")'),
      value: z.string().describe('Value to search for (e.g., "Master Service Agreement", "Alpha Corp")'),
      limit: z.number().optional().describe('Maximum number of results to return (default: 50)'),
      offset: z.number().optional().describe('Number of results to skip for pagination (default: 0)'),
      format: z.enum(['full', 'summary']).optional().describe('Output format: full JSON or structured summary (default: summary)')
    },
  },
  async (input: { group: string; field: string; value: string; limit?: number; offset?: number; format?: 'full' | 'summary' }) => {
    await ensureTokens(false);
    const body = {
      AttributeFields: [
        {
          Group: input.group,
          Field: input.field,
          Value: input.value
        }
      ]
    };
    
    // Build query parameters for pagination
    const queryParams = new URLSearchParams();
    queryParams.set('expand', 'AttributeGroups');
    if (input.limit !== undefined) queryParams.set('limit', input.limit.toString());
    if (input.offset !== undefined) queryParams.set('offset', input.offset.toString());
    
    try {
      const res = await clmPost(`/documentsearchtasks?${queryParams.toString()}`, body);
      
      // Enhanced search result formatting
      if (res.Status === 'Success' && res.Result?.Items) {
        const searchSummary = {
          Status: res.Status,
          SearchCriteria: {
            AttributeField: {
              Group: input.group,
              Field: input.field,
              Value: input.value
            }
          },
          SearchResults: {
            Total: res.Result.TotalCount || res.Result.Items.length,
            Returned: res.Result.Items.length,
            Offset: input.offset || 0,
            Limit: input.limit || 50
          },
          Documents: res.Result.Items.map((item: any) => ({
            Name: item.Name,
            Uid: item.Uid,
            Description: item.Description,
            Path: item.Path,
            CreatedDate: item.CreatedDate,
            UpdatedDate: item.UpdatedDate,
            CreatedBy: item.CreatedBy,
            Version: item.Version,
            PageCount: item.PageCount,
            AttributeGroups: item.AttributeGroups || {},
            DownloadUrl: item.DownloadDocumentHref,
            PreviewUrl: item.PreviewUrl,
            Score: item.Score
          })),
          Pagination: {
            HasMore: res.Result.Items.length === (input.limit || 50),
            NextOffset: (input.offset || 0) + res.Result.Items.length,
            PreviousOffset: Math.max(0, (input.offset || 0) - (input.limit || 50))
          },
          RawResponse: input.format === 'full' ? res : undefined
        };
        
        return { content: [{ type: 'text', text: JSON.stringify(searchSummary, null, 2) }] };
      }
      
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Attribute search error: ${e.message}` }] };
    }
  }
);

server.registerTool(
  'clm_search',
  {
    description: 'Search CLM documents using text-based queries with full metadata and pagination',
    inputSchema: {
      allWords: z.string().optional().describe('All these words must be present (comma separated)'),
      anyWords: z.string().optional().describe('Any of these words can be present (comma separated)'),
      phrase: z.string().optional().describe('Exact phrase to search for'),
      title: z.string().optional().describe('Search in document titles'),
      description: z.string().optional().describe('Search in document descriptions'),
      withoutWords: z.string().optional().describe('Exclude documents containing these words (comma separated)'),
      includeSubFolders: z.boolean().optional().describe('Include subfolders in search (default: true)'),
      limit: z.number().optional().describe('Maximum number of results to return (default: 50)'),
      offset: z.number().optional().describe('Number of results to skip for pagination (default: 0)'),
      format: z.enum(['full', 'summary']).optional().describe('Output format: full JSON or structured summary (default: summary)')
    },
  },
  async (input: { 
    allWords?: string; 
    anyWords?: string; 
    phrase?: string; 
    title?: string; 
    description?: string; 
    withoutWords?: string;
    includeSubFolders?: boolean;
    limit?: number;
    offset?: number;
    format?: 'full' | 'summary';
  }) => {
    await ensureTokens(false);
    
    // Build the search body based on provided parameters
    const body: any = {
      IncludeSubFolders: input.includeSubFolders ?? true
    };
    
    if (input.allWords) body.AllWords = input.allWords;
    if (input.anyWords) body.AnyWords = input.anyWords;
    if (input.phrase) body.Phrase = input.phrase;
    if (input.title) body.Title = input.title;
    if (input.description) body.Description = input.description;
    if (input.withoutWords) body.WithoutWords = input.withoutWords;
    
    // Ensure we have at least one search parameter
    if (!Object.keys(body).some(key => key !== 'IncludeSubFolders')) {
      return { content: [{ type: 'text', text: 'Error: At least one search parameter must be provided' }] };
    }
    
    // Build query parameters for pagination
    const queryParams = new URLSearchParams();
    queryParams.set('expand', 'AttributeGroups');
    if (input.limit !== undefined) queryParams.set('limit', input.limit.toString());
    if (input.offset !== undefined) queryParams.set('offset', input.offset.toString());
    
    try {
      const res = await clmPost(`/documentsearchtasks?${queryParams.toString()}`, body);
      
      // Enhanced search result formatting
      if (res.Status === 'Success' && res.Result?.Items) {
        const searchSummary = {
          Status: res.Status,
          SearchResults: {
            Total: res.Result.TotalCount || res.Result.Items.length,
            Returned: res.Result.Items.length,
            Offset: input.offset || 0,
            Limit: input.limit || 50
          },
          Documents: res.Result.Items.map((item: any) => ({
            Name: item.Name,
            Uid: item.Uid,
            Description: item.Description,
            Path: item.Path,
            CreatedDate: item.CreatedDate,
            UpdatedDate: item.UpdatedDate,
            CreatedBy: item.CreatedBy,
            Version: item.Version,
            PageCount: item.PageCount,
            AttributeGroups: item.AttributeGroups || {},
            DownloadUrl: item.DownloadDocumentHref,
            PreviewUrl: item.PreviewUrl,
            Score: item.Score
          })),
          Pagination: {
            HasMore: res.Result.Items.length === (input.limit || 50),
            NextOffset: (input.offset || 0) + res.Result.Items.length,
            PreviousOffset: Math.max(0, (input.offset || 0) - (input.limit || 50))
          },
          RawResponse: input.format === 'full' ? res : undefined
        };
        
        return { content: [{ type: 'text', text: JSON.stringify(searchSummary, null, 2) }] };
      }
      
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Search error: ${e.message}` }] };
    }
  }
);

server.registerTool(
  'clm_get_contract',
  {
    description: 'Get a CLM contract by ID',
    inputSchema: {
      id: z.string()
    },
  },
  async (input: { id: string }) => {
    await ensureTokens(false);
    try {
      const res = await clmGet(`/contracts/${encodeURIComponent(input.id)}`);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Get contract error: ${e.message}` }] };
    }
  }
);

server.registerTool(
  'clm_get_document',
  {
    description: 'Get a CLM document by ID with full metadata, attribute groups, and structured summary',
    inputSchema: {
      id: z.string(),
      format: z.enum(['full', 'summary']).optional().describe('Output format: full JSON or structured summary (default: summary)')
    },
  },
  async (input: { id: string; format?: 'full' | 'summary' }) => {
    await ensureTokens(false);
    try {
      const res = await clmGet(`/documents/${encodeURIComponent(input.id)}`, { expand: 'AttributeGroups' });
      
      if (input.format === 'full') {
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      
      // Structured summary format
      const summary = {
        Document: {
          Name: res.Name,
          Uid: res.Uid,
          Description: res.Description,
          Path: res.Path,
          CreatedDate: res.CreatedDate,
          UpdatedDate: res.UpdatedDate,
          CreatedBy: res.CreatedBy,
          UpdatedBy: res.UpdatedBy,
          Version: res.Version,
          PageCount: res.PageCount,
          NativeFileSize: res.NativeFileSize,
          PdfFileSize: res.PdfFileSize
        },
        AttributeGroups: res.AttributeGroups || {},
        Access: {
          AccessLevel: res.AccessLevel,
          DownloadUrl: res.DownloadDocumentHref,
          PreviewUrl: res.PreviewUrl
        },
        Metadata: {
          ParentFolder: res.ParentFolder?.Name,
          Lock: res.Lock,
          Score: res.Score,
          ContentCreatedDate: res.ContentCreatedDate
        }
      };
      
      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Get document error: ${e.message}` }] };
    }
  }
);

server.registerTool(
  'clm_list_recent',
  {
    description: 'List recent CLM items (contracts) ordered by modified date desc',
    inputSchema: {
      limit: z.number().optional()
    },
  },
  async (input: { limit?: number }) => {
    await ensureTokens(false);
    const size = input.limit ?? 20;
    const body = {
      query: '*',
      size,
      from: 0,
      sort: [{ field: 'modifiedDate', order: 'desc' }],
    } as any;
    try {
      const res = await clmPost('/search/query', body);
      return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `List recent error: ${e.message}` }] };
    }
  }
);

server.registerTool(
  'clm_download_document',
  {
    description: 'Download a CLM document by document ID and extract text content for analysis. Returns file path and extracted text.',
    inputSchema: {
      documentId: z.string(),
      extractText: z.boolean().optional().describe('Extract text content from document (default: true for Claude Desktop compatibility)')
    },
  },
  async (input: { documentId: string; extractText?: boolean }) => {
    await ensureTokens(false);
    try {
      // First get the document to retrieve the actual DownloadDocumentHref
      const doc = await clmGet(`/documents/${encodeURIComponent(input.documentId)}`);
      if (!doc.DownloadDocumentHref) {
        throw new Error('Document has no download URL available');
      }
      
      // Use the exact download URL from the document metadata
      const downloadUrl = new URL(doc.DownloadDocumentHref);
      // Remove the /v2 prefix since CLM_DOWNLOAD_URL already includes it
      const downloadPath = downloadUrl.pathname.replace(/^\/v2/, '');
      
      const res = await clmDownload(downloadPath, doc.Name);
      
      // Extract text content if requested (default: true for Claude Desktop)
      const shouldExtractText = input.extractText !== false;
      let textContent = '';
      let extractionError = '';
      
      if (shouldExtractText) {
        try {
          const fs = await import('node:fs');
          const path = await import('node:path');
          const fileExtension = path.extname(doc.Name).toLowerCase();
          
          if (fileExtension === '.docx') {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ path: res.path });
            textContent = result.value;
          } else if (fileExtension === '.txt') {
            textContent = fs.readFileSync(res.path, 'utf-8');
          } else {
            extractionError = `Text extraction not supported for ${fileExtension} files. File downloaded successfully.`;
          }
        } catch (err: any) {
          extractionError = `Text extraction failed: ${err.message}. File downloaded successfully.`;
        }
      }
      
      const response = { 
        path: res.path, 
        bytes: res.bytes,
        filename: doc.Name,
        downloadUrl: doc.DownloadDocumentHref,
        textContent: textContent || undefined,
        extractionError: extractionError || undefined,
        textExtracted: !!textContent
      };
      
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Download error: ${e.message}` }] };
    }
  }
);

server.registerTool(
  'clm_open_in_web',
  {
    description: 'Return a CLM web UI deep link for a contract or document',
    inputSchema: {
      type: z.enum(['contract', 'document']),
      id: z.string()
    },
  },
  async (input: { type: 'contract' | 'document'; id: string }) => {
    const CLM_WEB_BASE = process.env.CLM_WEB_BASE?.replace(/\/$/, '');
    const apiBase = (process.env.CLM_BASE_URL || '').replace(/\/$/, '');
    let url: string;
    if (CLM_WEB_BASE) {
      url = `${CLM_WEB_BASE}/${input.type}s/${encodeURIComponent(input.id)}`;
    } else if (apiBase) {
      url = `${apiBase}/${input.type}s/${encodeURIComponent(input.id)}`; // fallback to API resource
    } else {
      return { content: [{ type: 'text', text: 'No CLM base configured' }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ url }, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('mcp-docusign-clm server started');
