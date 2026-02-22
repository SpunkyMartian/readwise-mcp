import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface GetHighlightTagParams { highlight_id: string; tag_id: string; }

export class GetHighlightTagTool extends BaseMCPTool<GetHighlightTagParams, any> {
  readonly name = 'get_highlight_tag';
  readonly description = 'Get details of a specific tag on a highlight.';
  readonly parameters = {
    type: 'object',
    properties: {
      highlight_id: { type: 'string', description: 'The Readwise highlight ID' },
      tag_id: { type: 'string', description: 'The tag ID to retrieve' }
    },
    required: ['highlight_id', 'tag_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: GetHighlightTagParams): ValidationResult {
    const v1 = validateRequired(params, 'highlight_id', 'Highlight ID is required');
    if (!v1.valid) return v1;
    return validateRequired(params, 'tag_id', 'Tag ID is required');
  }

  async execute(params: GetHighlightTagParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing get_highlight_tag tool', params as any);
      const result = await this.api.getHighlightTag(params.highlight_id, params.tag_id);
      return { result };
    } catch (error) {
      this.logger.error('Error executing get_highlight_tag tool', error as any);
      throw error;
    }
  }
}
