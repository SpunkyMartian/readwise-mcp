import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';

export class GetDailyReviewTool extends BaseMCPTool<void, any> {
  readonly name = 'get_daily_review';
  readonly description = "Get today's daily review highlights (spaced repetition).";
  readonly parameters = { type: 'object', properties: {} };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  async execute(): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing get_daily_review tool');
      const result = await this.api.getDailyReview();
      return { result };
    } catch (error) {
      this.logger.error('Error executing get_daily_review tool', error as any);
      throw error;
    }
  }
}
