import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface DeleteHighlightTagParams { highlight_id: string; tag_id: string; }

export class DeleteHighlightTagTool extends BaseMCPTool<DeleteHighlightTagParams, any> {
  readonly name = 'delete_highlight_tag';
  readonly description = 'Remove a tag from a highlight.';
  readonly parameters = {
    type: 'object',
    properties: {
      highlight_id: { type: 'string', description: 'The Readwise highlight ID' },
      tag_id: { type: 'string', description: 'The tag ID to remove' }
    },
    required: ['highlight_id', 'tag_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: DeleteHighlightTagParams): ValidationResult {
    const v1 = validateRequired(params, 'highlight_id', 'Highlight ID is required');
    if (!v1.valid) return v1;
    return validateRequired(params, 'tag_id', 'Tag ID is required');
  }

  async execute(params: DeleteHighlightTagParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing delete_highlight_tag tool', params as any);
      const result = await this.api.deleteHighlightTag(params.highlight_id, params.tag_id);
      return { result };
    } catch (error) {
      this.logger.error('Error executing delete_highlight_tag tool', error as any);
      throw error;
    }
  }
}
