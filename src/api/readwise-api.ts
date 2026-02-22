import {
  HttpClient,
  GetHighlightsParams,
  GetBooksParams,
  PaginatedResponse,
  Highlight,
  Book,
  TagResponse,
  ListDocumentsParams,
  ExportHighlightsParams,
  CreateHighlightParams,
  UpdateHighlightParams,
  DeleteHighlightParams,
  SaveDocumentParams,
  SaveDocumentResponse,
  UpdateDocumentParams,
  DeleteDocumentParams,
  DeleteDocumentResponse,
  BulkSaveDocumentsParams,
  BulkUpdateDocumentsParams,
  BulkDeleteDocumentsParams,
  BulkOperationResult,
  GetRecentContentParams,
  RecentContentResponse,
  ValidationException
} from '../types/index.js';
import { CONFIRMATIONS } from '../constants.js';

/**
 * API interface for interacting with Readwise
 */
export class ReadwiseAPI {
  /**
   * Create a new ReadwiseAPI
   * @param client - An HTTP client implementing the HttpClient interface
   *                 (either ReadwiseClient for Node.js or FetchClient for Cloudflare Workers)
   */
  constructor(private client: HttpClient) {}
  
  /**
   * Get highlights from Readwise
   * @param params - The parameters for the request
   * @returns A promise resolving to a paginated response of highlights
   */
  async getHighlights(params: GetHighlightsParams = {}): Promise<PaginatedResponse<Highlight>> {
    const queryParams = new URLSearchParams();
    
    // Add parameters to query string
    if (params.book_id) {
      queryParams.append('book_id', params.book_id);
    }
    
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    if (params.search) {
      queryParams.append('search', params.search);
    }
    
    const queryString = queryParams.toString();
    const url = `/highlights${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<PaginatedResponse<Highlight>>(url);
  }
  
  /**
   * Get books from Readwise
   * @param params - The parameters for the request
   * @returns A promise resolving to a paginated response of books
   */
  async getBooks(params: GetBooksParams = {}): Promise<PaginatedResponse<Book>> {
    const queryParams = new URLSearchParams();
    
    // Add parameters to query string
    if (params.category) {
      queryParams.append('category', params.category);
    }
    
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    const queryString = queryParams.toString();
    const url = `/books${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<PaginatedResponse<Book>>(url);
  }
  
  /**
   * List documents from Readwise Reader (v3 API)
   * @param params - Optional filter parameters
   * @returns A promise resolving to the document list response
   */
  async listDocuments(params: ListDocumentsParams = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.location) queryParams.append('location', params.location);
    if (params.category) queryParams.append('category', params.category);
    if (params.tag) queryParams.append('tag', params.tag);
    if (params.updated_after) queryParams.append('updatedAfter', params.updated_after);
    if (params.with_html_content) queryParams.append('withHtmlContent', 'true');
    if (params.page_cursor) queryParams.append('pageCursor', params.page_cursor);
    const queryString = queryParams.toString();
    return this.client.get<any>(`/v3/list/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get a single document by ID from Readwise Reader (v3 API)
   */
  async getDocument(documentId: string, withHtmlContent?: boolean): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('id', documentId);
    if (withHtmlContent) queryParams.append('withHtmlContent', 'true');
    const response = await this.client.get<any>(`/v3/list/?${queryParams.toString()}`);
    const results = response.results ?? [];
    if (results.length === 0) {
      throw new Error(`Document not found: ${documentId}`);
    }
    return results[0];
  }

  /**
   * Validate the API token
   */
  async validateToken(): Promise<any> {
    return this.client.get<any>('/auth/');
  }

  /**
   * Get a single highlight by ID
   */
  async getHighlight(highlightId: string): Promise<Highlight> {
    return this.client.get<Highlight>(`/highlights/${highlightId}/`);
  }

  /**
   * Get a single book by ID
   */
  async getBook(bookId: string): Promise<Book> {
    return this.client.get<Book>(`/books/${bookId}/`);
  }

  /**
   * Export highlights with incremental sync support
   */
  async exportHighlights(params: ExportHighlightsParams = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.updated_after) queryParams.append('updatedAfter', params.updated_after);
    if (params.ids?.length) queryParams.append('ids', params.ids.join(','));
    if (params.include_deleted) queryParams.append('includeDeleted', 'true');
    if (params.page_cursor) queryParams.append('pageCursor', params.page_cursor);
    const queryString = queryParams.toString();
    return this.client.get<any>(`/export/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get today's daily review highlights
   */
  async getDailyReview(): Promise<any> {
    return this.client.get<any>('/review/');
  }

  // ── Highlight tag CRUD ──

  async listHighlightTags(highlightId: string): Promise<any> {
    return this.client.get<any>(`/highlights/${highlightId}/tags`);
  }

  async getHighlightTag(highlightId: string, tagId: string): Promise<any> {
    return this.client.get<any>(`/highlights/${highlightId}/tags/${tagId}`);
  }

  async createHighlightTag(highlightId: string, name: string): Promise<any> {
    return this.client.post<any>(`/highlights/${highlightId}/tags/`, { name });
  }

  async renameHighlightTag(highlightId: string, tagId: string, name: string): Promise<any> {
    return this.client.patch<any>(`/highlights/${highlightId}/tags/${tagId}`, { name });
  }

  async deleteHighlightTag(highlightId: string, tagId: string): Promise<any> {
    return this.client.delete<any>(`/highlights/${highlightId}/tags/${tagId}`);
  }

  // ── Book tag CRUD ──

  async listBookTags(bookId: string): Promise<any> {
    return this.client.get<any>(`/books/${bookId}/tags`);
  }

  async getBookTag(bookId: string, tagId: string): Promise<any> {
    return this.client.get<any>(`/books/${bookId}/tags/${tagId}`);
  }

  async createBookTag(bookId: string, name: string): Promise<any> {
    return this.client.post<any>(`/books/${bookId}/tags/`, { name });
  }

  async renameBookTag(bookId: string, tagId: string, name: string): Promise<any> {
    return this.client.patch<any>(`/books/${bookId}/tags/${tagId}`, { name });
  }

  async deleteBookTag(bookId: string, tagId: string): Promise<any> {
    return this.client.delete<any>(`/books/${bookId}/tags/${tagId}`);
  }

  /**
   * Get all tags from Readwise
   * @returns A promise resolving to a list of all tags
   */
  async getTags(): Promise<TagResponse> {
    return this.client.get<TagResponse>('/tags');
  }


  /**
   * Create a new highlight
   * @param params - The parameters for creating the highlight
   * @returns A promise resolving to the created highlight
   */
  async createHighlight(params: CreateHighlightParams): Promise<Highlight> {
    return this.client.post<Highlight>('/highlights', params);
  }

  /**
   * Update an existing highlight
   * @param params - The parameters for updating the highlight
   * @returns A promise resolving to the updated highlight
   */
  async updateHighlight(params: UpdateHighlightParams): Promise<Highlight> {
    return this.client.put<Highlight>(`/highlights/${params.highlight_id}`, params);
  }

  /**
   * Delete a highlight
   * @param params - The parameters for deleting the highlight
   * @returns A promise resolving to the deletion result
   */
  async deleteHighlight(params: DeleteHighlightParams): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/highlights/${params.highlight_id}`);
  }


  /**
   * Save a new document to Readwise
   * @param params - The parameters for saving the document
   * @returns A promise resolving to the saved document
   */
  async saveDocument(params: SaveDocumentParams): Promise<SaveDocumentResponse> {
    if (!params.url) {
      throw ValidationException.forField('url', 'URL is required');
    }

    const payload: any = {
      url: params.url,
      saved_using: 'readwise-mcp'
    };

    // Add optional parameters if they exist
    if (params.title) payload.title = params.title;
    if (params.author) payload.author = params.author;
    if (params.html) payload.html = params.html;
    if (params.tags) payload.tags = params.tags;
    if (params.summary) payload.summary = params.summary;
    if (params.notes) payload.notes = params.notes;
    if (params.location) payload.location = params.location;
    if (params.category) payload.category = params.category;
    if (params.published_date) payload.published_date = params.published_date;
    if (params.image_url) payload.image_url = params.image_url;

    // Note: Using v3 API endpoint for saving documents
    return this.client.post<SaveDocumentResponse>('/v3/save/', payload);
  }

  /**
   * Update an existing document's metadata
   * @param params - The parameters for updating the document
   * @returns A promise resolving to the updated document
   */
  async updateDocument(params: UpdateDocumentParams): Promise<Document> {
    if (!params.document_id) {
      throw ValidationException.forField('document_id', 'Document ID is required');
    }

    // Prepare the request payload with only the fields that are provided
    const payload: any = {};
    if (params.title !== undefined) payload.title = params.title;
    if (params.author !== undefined) payload.author = params.author;
    if (params.summary !== undefined) payload.summary = params.summary;
    if (params.published_date !== undefined) payload.published_date = params.published_date;
    if (params.image_url !== undefined) payload.image_url = params.image_url;
    if (params.location !== undefined) payload.location = params.location;
    if (params.category !== undefined) payload.category = params.category;
    if (params.tags !== undefined) payload.tags = params.tags;

    // If no fields to update were provided
    if (Object.keys(payload).length === 0) {
      throw ValidationException.forField('payload', 'No update fields provided');
    }

    // Note: Using v3 API endpoint for updating documents
    return this.client.patch<Document>(`/v3/update/${params.document_id}/`, payload);
  }

  /**
   * Delete a document from Readwise
   * @param params - The parameters for deleting the document
   * @returns A promise resolving to the deletion result
   */
  async deleteDocument(params: DeleteDocumentParams): Promise<DeleteDocumentResponse> {
    if (!params.document_id) {
      throw ValidationException.forField('document_id', 'Document ID is required');
    }

    // Check for confirmation
    if (!params.confirmation || params.confirmation !== CONFIRMATIONS.DELETE_DOCUMENT) {
      throw ValidationException.forField('confirmation', `Confirmation required. Must be "${CONFIRMATIONS.DELETE_DOCUMENT}" to confirm deletion.`);
    }

    // Note: Using v3 API endpoint for deleting documents
    await this.client.delete(`/v3/delete/${params.document_id}/`);

    return {
      success: true,
      document_id: params.document_id
    };
  }

  /**
   * Save multiple documents in bulk
   * @param params - The bulk save parameters
   * @returns A promise resolving to the bulk operation results
   */
  async bulkSaveDocuments(params: BulkSaveDocumentsParams): Promise<BulkOperationResult> {
    if (!Array.isArray(params.items) || params.items.length === 0) {
      throw ValidationException.forField('items', 'Items array is required and must not be empty');
    }

    // Check for confirmation
    if (!params.confirmation || params.confirmation !== CONFIRMATIONS.BULK_SAVE_DOCUMENTS) {
      throw ValidationException.forField('confirmation', `Confirmation required. Must be "${CONFIRMATIONS.BULK_SAVE_DOCUMENTS}" to proceed.`);
    }

    // Process each item
    const results = await Promise.all(
      params.items.map(async (item) => {
        try {
          const response = await this.saveDocument(item);
          return {
            success: true,
            document_id: response.id,
            url: item.url
          };
        } catch (error: any) {
          return {
            success: false,
            url: item.url,
            error: error.message || 'Failed to save item'
          };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Update multiple documents in bulk
   * @param params - The bulk update parameters
   * @returns A promise resolving to the bulk operation results
   */
  async bulkUpdateDocuments(params: BulkUpdateDocumentsParams): Promise<BulkOperationResult> {
    if (!Array.isArray(params.updates) || params.updates.length === 0) {
      throw ValidationException.forField('updates', 'Updates array is required and must not be empty');
    }

    // Check for confirmation
    if (!params.confirmation || params.confirmation !== CONFIRMATIONS.BULK_UPDATE_DOCUMENTS) {
      throw ValidationException.forField('confirmation', `Confirmation required. Must be "${CONFIRMATIONS.BULK_UPDATE_DOCUMENTS}" to proceed.`);
    }

    // Process each update
    const results = await Promise.all(
      params.updates.map(async (update) => {
        try {
          const response = await this.updateDocument(update);
          return {
            success: true,
            document_id: update.document_id
          };
        } catch (error: any) {
          return {
            success: false,
            document_id: update.document_id,
            error: error.message || 'Failed to update document'
          };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Delete multiple documents in bulk
   * @param params - The bulk delete parameters
   * @returns A promise resolving to the bulk operation results
   */
  async bulkDeleteDocuments(params: BulkDeleteDocumentsParams): Promise<BulkOperationResult> {
    if (!Array.isArray(params.document_ids) || params.document_ids.length === 0) {
      throw ValidationException.forField('document_ids', 'Document IDs array is required and must not be empty');
    }

    // Check for confirmation
    if (!params.confirmation || params.confirmation !== CONFIRMATIONS.BULK_DELETE_DOCUMENTS) {
      throw ValidationException.forField('confirmation', `Confirmation required. Must be "${CONFIRMATIONS.BULK_DELETE_DOCUMENTS}" to proceed.`);
    }

    // Process each deletion
    const results = await Promise.all(
      params.document_ids.map(async (document_id) => {
        try {
          await this.deleteDocument({ document_id, confirmation: CONFIRMATIONS.DELETE_DOCUMENT });
          return {
            success: true,
            document_id
          };
        } catch (error: any) {
          return {
            success: false,
            document_id,
            error: error.message || 'Failed to delete document'
          };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get recent content from Readwise
   * @param params - The parameters for the request
   * @returns A promise resolving to recent content
   */
  async getRecentContent(params: GetRecentContentParams = {}): Promise<RecentContentResponse> {
    const limit = params.limit || 10;
    const contentType = params.content_type || 'all';

    const results: any[] = [];

    // Fetch books if requested
    if (contentType === 'books' || contentType === 'all') {
      const booksResponse = await this.getBooks({ page_size: limit });
      results.push(...booksResponse.results.map(book => ({
        ...book,
        type: 'book' as const,
        created_at: book.updated || new Date().toISOString()
      })));
    }

    // Fetch highlights if requested
    if (contentType === 'highlights' || contentType === 'all') {
      const highlightsResponse = await this.getHighlights({ page_size: limit });
      results.push(...highlightsResponse.results.map(highlight => ({
        ...highlight,
        type: 'highlight' as const,
        created_at: highlight.created_at
      })));
    }

    // Sort by created_at, newest first
    results.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Limit to requested number
    const limitedResults = results.slice(0, limit);

    return {
      count: limitedResults.length,
      results: limitedResults
    };
  }
}
