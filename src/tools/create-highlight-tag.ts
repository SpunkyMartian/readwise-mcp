import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface CreateHighlightTagParams { highlight_id: string; name: string; }

export class CreateHighlightTagTool extends BaseMCPTool<CreateHighlightTagParams, any> {
  readonly name = 'create_highlight_tag';
  readonly description = 'Add a tag to a highlight.';
  readonly parameters = {
    type: 'object',
    properties: {
      highlight_id: { type: 'string', description: 'The Readwise highlight ID' },
      name: { type: 'string', description: 'The tag name to add' }
    },
    required: ['highlight_id', 'name']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: CreateHighlightTagParams): ValidationResult {
    const v1 = validateRequired(params, 'highlight_id', 'Highlight ID is required');
    if (!v1.valid) return v1;
    return validateRequired(params, 'name', 'Tag name is required');
  }

  async execute(params: CreateHighlightTagParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing create_highlight_tag tool', params as any);
      const result = await this.api.createHighlightTag(params.highlight_id, params.name);
      return { result };
    } catch (error) {
      this.logger.error('Error executing create_highlight_tag tool', error as any);
      throw error;
    }
  }
}
