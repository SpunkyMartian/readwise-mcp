import { BaseMCPTool } from '../mcp/registry/base-tool.js';
import { ReadwiseAPI } from '../api/readwise-api.js';
import type { Logger } from '../utils/logger-interface.js';
import { MCPToolResult } from '../types/index.js';
import { ValidationResult, validateRequired } from '../types/validation.js';

interface GetDocumentParams { document_id: string; with_html_content?: boolean; }

export class GetDocumentTool extends BaseMCPTool<GetDocumentParams, any> {
  readonly name = 'get_document';
  readonly description = 'Get a single document by its ID from Readwise Reader.';
  readonly parameters = {
    type: 'object',
    properties: {
      document_id: { type: 'string', description: 'The Readwise Reader document ID' },
      with_html_content: { type: 'boolean', description: 'Include full parsed HTML content' }
    },
    required: ['document_id']
  };

  constructor(private api: ReadwiseAPI, logger: Logger) { super(logger); }

  validate(params: GetDocumentParams): ValidationResult {
    return validateRequired(params, 'document_id', 'Document ID is required');
  }

  async execute(params: GetDocumentParams): Promise<MCPToolResult<any>> {
    try {
      this.logger.debug('Executing get_document tool', params as any);
      const result = await this.api.getDocument(params.document_id, params.with_html_content);
      return { result };
    } catch (error) {
      this.logger.error('Error executing get_document tool', error as any);
      throw error;
    }
  }
}
