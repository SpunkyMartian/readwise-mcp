import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface ListHighlightTagsParams { highlight_id: string; }

export class ListHighlightTagsTool extends BaseMCPTool<ListHighlightTagsParams, any> {
  readonly name = 'list_highlight_tags';
  readonly description = 'List all tags on a specific highlight.';
  readonly parameters = {
    type: 'object',
    properties: {
      highlight_id: { type: 'string', description: 'The Readwise highlight ID' }
    },
    required: ['highlight_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: ListHighlightTagsParams): ValidationResult {
    return validateRequired(params, 'highlight_id', 'Highlight ID is required');
  }

  async execute(params: ListHighlightTagsParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing list_highlight_tags tool', params as any);
      const result = await this.api.listHighlightTags(params.highlight_id);
      return { result };
    } catch (error) {
      this.logger.error('Error executing list_highlight_tags tool', error as any);
      throw error;
    }
  }
}
