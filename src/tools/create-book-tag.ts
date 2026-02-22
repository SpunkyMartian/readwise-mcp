import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface CreateBookTagParams { book_id: string; name: string; }

export class CreateBookTagTool extends BaseMCPTool<CreateBookTagParams, any> {
  readonly name = 'create_book_tag';
  readonly description = 'Add a tag to a book.';
  readonly parameters = {
    type: 'object',
    properties: {
      book_id: { type: 'string', description: 'The Readwise book ID' },
      name: { type: 'string', description: 'The tag name to add' }
    },
    required: ['book_id', 'name']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: CreateBookTagParams): ValidationResult {
    const v1 = validateRequired(params, 'book_id', 'Book ID is required');
    if (!v1.valid) return v1;
    return validateRequired(params, 'name', 'Tag name is required');
  }

  async execute(params: CreateBookTagParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing create_book_tag tool', params as any);
      const result = await this.api.createBookTag(params.book_id, params.name);
      return { result };
    } catch (error) {
      this.logger.error('Error executing create_book_tag tool', error as any);
      throw error;
    }
  }
}
