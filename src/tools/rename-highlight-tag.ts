import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface RenameHighlightTagParams { highlight_id: string; tag_id: string; name: string; }

export class RenameHighlightTagTool extends BaseMCPTool<RenameHighlightTagParams, any> {
  readonly name = 'rename_highlight_tag';
  readonly description = 'Rename a tag on a highlight.';
  readonly parameters = {
    type: 'object',
    properties: {
      highlight_id: { type: 'string', description: 'The Readwise highlight ID' },
      tag_id: { type: 'string', description: 'The tag ID to rename' },
      name: { type: 'string', description: 'The new tag name' }
    },
    required: ['highlight_id', 'tag_id', 'name']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: RenameHighlightTagParams): ValidationResult {
    const v1 = validateRequired(params, 'highlight_id', 'Highlight ID is required');
    if (!v1.valid) return v1;
    const v2 = validateRequired(params, 'tag_id', 'Tag ID is required');
    if (!v2.valid) return v2;
    return validateRequired(params, 'name', 'New tag name is required');
  }

  async execute(params: RenameHighlightTagParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing rename_highlight_tag tool', params as any);
      const result = await this.api.renameHighlightTag(params.highlight_id, params.tag_id, params.name);
      return { result };
    } catch (error) {
      this.logger.error('Error executing rename_highlight_tag tool', error as any);
      throw error;
    }
  }
}
