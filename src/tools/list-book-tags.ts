import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface ListBookTagsParams { book_id: string; }

export class ListBookTagsTool extends BaseMCPTool<ListBookTagsParams, any> {
  readonly name = 'list_book_tags';
  readonly description = 'List all tags on a specific book.';
  readonly parameters = {
    type: 'object',
    properties: {
      book_id: { type: 'string', description: 'The Readwise book ID' }
    },
    required: ['book_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: ListBookTagsParams): ValidationResult {
    return validateRequired(params, 'book_id', 'Book ID is required');
  }

  async execute(params: ListBookTagsParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing list_book_tags tool', params as any);
      const result = await this.api.listBookTags(params.book_id);
      return { result };
    } catch (error) {
      this.logger.error('Error executing list_book_tags tool', error as any);
      throw error;
    }
  }
}
