import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ensureTokens, getUserInfo } from './docusignAuth.js';
import { loadTokens } from './storage/tokenStore.js';
import { clmPost, clmGet, clmDownload } from './clmClient.js';
import { 
  processDocumentIntelligence, 
  normalizeContractMetadata, 
  suggestDocumentRelationships,
  extractActionItems,
  type DocumentIntelligence 
} from './clmProcessor.js';
import {
  analyzePortfolioRisk,
  analyzeRenewalPipeline,
  analyzeStrategicIntelligence,
  calculateConcentrationIndex,
  calculateDiversificationScore,
  calculatePortfolioHealth,
  assessCompetitivePosition,
  calculateComplianceScore,
  assessMarketPosition,
  generateStrategicRecommendations
} from './portfolioAnalytics.js';

// JSON to XML conversion utility for workflow parameters (compact format)
function convertJsonToXml(obj: any): string {
  let xml = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    const tagName = key.replace(/[^a-zA-Z0-9_]/g, '_'); // Clean tag names
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      xml += `<${tagName}>`;
      xml += convertJsonToXml(value);
      xml += `</${tagName}>`;
    } else if (Array.isArray(value)) {
      for (const item of value) {
        xml += `<${tagName}>`;
        if (typeof item === 'object') {
          xml += convertJsonToXml(item);
        } else {
          xml += String(item);
        }
        xml += `</${tagName}>`;
      }
    } else {
      xml += `<${tagName}>${String(value)}</${tagName}>`;
    }
  }
  
  return xml;
}

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

// Enhanced CLM Intelligence Tools
server.registerTool(
  'clm_analyze_document',
  {
    description: 'Analyze a CLM document with full intelligence extraction: normalized metadata, relationships, action items, and risk assessment',
    inputSchema: {
      documentId: z.string().describe('Document UID to analyze'),
      includeRelationships: z.boolean().optional().describe('Include relationship suggestions (default: true)'),
      includeActionItems: z.boolean().optional().describe('Include action items extraction (default: true)')
    },
  },
  async (input: { documentId: string; includeRelationships?: boolean; includeActionItems?: boolean }) => {
    try {
      await ensureTokens(false);
      
      // Get the specific document with full metadata
      const doc = await clmGet(`/documents/${encodeURIComponent(input.documentId)}?expand=AttributeGroups`);
      
      let relatedDocuments: any[] = [];
      if (input.includeRelationships !== false) {
        // Get related documents for relationship analysis (same parties, similar names)
        const normalizedMeta = normalizeContractMetadata(doc.AttributeGroups || {});
        if (normalizedMeta.parties.length > 0) {
          try {
            const searchBody = {
              AttributeFields: [
                {
                  Group: 'CLM Agreement Details',
                  Field: 'Client Name',
                  Value: normalizedMeta.parties[0].name
                }
              ]
            };
            const relatedRes = await clmPost('/documentsearchtasks?expand=AttributeGroups&limit=20', searchBody);
            relatedDocuments = relatedRes.Result?.Items || [];
          } catch (e) {
            console.warn('Could not fetch related documents for relationship analysis:', e);
          }
        }
      }
      
      const intelligence = processDocumentIntelligence(doc, relatedDocuments);
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(intelligence, null, 2) 
        }] 
      };
      
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Document analysis error: ${e.message}` }] };
    }
  }
);

server.registerTool(
  'clm_confirm_relationship',
  {
    description: 'Confirm a suggested document relationship and add it to the confirmed relationships list',
    inputSchema: {
      documentId: z.string().describe('Primary document UID'),
      relatedDocumentId: z.string().describe('Related document UID to confirm relationship with'),
      relationship: z.enum(['parent', 'child', 'amendment', 'addendum', 'related', 'superseded', 'version']).describe('Type of relationship'),
      notes: z.string().optional().describe('Additional notes about the relationship')
    },
  },
  async (input: { documentId: string; relatedDocumentId: string; relationship: string; notes?: string }) => {
    try {
      // In a real implementation, this would store the confirmed relationship in a database
      // For now, we'll return the confirmation and suggest next steps
      
      const confirmation = {
        status: 'confirmed',
        relationship: {
          primaryDocument: input.documentId,
          relatedDocument: input.relatedDocumentId,
          relationshipType: input.relationship,
          confirmedAt: new Date().toISOString(),
          notes: input.notes
        },
        nextSteps: [
          `✅ Relationship confirmed: ${input.relationship}`,
          '🔗 Consider adding cross-references in document metadata',
          '📋 Update contract management system with relationship',
          '⚡ Set up alerts for related document changes'
        ],
        links: {
          primaryDocument: `clm_get_document with documentId: ${input.documentId}`,
          relatedDocument: `clm_get_document with documentId: ${input.relatedDocumentId}`,
          analyzePrimary: `clm_analyze_document with documentId: ${input.documentId}`,
          analyzeRelated: `clm_analyze_document with documentId: ${input.relatedDocumentId}`
        }
      };
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(confirmation, null, 2) 
        }] 
      };
      
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Relationship confirmation error: ${e.message}` }] };
    }
  }
);

server.registerTool(
  'clm_extract_action_items',
  {
    description: 'Extract and prioritize action items from CLM documents based on contract metadata and risk analysis',
    inputSchema: {
      documentId: z.string().optional().describe('Specific document UID to analyze (if not provided, analyzes recent documents)'),
      priority: z.enum(['all', 'critical', 'high', 'medium', 'low']).optional().describe('Filter by priority level (default: all)'),
      type: z.enum(['all', 'review', 'renewal', 'payment', 'compliance', 'termination', 'negotiation', 'approval']).optional().describe('Filter by action type (default: all)'),
      daysAhead: z.number().optional().describe('Include actions due within N days (default: 90)')
    },
  },
  async (input: { documentId?: string; priority?: string; type?: string; daysAhead?: number }) => {
    try {
      await ensureTokens(false);
      
      let documents: any[] = [];
      
      if (input.documentId) {
        // Analyze specific document
        const doc = await clmGet(`/documents/${encodeURIComponent(input.documentId)}?expand=AttributeGroups`);
        documents = [doc];
      } else {
        // Get recent documents for analysis
        const searchRes = await clmPost('/documentsearchtasks?expand=AttributeGroups&limit=20', {
          AnyWords: 'agreement contract template loan entertainment'
        });
        documents = searchRes.Result?.Items || [];
      }
      
      const allActionItems = [];
      const documentSummaries = [];
      
      for (const doc of documents) {
        const metadata = normalizeContractMetadata(doc.AttributeGroups || {});
        const actionItems = extractActionItems(metadata, doc);
        
        // Filter by priority and type
        const filteredActions = actionItems.filter(action => {
          if (input.priority && input.priority !== 'all' && action.priority !== input.priority) {
            return false;
          }
          if (input.type && input.type !== 'all' && action.type !== input.type) {
            return false;
          }
          
          // Filter by days ahead
          if (action.dueDate) {
            const dueDate = new Date(action.dueDate);
            const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const maxDays = input.daysAhead || 90;
            if (daysUntilDue > maxDays || daysUntilDue < 0) {
              return false;
            }
          }
          
          return true;
        });
        
        allActionItems.push(...filteredActions);
        
        if (filteredActions.length > 0) {
          documentSummaries.push({
            document: {
              name: doc.Name,
              uid: doc.Uid,
              type: metadata.contractType,
              parties: metadata.parties.map(p => p.name)
            },
            actionCount: filteredActions.length,
            highPriorityCount: filteredActions.filter(a => a.priority === 'critical' || a.priority === 'high').length
          });
        }
      }
      
      // Sort by priority and due date
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      allActionItems.sort((a, b) => {
        if (a.priority !== b.priority) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });
      
      const summary = {
        totalActionItems: allActionItems.length,
        criticalActions: allActionItems.filter(a => a.priority === 'critical').length,
        highPriorityActions: allActionItems.filter(a => a.priority === 'high').length,
        documentsAnalyzed: documents.length,
        documentsWithActions: documentSummaries.length,
        
        actionsByType: {
          renewal: allActionItems.filter(a => a.type === 'renewal').length,
          review: allActionItems.filter(a => a.type === 'review').length,
          compliance: allActionItems.filter(a => a.type === 'compliance').length,
          payment: allActionItems.filter(a => a.type === 'payment').length,
          termination: allActionItems.filter(a => a.type === 'termination').length,
          negotiation: allActionItems.filter(a => a.type === 'negotiation').length,
          approval: allActionItems.filter(a => a.type === 'approval').length
        },
        
        documentSummaries,
        actionItems: allActionItems,
        
        nextSteps: [
          '📋 Review critical and high-priority action items first',
          '📅 Add due dates to calendar system',
          '👥 Assign action items to responsible team members',
          '⚡ Set up automated reminders for approaching deadlines',
          '📊 Use clm_analyze_document for detailed analysis of specific contracts'
        ]
      };
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(summary, null, 2) 
        }] 
      };
      
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Action items extraction error: ${e.message}` }] };
    }
  }
);

// Portfolio-Level Analytics Tools
server.registerTool(
  'clm_portfolio_risk_dashboard',
  {
    description: 'Comprehensive portfolio risk analysis with concentration metrics, risk distribution, and strategic alerts across all contracts',
    inputSchema: {
      includeDetailedBreakdown: z.boolean().optional().describe('Include detailed risk breakdowns by category (default: true)'),
      minContractValue: z.number().optional().describe('Minimum contract value to include in analysis (default: 0)'),
      focusArea: z.enum(['all', 'concentration', 'compliance', 'financial']).optional().describe('Focus analysis on specific risk area (default: all)')
    },
  },
  async (input: { includeDetailedBreakdown?: boolean; minContractValue?: number; focusArea?: string }) => {
    try {
      console.error('Portfolio risk dashboard starting...');
      console.error('Input parameters:', JSON.stringify(input));
      
      await ensureTokens(false);
      console.error('Authentication verified');
      
      // Get all contracts with full metadata for portfolio analysis
      // Use broader search terms to capture all contract types
      console.error('Starting document search...');
      let searchRes;
      try {
        searchRes = await clmPost('/documentsearchtasks?expand=AttributeGroups&limit=20', {
          AnyWords: 'agreement contract template loan entertainment'
        });
        console.error('Search completed successfully');
      } catch (searchError: any) {
        console.error('CLM search failed:', searchError.message);
        throw new Error(`CLM search failed: ${searchError.message}`);
      }
      console.error(`Found ${searchRes.Result?.Items?.length || 0} documents`);
      
      let allContracts = searchRes.Result?.Items || [];
      
      // Filter by minimum value if specified
      if (input.minContractValue) {
        const originalCount = allContracts.length;
        allContracts = allContracts.filter((contract: any) => {
          const metadata = normalizeContractMetadata(contract.AttributeGroups || {});
          return (metadata.financialTerms.totalValue || 0) >= (input.minContractValue || 0);
        });
        console.error(`Filtered from ${originalCount} to ${allContracts.length} contracts by value`);
      }
      
      console.error('Starting portfolio risk analysis...');
      console.error('Analyzing', allContracts.length, 'contracts');
      const analysis = analyzePortfolioRisk(allContracts);
      console.error('Portfolio risk analysis completed');
      console.error('Analysis results preview:', {
        totalContracts: analysis.riskProfile.totalContracts,
        totalValue: analysis.riskProfile.totalValue,
        concentrationItemsCount: analysis.concentrationRisks.counterpartyConcentration.length,
        alertsCount: analysis.portfolioAlerts.length
      });
      
      const dashboard = {
        portfolioOverview: {
          totalContracts: analysis.riskProfile.totalContracts,
          totalPortfolioValue: analysis.riskProfile.totalValue,
          averageContractValue: analysis.riskProfile.totalValue / Math.max(analysis.riskProfile.totalContracts, 1),
          analysisDate: new Date().toISOString()
        },
        
        riskProfile: analysis.riskProfile,
        concentrationRisks: analysis.concentrationRisks,
        portfolioAlerts: analysis.portfolioAlerts,
        
        keyInsights: [
          `Portfolio contains ${analysis.riskProfile.totalContracts} contracts worth $${(analysis.riskProfile.totalValue / 1000000).toFixed(1)}M`,
          `${analysis.riskProfile.overallRiskDistribution.critical + analysis.riskProfile.overallRiskDistribution.high} contracts require immediate attention`,
          `Top counterparty represents ${analysis.concentrationRisks.counterpartyConcentration[0]?.percentage.toFixed(1) || 0}% of portfolio value`,
          `${analysis.portfolioAlerts.filter(a => a.severity === 'critical').length} critical alerts requiring immediate action`
        ],
        
        nextSteps: [
          '📊 Review concentration risks above 15% threshold',
          '⚠️ Address critical and high-risk contracts first',
          '📋 Implement risk monitoring for top 5 counterparties',
          '🔍 Schedule quarterly portfolio risk reviews',
          '⚡ Use clm_renewal_pipeline for upcoming renewal planning'
        ],
        
        detailedBreakdown: input.includeDetailedBreakdown !== false ? {
          riskDistributionByValue: analysis.riskProfile.riskValueDistribution,
          topRiskContracts: analysis.portfolioAlerts.filter(a => a.type === 'risk'),
          concentrationMetrics: {
            herfindahlIndex: calculateConcentrationIndex(analysis.concentrationRisks.counterpartyConcentration),
            diversificationScore: calculateDiversificationScore(analysis.concentrationRisks)
          }
        } : undefined
      };
      
      console.error('Preparing dashboard response...');
      console.error('Dashboard keys:', Object.keys(dashboard));
      const response = { 
        content: [{ 
          type: 'text' as const, 
          text: JSON.stringify(dashboard, null, 2) 
        }] 
      };
      console.error('Portfolio dashboard response ready');
      return response;
      
    } catch (e: any) {
      console.error('Portfolio risk analysis error:', e);
      return { content: [{ type: 'text', text: `Portfolio risk analysis error: ${e.message}\nStack: ${e.stack}` }] };
    }
  }
);

server.registerTool(
  'clm_renewal_pipeline',
  {
    description: 'Strategic renewal pipeline analysis with optimization opportunities, consolidation recommendations, and renegotiation priorities',
    inputSchema: {
      timeHorizon: z.enum(['30days', '90days', '1year', 'all']).optional().describe('Focus on specific time horizon (default: all)'),
      minContractValue: z.number().optional().describe('Minimum contract value to include (default: 0)'),
      includeOptimization: z.boolean().optional().describe('Include consolidation and optimization analysis (default: true)'),
      priorityLevel: z.enum(['all', 'critical', 'high', 'medium']).optional().describe('Filter by priority level (default: all)')
    },
  },
  async (input: { timeHorizon?: string; minContractValue?: number; includeOptimization?: boolean; priorityLevel?: string }) => {
    try {
      await ensureTokens(false);
      
      // Get all contracts for renewal analysis
      // Use broader search terms to capture all contract types
      const searchRes = await clmPost('/documentsearchtasks?expand=AttributeGroups&limit=100', {
        AnyWords: 'agreement contract template loan entertainment'
      });
      
      let allContracts = searchRes.Result?.Items || [];
      
      // Filter by minimum value if specified
      if (input.minContractValue) {
        allContracts = allContracts.filter((contract: any) => {
          const metadata = normalizeContractMetadata(contract.AttributeGroups || {});
          return (metadata.financialTerms.totalValue || 0) >= (input.minContractValue || 0);
        });
      }
      
      const analysis = analyzeRenewalPipeline(allContracts);
      
      // Filter by time horizon
      let renewalPipeline = analysis.renewalPipeline;
      if (input.timeHorizon === '30days') {
        renewalPipeline = { next30Days: analysis.renewalPipeline.next30Days, next90Days: [], nextYear: [] };
      } else if (input.timeHorizon === '90days') {
        renewalPipeline = { next30Days: analysis.renewalPipeline.next30Days, next90Days: analysis.renewalPipeline.next90Days, nextYear: [] };
      }
      
      // Filter by priority
      if (input.priorityLevel && input.priorityLevel !== 'all') {
        const filterFn = (item: any) => item.priority === input.priorityLevel || 
                                       (input.priorityLevel === 'critical' && (item.priority === 'critical' || item.priority === 'high'));
        renewalPipeline.next30Days = renewalPipeline.next30Days.filter(filterFn);
        renewalPipeline.next90Days = renewalPipeline.next90Days.filter(filterFn);
        renewalPipeline.nextYear = renewalPipeline.nextYear.filter(filterFn);
      }
      
      const totalRenewals = renewalPipeline.next30Days.length + renewalPipeline.next90Days.length + renewalPipeline.nextYear.length;
      const totalRenewalValue = [...renewalPipeline.next30Days, ...renewalPipeline.next90Days, ...renewalPipeline.nextYear]
        .reduce((sum, item) => sum + item.value, 0);
      
      const pipeline = {
        renewalSummary: {
          totalUpcomingRenewals: totalRenewals,
          totalRenewalValue: totalRenewalValue,
          criticalRenewals: [...renewalPipeline.next30Days, ...renewalPipeline.next90Days, ...renewalPipeline.nextYear]
            .filter(item => item.priority === 'critical').length,
          automaticRenewals: [...renewalPipeline.next30Days, ...renewalPipeline.next90Days, ...renewalPipeline.nextYear]
            .filter(item => item.renewalType === 'automatic').length,
          analysisDate: new Date().toISOString()
        },
        
        renewalPipeline,
        renegotiationPriorities: analysis.renegotiationPriorities,
        
        strategicInsights: [
          `${totalRenewals} contracts worth $${(totalRenewalValue / 1000000).toFixed(1)}M require renewal attention`,
          `${renewalPipeline.next30Days.length} urgent renewals in next 30 days`,
          `${analysis.renegotiationPriorities.filter(p => p.priority === 'critical').length} contracts need immediate renegotiation`,
          `Portfolio efficiency score: ${analysis.portfolioOptimization.contractEfficiencyScore}%`
        ],
        
        optimizationOpportunities: input.includeOptimization !== false ? {
          consolidationOpportunities: analysis.consolidationOpportunities,
          portfolioOptimization: analysis.portfolioOptimization,
          estimatedSavings: analysis.consolidationOpportunities.reduce((total, opp) => total + opp.currentContracts, 0) * 2500 // Estimated $2.5K per contract saved
        } : undefined,
        
        actionPlan: [
          '🚨 Address critical renewals in next 30 days immediately',
          '📋 Schedule renewal negotiations for high-priority contracts',
          '🔄 Review automatic renewal clauses for better control',
          '📊 Implement consolidation opportunities to reduce complexity',
          '⚡ Use clm_confirm_relationship to link related agreements'
        ]
      };
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(pipeline, null, 2) 
        }] 
      };
      
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Renewal pipeline analysis error: ${e.message}` }] };
    }
  }
);

server.registerTool(
  'clm_portfolio_intelligence',
  {
    description: 'Strategic contract intelligence with performance benchmarking, market analysis, and compliance portfolio view',
    inputSchema: {
      analysisType: z.enum(['all', 'performance', 'benchmarking', 'compliance']).optional().describe('Focus analysis type (default: all)'),
      includeMarketData: z.boolean().optional().describe('Include market benchmarking and pricing trends (default: true)'),
      performanceThreshold: z.number().optional().describe('Performance score threshold for analysis (default: 70)'),
      complianceRegulation: z.enum(['all', 'gdpr', 'sox', 'international']).optional().describe('Focus on specific compliance area (default: all)')
    },
  },
  async (input: { analysisType?: string; includeMarketData?: boolean; performanceThreshold?: number; complianceRegulation?: string }) => {
    try {
      await ensureTokens(false);
      
      // Get all contracts for strategic analysis
      // Use broader search terms to capture all contract types
      const searchRes = await clmPost('/documentsearchtasks?expand=AttributeGroups&limit=100', {
        AnyWords: 'agreement contract template loan entertainment'
      });
      
      const allContracts = searchRes.Result?.Items || [];
      const analysis = analyzeStrategicIntelligence(allContracts);
      
      // Filter performance data by threshold
      const threshold = input.performanceThreshold || 70;
      const topPerformers = analysis.contractPerformance.topPerformingRelationships
        .filter(p => p.performanceScore >= threshold);
      const underPerformers = analysis.contractPerformance.underperformingContracts
        .filter(p => p.performanceScore < threshold);
      
      // Filter compliance data by regulation
      let complianceData = analysis.compliancePortfolioView;
      if (input.complianceRegulation && input.complianceRegulation !== 'all') {
        const reg = input.complianceRegulation;
        complianceData = {
          regulatoryCompliance: { [reg]: complianceData.regulatoryCompliance[reg] },
          upcomingRegulatory: complianceData.upcomingRegulatory.filter(u => 
            u.regulation.toLowerCase().includes(reg) || 
            (reg === 'international' && u.regulation.includes('EU'))
          )
        };
      }
      
      const totalPortfolioValue = allContracts.reduce((sum: number, contract: any) => {
        const metadata = normalizeContractMetadata(contract.AttributeGroups || {});
        return sum + (metadata.financialTerms.totalValue || 0);
      }, 0);
      
      const intelligence = {
        portfolioIntelligenceSummary: {
          totalContracts: allContracts.length,
          totalPortfolioValue,
          topPerformers: topPerformers.length,
          underPerformers: underPerformers.length,
          overallPortfolioHealth: calculatePortfolioHealth(topPerformers, underPerformers, allContracts.length),
          analysisDate: new Date().toISOString()
        },
        
        contractPerformance: {
          topPerformingRelationships: topPerformers,
          underperformingContracts: underPerformers,
          performanceMetrics: {
            averagePerformanceScore: topPerformers.reduce((sum, p) => sum + p.performanceScore, 0) / Math.max(topPerformers.length, 1),
            strategicPartnerships: topPerformers.filter(p => p.strategicValue === 'critical' || p.strategicValue === 'high').length,
            relationshipsAtRisk: underPerformers.filter(p => p.recommendedAction === 'consider_termination').length
          }
        },
        
        marketIntelligence: input.includeMarketData !== false ? {
          termsBenchmarking: analysis.marketIntelligence.termsBenchmarking,
          pricingTrends: analysis.marketIntelligence.pricingTrends,
          competitivePosition: assessCompetitivePosition(analysis.marketIntelligence.termsBenchmarking)
        } : undefined,
        
        compliancePortfolioView: complianceData,
        
        strategicRecommendations: generateStrategicRecommendations(analysis, topPerformers, underPerformers),
        
        executiveInsights: [
          `${topPerformers.length} high-performing partnerships drive ${Math.round((topPerformers.reduce((sum, p) => sum + p.totalValue, 0) / totalPortfolioValue) * 100)}% of portfolio value`,
          `${underPerformers.length} underperforming relationships require intervention`,
          `Portfolio compliance score: ${calculateComplianceScore(complianceData)}%`,
          `Market position: ${assessMarketPosition(analysis.marketIntelligence.termsBenchmarking)}`
        ],
        
        nextSteps: [
          '🎯 Focus on expanding top-performing partnerships',
          '⚠️ Develop improvement plans for underperforming contracts',
          '📊 Benchmark terms against industry standards quarterly',
          '🔍 Monitor upcoming regulatory changes proactively',
          '📈 Implement performance tracking for strategic relationships'
        ]
      };
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(intelligence, null, 2) 
        }] 
      };
      
    } catch (e: any) {
      return { content: [{ type: 'text', text: `Portfolio intelligence analysis error: ${e.message}` }] };
    }
  }
);

// Workflow Management Tool
server.registerTool(
  'clm_start_workflow',
  {
    description: 'Start a CLM workflow with structured parameters converted from JSON to XML format',
    inputSchema: {
      workflowName: z.string().describe('Name of the workflow to start (e.g., "Agreement Update")'),
      parameters: z.object({}).passthrough().describe('Structured JSON parameters to be converted to XML format for the workflow'),
    },
  },
  async (input: { workflowName: string; parameters: Record<string, any> }) => {
    try {
      await ensureTokens(false);
      
      // Convert JSON parameters to XML format (compact string)
      const xmlParams = `<Params>${convertJsonToXml(input.parameters)}</Params>`;
      
      // Prepare workflow payload in exact required format
      const workflowPayload = {
        Name: input.workflowName,
        Params: xmlParams
      };
      
      console.error('Starting workflow:', input.workflowName);
      console.error('XML Parameters:', xmlParams);
      
      // Post to workflows endpoint
      const result = await clmPost('/workflows', workflowPayload);
      
      const response = {
        workflowName: input.workflowName,
        status: 'started',
        workflowId: result.Id || result.id || 'unknown',
        originalParameters: input.parameters,
        xmlParameters: xmlParams,
        result: result,
        timestamp: new Date().toISOString()
      };
      
      return { 
        content: [{ 
          type: 'text' as const, 
          text: JSON.stringify(response, null, 2) 
        }] 
      };
      
    } catch (e: any) {
      console.error('Workflow start error:', e);
      return { content: [{ type: 'text', text: `Workflow start error: ${e.message}\nStack: ${e.stack}` }] };
    }
  }
);

// Contract Analysis Template Tool
server.registerTool(
  'clm_get_analysis_template',
  {
    description: 'Get contract analysis presentation templates for consistent Claude artifact formatting',
    inputSchema: {
      templateType: z.enum(['short-form', 'detailed', 'instructions']).describe('Type of template: short-form (strategic overview), detailed (comprehensive analysis), or instructions (Claude usage guide)')
    },
  },
  async (input: { templateType: string }) => {
    try {
      let templatePath: string;
      let templateDescription: string;
      
      switch (input.templateType) {
        case 'short-form':
          templatePath = join(process.cwd(), 'templates', 'contract-analysis-short-form.md');
          templateDescription = 'Short-form contract analysis template focusing on Contract Evolution, Key Dates, Critical Actions, and Growth Opportunities';
          break;
        case 'detailed':
          templatePath = join(process.cwd(), 'templates', 'contract-analysis-detailed.md');
          templateDescription = 'Detailed contract analysis template with full data extraction, structured metadata, and comprehensive strategic assessment';
          break;
        case 'instructions':
          templatePath = join(process.cwd(), 'templates', 'claude-instructions.md');
          templateDescription = 'Claude implementation instructions for using contract analysis templates effectively';
          break;
        default:
          throw new Error(`Unknown template type: ${input.templateType}`);
      }
      
      const templateContent = readFileSync(templatePath, 'utf-8');
      
      const response = {
        templateType: input.templateType,
        description: templateDescription,
        template: templateContent,
        usage: {
          shortForm: 'Use for strategic overviews, executive briefings, and quick action-oriented analysis',
          detailed: 'Use for comprehensive analysis, full data extraction, and deep strategic assessment',
          instructions: 'Implementation guide for Claude with quality standards and narrative requirements'
        },
        timestamp: new Date().toISOString()
      };
      
      return { 
        content: [{ 
          type: 'text' as const, 
          text: JSON.stringify(response, null, 2) 
        }] 
      };
      
    } catch (e: any) {
      console.error('Template access error:', e);
      return { content: [{ type: 'text', text: `Template access error: ${e.message}` }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('mcp-docusign-clm server started');
