import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface GetBookTagParams { book_id: string; tag_id: string; }

export class GetBookTagTool extends BaseMCPTool<GetBookTagParams, any> {
  readonly name = 'get_book_tag';
  readonly description = 'Get details of a specific tag on a book.';
  readonly parameters = {
    type: 'object',
    properties: {
      book_id: { type: 'string', description: 'The Readwise book ID' },
      tag_id: { type: 'string', description: 'The tag ID to retrieve' }
    },
    required: ['book_id', 'tag_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: GetBookTagParams): ValidationResult {
    const v1 = validateRequired(params, 'book_id', 'Book ID is required');
    if (!v1.valid) return v1;
    return validateRequired(params, 'tag_id', 'Tag ID is required');
  }

  async execute(params: GetBookTagParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing get_book_tag tool', params as any);
      const result = await this.api.getBookTag(params.book_id, params.tag_id);
      return { result };
    } catch (error) {
      this.logger.error('Error executing get_book_tag tool', error as any);
      throw error;
    }
  }
}
