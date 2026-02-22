import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { ExportHighlightsParams, MCPToolResult } from '../types/index.js';

export class ExportHighlightsTool extends BaseMCPTool<ExportHighlightsParams, any> {
  readonly name = 'export_highlights';
  readonly description = 'Bulk export highlights with incremental sync support.';
  readonly parameters = {
    type: 'object',
    properties: {
      updated_after: { type: 'string', description: 'ISO 8601 timestamp for incremental sync' },
      ids: { type: 'array', items: { type: 'string' }, description: 'List of specific book IDs to export' },
      include_deleted: { type: 'boolean', description: 'Include deleted highlights (useful for sync)' },
      page_cursor: { type: 'string', description: 'Pagination cursor from a previous response' }
    }
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  async execute(params: ExportHighlightsParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing export_highlights tool', params as any);
      const result = await this.api.exportHighlights(params);
      return { result };
    } catch (error) {
      this.logger.error('Error executing export_highlights tool', error as any);
      throw error;
    }
  }
}
