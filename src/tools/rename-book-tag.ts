import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface RenameBookTagParams { book_id: string; tag_id: string; name: string; }

export class RenameBookTagTool extends BaseMCPTool<RenameBookTagParams, any> {
  readonly name = 'rename_book_tag';
  readonly description = 'Rename a tag on a book.';
  readonly parameters = {
    type: 'object',
    properties: {
      book_id: { type: 'string', description: 'The Readwise book ID' },
      tag_id: { type: 'string', description: 'The tag ID to rename' },
      name: { type: 'string', description: 'The new tag name' }
    },
    required: ['book_id', 'tag_id', 'name']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: RenameBookTagParams): ValidationResult {
    const v1 = validateRequired(params, 'book_id', 'Book ID is required');
    if (!v1.valid) return v1;
    const v2 = validateRequired(params, 'tag_id', 'Tag ID is required');
    if (!v2.valid) return v2;
    return validateRequired(params, 'name', 'New tag name is required');
  }

  async execute(params: RenameBookTagParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing rename_book_tag tool', params as any);
      const result = await this.api.renameBookTag(params.book_id, params.tag_id, params.name);
      return { result };
    } catch (error) {
      this.logger.error('Error executing rename_book_tag tool', error as any);
      throw error;
    }
  }
}
