import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { Book, MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface GetBookParams { book_id: string; }

export class GetBookTool extends BaseMCPTool<GetBookParams, Book> {
  readonly name = 'get_book';
  readonly description = 'Get a single book/source by its ID.';
  readonly parameters = {
    type: 'object',
    properties: {
      book_id: { type: 'string', description: 'The Readwise book ID' }
    },
    required: ['book_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: GetBookParams): ValidationResult {
    return validateRequired(params, 'book_id', 'Book ID is required');
  }

  async execute(params: GetBookParams): Promise<MCPToolResult<Book>> {
    try {
      this.logger.debug('Executing get_book tool', params as any);
      const result = await this.api.getBook(params.book_id);
      return { result };
    } catch (error) {
      this.logger.error('Error executing get_book tool', error as any);
      throw error;
    }
  }
}
