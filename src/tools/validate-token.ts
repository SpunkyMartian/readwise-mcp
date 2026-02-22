import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';

export class ValidateTokenTool extends BaseMCPTool<void, any> {
  readonly name = 'validate_token';
  readonly description = 'Check if the configured Readwise API token is valid. Returns user info on success.';
  readonly parameters = { type: 'object', properties: {} };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  async execute(): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing validate_token tool');
      const result = await this.api.validateToken();
      return { result };
    } catch (error) {
      this.logger.error('Error executing validate_token tool', error as any);
      throw error;
    }
  }
}
