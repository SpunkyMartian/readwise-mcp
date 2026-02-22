import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { ListDocumentsParams, MCPToolResult } from '../types/index.js';

export class ListDocumentsTool extends BaseMCPTool<ListDocumentsParams, any> {
  readonly name = 'list_documents';
  readonly description = 'List documents in Readwise Reader with optional filters for location, category, tag, and date.';
  readonly parameters = {
    type: 'object',
    properties: {
      location: { type: 'string', enum: ['new', 'later', 'archive', 'feed'], description: 'Filter by location' },
      category: { type: 'string', description: 'Filter by category (article, email, rss, highlight, note, pdf, epub, tweet, video)' },
      tag: { type: 'string', description: 'Filter by tag name' },
      updated_after: { type: 'string', description: 'ISO 8601 timestamp — only return documents updated after this time' },
      with_html_content: { type: 'boolean', description: 'Include full parsed HTML content' },
      page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' }
    }
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  async execute(params: ListDocumentsParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing list_documents tool', params as any);
      const result = await this.api.listDocuments(params);
      return { result };
    } catch (error) {
      this.logger.error('Error executing list_documents tool', error as any);
      throw error;
    }
  }
}
