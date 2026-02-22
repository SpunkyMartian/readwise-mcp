#!/usr/bin/env node
/**
 * Smithery-compatible entry point for Readwise MCP Server
 * 
 * This file provides a simplified entry point that works with Smithery's TypeScript runtime.
 * Smithery handles all HTTP/transport setup automatically, so we just need to:
 * 1. Export a configSchema (using Zod)
 * 2. Export a default function that creates and returns the MCP server
 * 3. Register all tools with the server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { z as zod } from "zod";

// Import API client and tools
// Use FetchClient instead of ReadwiseClient for Cloudflare Workers compatibility
// (axios and its dependencies require Node.js built-ins that don't work in Workers)
import { FetchClient } from './api/fetch-client.js';
import { ReadwiseAPI } from './api/readwise-api.js';

// Import all tools
import { GetHighlightsTool } from './tools/get-highlights.js';
import { GetBooksTool } from './tools/get-books.js';
import { GetTagsTool } from './tools/get-tags.js';
import { CreateHighlightTool } from './tools/create-highlight.js';
import { UpdateHighlightTool } from './tools/update-highlight.js';
import { DeleteHighlightTool } from './tools/delete-highlight.js';
import { SaveDocumentTool } from './tools/save-document.js';
import { UpdateDocumentTool } from './tools/update-document.js';
import { DeleteDocumentTool } from './tools/delete-document.js';
import { GetRecentContentTool } from './tools/get-recent-content.js';
import { BulkSaveDocumentsTool } from './tools/bulk-save-documents.js';
import { BulkUpdateDocumentsTool } from './tools/bulk-update-documents.js';
import { BulkDeleteDocumentsTool } from './tools/bulk-delete-documents.js';
import { ValidateTokenTool } from './tools/validate-token.js';
import { ListDocumentsTool } from './tools/list-documents.js';
import { GetDocumentTool } from './tools/get-document.js';
import { GetHighlightTool } from './tools/get-highlight.js';
import { GetBookTool } from './tools/get-book.js';
import { ExportHighlightsTool } from './tools/export-highlights.js';
import { GetDailyReviewTool } from './tools/get-daily-review.js';
import { ListHighlightTagsTool } from './tools/list-highlight-tags.js';
import { GetHighlightTagTool } from './tools/get-highlight-tag.js';
import { CreateHighlightTagTool } from './tools/create-highlight-tag.js';
import { RenameHighlightTagTool } from './tools/rename-highlight-tag.js';
import { DeleteHighlightTagTool } from './tools/delete-highlight-tag.js';
import { ListBookTagsTool } from './tools/list-book-tags.js';
import { GetBookTagTool } from './tools/get-book-tag.js';
import { CreateBookTagTool } from './tools/create-book-tag.js';
import { RenameBookTagTool } from './tools/rename-book-tag.js';
import { DeleteBookTagTool } from './tools/delete-book-tag.js';

// Import prompts
import { ReadwiseHighlightPrompt } from './prompts/highlight-prompt.js';
import { ReadwiseSearchPrompt } from './prompts/search-prompt.js';

// Import logger interface and create a simple console logger
import type { Logger } from './utils/logger-interface.js';

// Import response converter utility
import { toMCPResponse } from './utils/response.js';

// Simple console logger for Smithery
import { LogLevel } from './utils/logger-interface.js';
const consoleLogger: Logger = {
  level: LogLevel.INFO,
  transport: console.log,
  timestamps: true,
  colors: false,
  debug: (message: string, context?: unknown) => console.log('[DEBUG]', message, context || ''),
  info: (message: string, context?: unknown) => console.log('[INFO]', message, context || ''),
  warn: (message: string, context?: unknown) => console.warn('[WARN]', message, context || ''),
  error: (message: string, context?: unknown) => console.error('[ERROR]', message, context || ''),
};

// Configuration schema for Smithery
export const configSchema = z.object({
  readwiseApiKey: z.string().optional().describe("Your Readwise API access token. Get it from https://readwise.io/access_token"),
  debug: z.boolean().default(false).describe("Enable verbose debug logging to troubleshoot issues")
});

// Zod parameter schemas for all tools
const toolSchemas: Record<string, Record<string, z.ZodType>> = {
  validate_token: {},
  list_documents: {
    location: z.enum(['new', 'later', 'archive', 'feed']).optional().describe("Filter by location"),
    category: z.string().optional().describe("Filter by category"),
    tag: z.string().optional().describe("Filter by tag name"),
    updated_after: z.string().optional().describe("ISO 8601 timestamp — only return documents updated after this time"),
    with_html_content: z.boolean().optional().describe("Include full parsed HTML content"),
    page_cursor: z.string().optional().describe("Pagination cursor"),
  },
  get_document: {
    document_id: z.string().describe("The Readwise Reader document ID"),
    with_html_content: z.boolean().optional().describe("Include full parsed HTML content"),
  },
  save_document: {
    url: z.string().describe("The URL of the content to save"),
    title: z.string().optional().describe("Title override"),
    author: z.string().optional().describe("Author override"),
    tags: z.array(z.string()).optional().describe("Tags to apply"),
    summary: z.string().optional().describe("Summary"),
    notes: z.string().optional().describe("Notes"),
    location: z.enum(['new', 'later', 'archive', 'feed']).optional().describe("Where to save"),
    category: z.string().optional().describe("Category"),
  },
  update_document: {
    document_id: z.string().describe("The document ID to update"),
    title: z.string().optional().describe("New title"),
    author: z.string().optional().describe("New author"),
    summary: z.string().optional().describe("New summary"),
    location: z.enum(['new', 'later', 'archive', 'feed']).optional().describe("New location"),
    tags: z.array(z.string()).optional().describe("New tags"),
  },
  delete_document: {
    document_id: z.string().describe("The document ID to delete"),
    confirmation: z.string().describe('Type "I confirm deletion" to confirm'),
  },
  get_highlights: {
    book_id: z.string().optional().describe("Filter by book ID"),
    page: z.number().optional().describe("Page number"),
    page_size: z.number().optional().describe("Results per page (1-100)"),
    search: z.string().optional().describe("Search term"),
  },
  get_highlight: { highlight_id: z.string().describe("The highlight ID") },
  create_highlight: {
    text: z.string().describe("The highlight text"),
    book_id: z.string().describe("The book ID"),
    note: z.string().optional().describe("Note"),
    location: z.number().optional().describe("Location"),
    color: z.string().optional().describe("Color"),
  },
  update_highlight: {
    highlight_id: z.string().describe("The highlight ID to update"),
    text: z.string().optional().describe("New text"),
    note: z.string().optional().describe("New note"),
    color: z.string().optional().describe("New color"),
  },
  delete_highlight: {
    highlight_id: z.string().describe("The highlight ID to delete"),
    confirmation: z.string().describe('Type "DELETE" to confirm'),
  },
  export_highlights: {
    updated_after: z.string().optional().describe("ISO 8601 timestamp for incremental sync"),
    ids: z.array(z.string()).optional().describe("Specific book IDs"),
    include_deleted: z.boolean().optional().describe("Include deleted highlights"),
    page_cursor: z.string().optional().describe("Pagination cursor"),
  },
  get_daily_review: {},
  get_books: {
    page: z.number().optional().describe("Page number"),
    page_size: z.number().optional().describe("Results per page"),
  },
  get_book: { book_id: z.string().describe("The book ID") },
  get_tags: {},
  list_highlight_tags: { highlight_id: z.string().describe("The highlight ID") },
  get_highlight_tag: { highlight_id: z.string().describe("The highlight ID"), tag_id: z.string().describe("The tag ID") },
  create_highlight_tag: { highlight_id: z.string().describe("The highlight ID"), name: z.string().describe("Tag name") },
  rename_highlight_tag: { highlight_id: z.string().describe("The highlight ID"), tag_id: z.string().describe("The tag ID"), name: z.string().describe("New name") },
  delete_highlight_tag: { highlight_id: z.string().describe("The highlight ID"), tag_id: z.string().describe("The tag ID") },
  list_book_tags: { book_id: z.string().describe("The book ID") },
  get_book_tag: { book_id: z.string().describe("The book ID"), tag_id: z.string().describe("The tag ID") },
  create_book_tag: { book_id: z.string().describe("The book ID"), name: z.string().describe("Tag name") },
  rename_book_tag: { book_id: z.string().describe("The book ID"), tag_id: z.string().describe("The tag ID"), name: z.string().describe("New name") },
  delete_book_tag: { book_id: z.string().describe("The book ID"), tag_id: z.string().describe("The tag ID") },
  get_recent_content: {
    limit: z.number().optional().describe("Number of items (default: 10)"),
    content_type: z.enum(['books', 'highlights', 'all']).optional().describe("Content type"),
  },
  bulk_save_documents: {
    items: z.array(z.object({ url: z.string().describe("URL to save") })).describe("Documents to save"),
    confirmation: z.string().describe('Type "I confirm saving these items" to confirm'),
  },
  bulk_update_documents: {
    updates: z.array(z.object({ document_id: z.string().describe("Document ID") })).describe("Updates"),
    confirmation: z.string().describe('Type "I confirm these updates" to confirm'),
  },
  bulk_delete_documents: {
    document_ids: z.array(z.string()).describe("Document IDs to delete"),
    confirmation: z.string().describe('Type "I confirm deletion of these documents" to confirm'),
  },
};

// Zod parameter schemas for prompts
const promptSchemas: Record<string, Record<string, z.ZodType>> = {
  readwise_highlight: {
    book_id: z.string().optional().describe("The ID of the book to get highlights from"),
    page: z.number().optional().describe("The page number of results to get"),
    page_size: z.number().optional().describe("The number of results per page (max 100)"),
    search: z.string().optional().describe("Search term to filter highlights"),
    context: z.string().optional().describe("Additional context to include in the prompt"),
    task: z.enum(['summarize', 'analyze', 'connect', 'question']).optional().describe("The task to perform with the highlights"),
  },
  readwise_search: {
    query: z.string().describe("Search query to find highlights"),
    limit: z.number().optional().describe("Maximum number of results to return"),
    context: z.string().optional().describe("Additional context to include in the prompt"),
  },
};

// Export stateless flag for MCP (Smithery requirement)
export const stateless = true;

/**
 * Create and configure the Readwise MCP server
 * This is the default export that Smithery will call
 */
export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  try {
    const apiKey = config.readwiseApiKey || '';
    
    if (config.debug) {
      console.log('Starting Readwise MCP Server in debug mode');
      console.log(`API key provided: ${apiKey ? 'Yes' : 'No (lazy loading enabled)'}`);
    }

    // Create API client (allow empty API key for lazy loading)
    // Use FetchClient for Cloudflare Workers compatibility
    const apiClient = new FetchClient({
      apiKey: apiKey || '',
    });
    
    const api = new ReadwiseAPI(apiClient);

    // Create MCP server
    const server = new McpServer({
      name: "readwise-mcp",
      title: "Readwise",
      version: "1.0.0",
    });

    // Register all tools
    const tools = [
      new ValidateTokenTool(api, consoleLogger),
      new ListDocumentsTool(api, consoleLogger),
      new GetDocumentTool(api, consoleLogger),
      new SaveDocumentTool(api, consoleLogger),
      new UpdateDocumentTool(api, consoleLogger),
      new DeleteDocumentTool(api, consoleLogger),
      new GetRecentContentTool(api, consoleLogger),
      new GetHighlightsTool(api, consoleLogger),
      new GetHighlightTool(api, consoleLogger),
      new CreateHighlightTool(api, consoleLogger),
      new UpdateHighlightTool(api, consoleLogger),
      new DeleteHighlightTool(api, consoleLogger),
      new ExportHighlightsTool(api, consoleLogger),
      new GetDailyReviewTool(api, consoleLogger),
      new GetBooksTool(api, consoleLogger),
      new GetBookTool(api, consoleLogger),
      new GetTagsTool(api, consoleLogger),
      new ListHighlightTagsTool(api, consoleLogger),
      new GetHighlightTagTool(api, consoleLogger),
      new CreateHighlightTagTool(api, consoleLogger),
      new RenameHighlightTagTool(api, consoleLogger),
      new DeleteHighlightTagTool(api, consoleLogger),
      new ListBookTagsTool(api, consoleLogger),
      new GetBookTagTool(api, consoleLogger),
      new CreateBookTagTool(api, consoleLogger),
      new RenameBookTagTool(api, consoleLogger),
      new DeleteBookTagTool(api, consoleLogger),
      new BulkSaveDocumentsTool(api, consoleLogger),
      new BulkUpdateDocumentsTool(api, consoleLogger),
      new BulkDeleteDocumentsTool(api, consoleLogger),
    ];

    // Tool annotations based on operation type
    const getToolAnnotations = (toolName: string) => {
      // Delete operations - destructive but idempotent
      const deleteTools = ['delete_highlight', 'delete_document', 'bulk_delete_documents', 'delete_highlight_tag', 'delete_book_tag'];
      if (deleteTools.includes(toolName)) {
        return { readOnlyHint: false, destructiveHint: true, idempotentHint: true };
      }

      // Create operations - not idempotent
      const createTools = [
        'create_highlight', 'save_document', 'bulk_save_documents',
        'create_highlight_tag', 'create_book_tag'
      ];
      if (createTools.includes(toolName)) {
        return { readOnlyHint: false, destructiveHint: false, idempotentHint: false };
      }

      // Update operations - idempotent
      const updateTools = [
        'update_highlight', 'update_document', 'bulk_update_documents',
        'rename_highlight_tag', 'rename_book_tag'
      ];
      if (updateTools.includes(toolName)) {
        return { readOnlyHint: false, destructiveHint: false, idempotentHint: true };
      }

      // Default: read-only operations
      return { readOnlyHint: true, destructiveHint: false, idempotentHint: true };
    };

    // Register each tool with the server using server.tool() method
    for (const tool of tools) {
      try {
        const annotations = getToolAnnotations(tool.name);
        server.tool(
        tool.name,
        tool.description,
        toolSchemas[tool.name] || {}, // Use Zod schemas for parameter descriptions
        annotations,
        async (args: any) => {
          try {
            const toolResult = await tool.execute(args || {});
            // Extract the actual result from MCPToolResult wrapper
            const actualResult = toolResult && typeof toolResult === 'object' && 'result' in toolResult
              ? (toolResult as any).result
              : toolResult;
            
            // Convert to MCP content format (like Exa does)
            // Tools must return { content: [{ type: "text", text: "..." }] } format
            const mcpResponse = toMCPResponse(actualResult);
            // Return just the content format expected by SDK
            return {
              content: mcpResponse.content.map(item => {
                // Ensure type is exactly what SDK expects
                if (item.type === 'text') {
                  return {
                    type: 'text' as const,
                    text: item.text || ''
                  };
                }
                // For other types, return as-is (cast to satisfy type checker)
                return item as any;
              })
            };
          } catch (error) {
            if (config.debug) {
              console.error(`Error executing tool ${tool.name}:`, error);
            }
            // Return error in MCP format
            return {
              content: [{
                type: 'text' as const,
                text: error instanceof Error ? error.message : String(error)
              }]
            };
          }
        }
      );
      } catch (toolError) {
        throw toolError;
      }
    }

    // Register MCP Resources
    // These provide data access to LLM clients
    server.resource(
      "books",
      "readwise://books",
      { description: "List of books in your Readwise library", mimeType: "application/json" },
      async () => {
        try {
          const books = await api.getBooks({ page_size: 50 });
          return {
            contents: [{
              uri: "readwise://books",
              mimeType: "application/json",
              text: JSON.stringify(books.results.map(b => ({
                id: b.id,
                title: b.title,
                author: b.author,
                category: b.category,
                highlights_count: b.highlights_count
              })), null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: "readwise://books",
              mimeType: "text/plain",
              text: `Error fetching books: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    server.resource(
      "recent-highlights",
      "readwise://highlights/recent",
      { description: "Recent highlights from your Readwise library", mimeType: "application/json" },
      async () => {
        try {
          const highlights = await api.getHighlights({ page_size: 20 });
          return {
            contents: [{
              uri: "readwise://highlights/recent",
              mimeType: "application/json",
              text: JSON.stringify(highlights.results.map(h => ({
                id: h.id,
                text: h.text,
                note: h.note,
                book_id: h.book_id,
                created_at: h.created_at
              })), null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: "readwise://highlights/recent",
              mimeType: "text/plain",
              text: `Error fetching highlights: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    server.resource(
      "tags",
      "readwise://tags",
      { description: "List of all tags in your Readwise library", mimeType: "application/json" },
      async () => {
        try {
          const tags = await api.getTags();
          return {
            contents: [{
              uri: "readwise://tags",
              mimeType: "application/json",
              text: JSON.stringify(tags, null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: "readwise://tags",
              mimeType: "text/plain",
              text: `Error fetching tags: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // Register prompts using server.prompt() method
    const highlightPrompt = new ReadwiseHighlightPrompt(api, consoleLogger);
    const searchPrompt = new ReadwiseSearchPrompt(api, consoleLogger);
    
    // Register highlight prompt with Zod schemas for parameter descriptions
    server.prompt(
      highlightPrompt.name,
      highlightPrompt.description,
      promptSchemas[highlightPrompt.name] || {},
      async (args: any) => {
        const result = await highlightPrompt.execute(args || {});
        // Convert MCPResponse to prompt format with messages array
        // Extract text from content array (usually first item)
        const firstContent = result.content && result.content.length > 0 
          ? result.content[0] 
          : null;
        
        // Ensure we have a text content item
        const textContent = firstContent && firstContent.type === 'text' && firstContent.text
          ? { type: 'text' as const, text: firstContent.text || '' }
          : { type: 'text' as const, text: '' };
        
        return {
          messages: [
            {
              role: 'user' as const,
              content: textContent
            }
          ]
        };
      }
    );

    // Register search prompt with Zod schemas for parameter descriptions
    server.prompt(
      searchPrompt.name,
      searchPrompt.description,
      promptSchemas[searchPrompt.name] || {},
      async (args: any) => {
        const result = await searchPrompt.execute(args || {});
        // Convert MCPResponse to prompt format with messages array
        // Extract text from content array (usually first item)
        const firstContent = result.content && result.content.length > 0 
          ? result.content[0] 
          : null;
        
        // Ensure we have a text content item
        const textContent = firstContent && firstContent.type === 'text' && firstContent.text
          ? { type: 'text' as const, text: firstContent.text || '' }
          : { type: 'text' as const, text: '' };
        
        return {
          messages: [
            {
              role: 'user' as const,
              content: textContent
            }
          ]
        };
      }
    );

    if (config.debug) {
      console.log(`Registered ${tools.length} tools and 2 prompts`);
    }

    // Return the server object (Smithery handles transport)
    return server.server;
    
  } catch (error) {
    console.error(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
