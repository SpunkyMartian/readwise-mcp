import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { Highlight, MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface GetHighlightParams { highlight_id: string; }

export class GetHighlightTool extends BaseMCPTool<GetHighlightParams, Highlight> {
  readonly name = 'get_highlight';
  readonly description = 'Get a single highlight by its ID.';
  readonly parameters = {
    type: 'object',
    properties: {
      highlight_id: { type: 'string', description: 'The Readwise highlight ID' }
    },
    required: ['highlight_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: GetHighlightParams): ValidationResult {
    return validateRequired(params, 'highlight_id', 'Highlight ID is required');
  }

  async execute(params: GetHighlightParams): Promise<MCPToolResult<Highlight>> {
    try {
      this.logger.debug('Executing get_highlight tool', params as any);
      const result = await this.api.getHighlight(params.highlight_id);
      return { result };
    } catch (error) {
      this.logger.error('Error executing get_highlight tool', error as any);
      throw error;
    }
  }
}
