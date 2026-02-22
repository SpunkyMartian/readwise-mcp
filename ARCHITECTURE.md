# Readwise MCP Server Architecture

This document provides a comprehensive overview of the Readwise MCP Server architecture, including system design, component relationships, data flow, and implementation details.

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Technology Stack](#technology-stack)
4. [Directory Structure](#directory-structure)
5. [Core Components](#core-components)
6. [Data Flow](#data-flow)
7. [API Layer](#api-layer)
8. [MCP Protocol Implementation](#mcp-protocol-implementation)
9. [Tool System](#tool-system)
10. [Prompt System](#prompt-system)
11. [Type System](#type-system)
12. [Configuration Management](#configuration-management)
13. [Error Handling](#error-handling)
14. [Security Architecture](#security-architecture)
15. [Performance & Resilience](#performance--resilience)
16. [Testing Architecture](#testing-architecture)
17. [Deployment Options](#deployment-options)
18. [Extension Guide](#extension-guide)

---

## Overview

The Readwise MCP Server is a Model Context Protocol (MCP) server that provides AI assistants (like Claude) with access to Readwise reading libraries. It enables:

- **Reading** highlights, books, and documents from Readwise
- **Managing** content through create, update, and delete operations
- **Tagging** highlights and books with full CRUD tag management
- **Syncing** via incremental export and daily review

### Key Metrics

| Metric | Value |
|--------|-------|
| Source Files | ~50 TypeScript files |
| Lines of Code | ~6,500 |
| MCP Tools | 30 |
| MCP Prompts | 2 |
| Test Files | ~12 |
| Test Coverage | Unit tests for core functionality |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI Assistant (Claude)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Transport Layer                                   │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │      stdio Transport        │    │        SSE Transport                │ │
│  │   (Claude Desktop/CLI)      │    │     (Web integrations)              │ │
│  └─────────────────────────────┘    └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ReadwiseMCPServer                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Express    │  │  MCP Server  │  │Tool Registry │  │ Prompt Registry  │ │
│  │   (HTTP)     │  │   (SDK)      │  │  (30 tools)  │  │   (2 prompts)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                       │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │       ReadwiseAPI           │    │        ReadwiseClient               │ │
│  │   (High-level methods)      │◄───│      (HTTP + Rate Limiting)         │ │
│  └─────────────────────────────┘    └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Readwise API (External)                              │
│                    https://readwise.io/api/v2|v3                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Runtime & Language

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | ≥18.0.0 |
| Language | TypeScript | 5.2.2 |
| Module System | ES Modules | ESM |

### Core Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol implementation | ^1.7.0 |
| `express` | HTTP server framework | ^4.18.2 |
| `axios` | HTTP client for API calls | ^1.6.0 |
| `yargs` | CLI argument parsing | ^17.7.2 |
| `cors` | Cross-origin resource sharing | ^2.8.5 |
| `body-parser` | Request body parsing | ^1.20.2 |
| `serverless-http` | AWS Lambda adapter | ^3.2.0 |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `jest` | Testing framework |
| `ts-jest` | TypeScript Jest support |
| `eslint` | Code linting |
| `supertest` | HTTP testing |

---

## Directory Structure

```
readwise-mcp/
├── src/                           # Source code
│   ├── index.ts                   # CLI entry point
│   ├── server.ts                  # Main server class
│   ├── constants.ts               # Application constants
│   │
│   ├── api/                       # Readwise API integration
│   │   ├── client.ts              # HTTP client with rate limiting
│   │   └── readwise-api.ts        # High-level API wrapper
│   │
│   ├── mcp/                       # MCP protocol implementation
│   │   └── registry/              # Tool and prompt registries
│   │       ├── tool-registry.ts   # Tool management
│   │       ├── prompt-registry.ts # Prompt management
│   │       ├── base-tool.ts       # Abstract tool base class
│   │       └── base-prompt.ts     # Abstract prompt base class
│   │
│   ├── tools/                     # MCP tool implementations (30)
│   │   ├── base.ts                # Abstract base tool class
│   │   ├── validate-token.ts      # Token validation
│   │   ├── list-documents.ts      # List documents (v3)
│   │   ├── get-document.ts        # Get single document (v3)
│   │   ├── save-document.ts       # Save document/URL (v3)
│   │   ├── update-document.ts     # Update document (v3)
│   │   ├── delete-document.ts     # Delete document (v3)
│   │   ├── get-recent-content.ts  # Recent content
│   │   ├── get-highlights.ts      # List highlights (v2)
│   │   ├── get-highlight.ts       # Get single highlight (v2)
│   │   ├── create-highlight.ts    # Create highlight
│   │   ├── update-highlight.ts    # Update highlight
│   │   ├── delete-highlight.ts    # Delete highlight
│   │   ├── export-highlights.ts   # Export/sync highlights
│   │   ├── get-daily-review.ts    # Daily review highlights
│   │   ├── get-books.ts           # List books (v2)
│   │   ├── get-book.ts            # Get single book (v2)
│   │   ├── get-tags.ts            # List tags (v3)
│   │   ├── *-highlight-tag*.ts    # Highlight tag CRUD (5 tools)
│   │   ├── *-book-tag*.ts         # Book tag CRUD (5 tools)
│   │   └── bulk-*-documents.ts    # Bulk operations (3 tools)
│   │
│   ├── prompts/                   # MCP prompt implementations
│   │   ├── highlight-prompt.ts    # Highlight analysis prompt
│   │   └── search-prompt.ts       # Search results prompt
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── index.ts               # Core types export
│   │   ├── readwise.ts            # Readwise data models
│   │   ├── mcp.ts                 # MCP protocol types
│   │   ├── errors.ts              # Error types
│   │   └── validation.ts          # Validation types and helpers
│   │
│   └── utils/                     # Utility modules
│       ├── logger.ts              # Standard logger
│       ├── safe-logger.ts         # MCP-safe logger
│       ├── config.ts              # Configuration management
│       └── rate-limiter.ts        # Rate limiting utilities
│
├── tests/                         # Test suite
│   ├── setup.ts                   # Test configuration
│   ├── api/                       # API layer tests
│   ├── tools/                     # Tool tests
│   ├── prompts/                   # Prompt tests
│   ├── types/                     # Type/validation tests
│   └── utils/                     # Utility tests
│
├── examples/                      # Example implementations
├── docs/                          # Additional documentation
├── bin/                           # Binary/CLI files
│
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── jest.config.cjs                # Jest configuration
└── eslint.config.js               # ESLint configuration
```

---

## Core Components

### 1. Entry Point (`src/index.ts`)

The CLI entry point handles:

```typescript
// Responsibilities
- Parse CLI arguments (--port, --transport, --debug, --api-key, --setup)
- Load configuration from environment/files
- Initialize logging with appropriate level
- Create and start ReadwiseMCPServer instance
- Handle graceful shutdown on SIGINT/SIGTERM
```

**CLI Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--port` | HTTP server port | 3001 |
| `--transport` | Transport type (stdio/sse) | stdio |
| `--debug` | Enable debug logging | false |
| `--api-key` | Readwise API key | from config |
| `--setup` | Run setup wizard | false |

### 2. Main Server (`src/server.ts`)

The `ReadwiseMCPServer` class orchestrates all components:

```typescript
class ReadwiseMCPServer {
  // Dependencies
  private app: Express;              // HTTP server
  private server: HttpServer;        // Node HTTP server
  private mcpServer: MCPServer;      // MCP SDK server
  private apiClient: ReadwiseClient; // API client
  private api: ReadwiseAPI;          // API wrapper
  private toolRegistry: ToolRegistry;
  private promptRegistry: PromptRegistry;

  // Lifecycle
  async start(): Promise<void>;      // Start server
  async stop(): Promise<void>;       // Graceful shutdown

  // Route Setup
  private setupRoutes(): void;       // /health, /capabilities
  private setupStdioTransport(): void;
  private setupSSETransport(): void;

  // Request Handling
  private handleMCPRequest(request: MCPRequest): Promise<MCPResponse>;
  private handleToolCall(name: string, params: unknown): Promise<MCPToolResult>;
  private handlePromptCall(name: string, params: unknown): Promise<MCPPromptResult>;
}
```

### 3. Tool Registry (`src/mcp/registry/tool-registry.ts`)

Manages tool registration and lookup:

```typescript
class ToolRegistry {
  private tools: Map<string, BaseMCPTool>;

  register(tool: BaseMCPTool): void;
  get(name: string): BaseMCPTool | undefined;
  getNames(): string[];
  getAllTools(): BaseMCPTool[];
}
```

### 4. Prompt Registry (`src/mcp/registry/prompt-registry.ts`)

Similar structure for prompt management:

```typescript
class PromptRegistry {
  private prompts: Map<string, BaseMCPPrompt>;

  register(prompt: BaseMCPPrompt): void;
  get(name: string): BaseMCPPrompt | undefined;
  getNames(): string[];
  getAllPrompts(): BaseMCPPrompt[];
}
```

---

## Data Flow

### Request Processing Pipeline

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Request Flow                                    │
└──────────────────────────────────────────────────────────────────────────┘

1. Request Ingestion
   ┌─────────┐      ┌─────────┐
   │  stdio  │  OR  │   SSE   │
   │ (stdin) │      │ (/sse)  │
   └────┬────┘      └────┬────┘
        │                │
        └───────┬────────┘
                ▼
2. Transport Parsing
   ┌──────────────────────┐
   │   JSON-RPC/MCP       │
   │   Message Parsing    │
   └──────────┬───────────┘
              ▼
3. Request Validation
   ┌──────────────────────┐
   │  Validate Structure  │
   │  - type (tool/prompt)│
   │  - name              │
   │  - request_id        │
   │  - parameters        │
   └──────────┬───────────┘
              ▼
4. Handler Routing
   ┌──────────────────────┐
   │   Route to Handler   │
   │  ┌────────┬────────┐ │
   │  │  Tool  │ Prompt │ │
   │  │ Handler│ Handler│ │
   │  └────────┴────────┘ │
   └──────────┬───────────┘
              ▼
5. Registry Lookup
   ┌──────────────────────┐
   │  Find Tool/Prompt    │
   │  in Registry         │
   └──────────┬───────────┘
              ▼
6. Parameter Validation
   ┌──────────────────────┐
   │  tool.validate()     │
   │  - Required fields   │
   │  - Type checking     │
   │  - Range validation  │
   └──────────┬───────────┘
              ▼
7. Execution
   ┌──────────────────────┐
   │  tool.execute()      │
   │         │            │
   │         ▼            │
   │  ┌────────────────┐  │
   │  │  ReadwiseAPI   │  │
   │  │  Method Call   │  │
   │  └───────┬────────┘  │
   │          ▼           │
   │  ┌────────────────┐  │
   │  │ReadwiseClient  │  │
   │  │  HTTP Request  │  │
   │  └───────┬────────┘  │
   │          ▼           │
   │  ┌────────────────┐  │
   │  │ Rate Limiter   │  │
   │  │ Queue + Wait   │  │
   │  └───────┬────────┘  │
   │          ▼           │
   │  ┌────────────────┐  │
   │  │  Readwise API  │  │
   │  │   (External)   │  │
   │  └───────┬────────┘  │
   │          ▼           │
   │  ┌────────────────┐  │
   │  │ Response Parse │  │
   │  └────────────────┘  │
   └──────────┬───────────┘
              ▼
8. Response Formation
   ┌──────────────────────┐
   │  MCPResponse {       │
   │    result,           │
   │    request_id        │
   │  }                   │
   └──────────┬───────────┘
              ▼
9. Transport Response
   ┌─────────┐      ┌─────────┐
   │  stdout │  OR  │   SSE   │
   │  JSON   │      │  Event  │
   └─────────┘      └─────────┘
```

### Error Flow

```
Exception Thrown
       │
       ▼
┌──────────────────┐
│ Error Type Check │
└────────┬─────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐┌────────┐┌────────┐┌────────┐
│Validation││  API  ││Transport││Unknown │
│  Error  ││ Error ││  Error  ││ Error  │
└────┬────┘└───┬───┘└────┬────┘└───┬────┘
     │         │         │         │
     └────┬────┴─────────┴────┬────┘
          ▼                   ▼
   ┌─────────────────────────────┐
   │      ErrorResponse {        │
   │        error: {             │
   │          type: string,      │
   │          details: string    │
   │        },                   │
   │        request_id           │
   │      }                      │
   └─────────────────────────────┘
```

---

## API Layer

### ReadwiseClient (`src/api/client.ts`)

Low-level HTTP client with resilience features:

```typescript
class ReadwiseClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor(config: ClientConfig) {
    // Configure base URL, auth headers, timeout
  }

  // HTTP Methods
  async get<T>(path: string, params?: object): Promise<T>;
  async post<T>(path: string, data: object): Promise<T>;
  async put<T>(path: string, data: object): Promise<T>;
  async patch<T>(path: string, data: object): Promise<T>;
  async delete<T>(path: string): Promise<T>;

  // Internal
  private async withRetry<T>(fn: () => Promise<T>): Promise<T>;
}
```

**Features:**
- Automatic rate limiting (60 requests/minute)
- Exponential backoff retry (3 retries, 1s base)
- Request/response interceptors for logging
- Error normalization to `APIException`

### ReadwiseAPI (`src/api/readwise-api.ts`)

High-level API wrapper with business logic:

```typescript
class ReadwiseAPI {
  constructor(private client: ReadwiseClient) {}

  // Auth
  async validateToken(): Promise<any>;

  // Highlights (v2)
  async getHighlights(params: HighlightParams): Promise<PaginatedResponse<Highlight>>;
  async getHighlight(highlightId: string): Promise<Highlight>;
  async createHighlight(data: CreateHighlightData): Promise<Highlight>;
  async updateHighlight(params: UpdateHighlightParams): Promise<Highlight>;
  async deleteHighlight(params: DeleteHighlightParams): Promise<{ success: boolean }>;

  // Books (v2)
  async getBooks(params: BookParams): Promise<PaginatedResponse<Book>>;
  async getBook(bookId: string): Promise<Book>;

  // Documents (v3 Reader API)
  async listDocuments(params: ListDocumentsParams): Promise<any>;
  async getDocument(documentId: string, withHtmlContent?: boolean): Promise<any>;
  async saveDocument(data: SaveDocumentData): Promise<any>;
  async updateDocument(id: string, data: UpdateDocumentData): Promise<any>;
  async deleteDocument(id: string): Promise<void>;

  // Export & Sync
  async exportHighlights(params: ExportHighlightsParams): Promise<any>;
  async getDailyReview(): Promise<any>;

  // Tags (v3)
  async getTags(): Promise<TagResponse>;

  // Highlight Tag CRUD (v2)
  async listHighlightTags(highlightId: string): Promise<any>;
  async getHighlightTag(highlightId: string, tagId: string): Promise<any>;
  async createHighlightTag(highlightId: string, name: string): Promise<any>;
  async renameHighlightTag(highlightId: string, tagId: string, name: string): Promise<any>;
  async deleteHighlightTag(highlightId: string, tagId: string): Promise<any>;

  // Book Tag CRUD (v2)
  async listBookTags(bookId: string): Promise<any>;
  async getBookTag(bookId: string, tagId: string): Promise<any>;
  async createBookTag(bookId: string, name: string): Promise<any>;
  async renameBookTag(bookId: string, tagId: string, name: string): Promise<any>;
  async deleteBookTag(bookId: string, tagId: string): Promise<any>;
}
```

### API Endpoints Used

| Endpoint | Version | Purpose |
|----------|---------|---------|
| `/auth/` | - | Token validation |
| `/highlights/` | v2 | Highlight CRUD |
| `/highlights/:id/tags/` | v2 | Highlight tag CRUD |
| `/books/` | v2 | Book retrieval |
| `/books/:id/tags/` | v2 | Book tag CRUD |
| `/export/` | v2 | Highlight export with incremental sync |
| `/review/` | v2 | Daily review highlights |
| `/tags` | v2 | List all tags |
| `/v3/list/` | v3 | Document listing and retrieval |
| `/v3/save/` | v3 | Save documents |
| `/v3/update/` | v3 | Update documents |
| `/v3/delete/` | v3 | Delete documents |

---

## MCP Protocol Implementation

### Request Types

```typescript
type MCPRequest = {
  type: 'tool_call' | 'prompt_call';
  name: string;
  request_id: string;
  parameters: Record<string, unknown>;
};
```

### Response Types

```typescript
// Success Response
type MCPResponse = {
  result: unknown;
  request_id: string;
};

// Error Response
type ErrorResponse = {
  error: {
    type: string;
    details: string;
  };
  request_id: string;
};
```

### Transport Implementation

**stdio Transport:**
```typescript
// Read from stdin
process.stdin.on('data', (data) => {
  const request = JSON.parse(data.toString());
  const response = await handleMCPRequest(request);
  process.stdout.write(JSON.stringify(response));
});
```

**SSE Transport:**
```typescript
// SSE endpoint
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Send events...
});

// Message endpoint
app.post('/messages', async (req, res) => {
  const response = await handleMCPRequest(req.body);
  res.json(response);
});
```

---

## Tool System

### Base Tool Class

```typescript
abstract class BaseMCPTool<TParams = unknown, TResult = unknown> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: JSONSchema;

  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // Override for custom validation
  validate(params: TParams): ValidationResult {
    return { valid: true, success: true, errors: [] };
  }

  // Must be implemented by subclasses
  abstract execute(params: TParams): Promise<MCPToolResult<TResult>>;
}
```

### Tool Categories

#### Auth Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `validate_token` | Check API token validity | - |

#### Document Tools (Reader v3)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_documents` | List documents with filters | `location`, `category`, `tag`, `updated_after`, `page_cursor` |
| `get_document` | Get a single document by ID | `document_id`, `with_html_content` |
| `save_document` | Save URL/content to library | `url`, `title`, `html`, `tags`, etc. |
| `update_document` | Update document metadata | `document_id`, `title`, `author`, etc. |
| `delete_document` | Remove a document | `document_id` |
| `get_recent_content` | Get recently saved content | `days`, `limit` |

#### Highlight Tools (v2)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_highlights` | List highlights with pagination | `page_size`, `page`, `book_id`, `updated_after` |
| `get_highlight` | Get a single highlight by ID | `highlight_id` |
| `create_highlight` | Create a new highlight | `text`, `book_id`, `note`, `location` |
| `update_highlight` | Update an existing highlight | `highlight_id`, `text`, `note` |
| `delete_highlight` | Remove a highlight | `highlight_id` |
| `export_highlights` | Bulk export with incremental sync | `updated_after`, `ids`, `page_cursor` |
| `get_daily_review` | Get today's daily review highlights | - |

#### Book Tools (v2)

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_books` | List books from library | `page_size`, `page`, `category` |
| `get_book` | Get a single book by ID | `book_id` |

#### Tag Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_tags` | List all tags in library | - |

#### Highlight Tag CRUD (v2)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_highlight_tags` | List tags on a highlight | `highlight_id` |
| `get_highlight_tag` | Get a specific tag on a highlight | `highlight_id`, `tag_id` |
| `create_highlight_tag` | Add a tag to a highlight | `highlight_id`, `name` |
| `rename_highlight_tag` | Rename a tag on a highlight | `highlight_id`, `tag_id`, `name` |
| `delete_highlight_tag` | Remove a tag from a highlight | `highlight_id`, `tag_id` |

#### Book Tag CRUD (v2)

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_book_tags` | List tags on a book | `book_id` |
| `get_book_tag` | Get a specific tag on a book | `book_id`, `tag_id` |
| `create_book_tag` | Add a tag to a book | `book_id`, `name` |
| `rename_book_tag` | Rename a tag on a book | `book_id`, `tag_id`, `name` |
| `delete_book_tag` | Remove a tag from a book | `book_id`, `tag_id` |

#### Bulk Operations

| Tool | Description | Parameters |
|------|-------------|------------|
| `bulk_save_documents` | Save multiple documents | `documents[]`, `confirm` |
| `bulk_update_documents` | Update multiple documents | `updates[]`, `confirm` |
| `bulk_delete_documents` | Delete multiple documents | `ids[]`, `confirm` |

### Tool Implementation Example

```typescript
// src/tools/get-highlights.ts
export class GetHighlightsTool extends BaseMCPTool<GetHighlightsParams, PaginatedHighlights> {
  readonly name = 'get_highlights';
  readonly description = 'Retrieve highlights from your Readwise library with pagination';
  readonly parameters = {
    type: 'object',
    properties: {
      page_size: {
        type: 'number',
        description: 'Number of highlights per page (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100
      },
      page: {
        type: 'number',
        description: 'Page number',
        minimum: 1,
        default: 1
      },
      book_id: {
        type: 'number',
        description: 'Filter by book ID'
      },
      updated_after: {
        type: 'string',
        description: 'ISO date string to filter by update time'
      }
    }
  };

  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  validate(params: GetHighlightsParams): ValidationResult {
    const errors: ValidationError[] = [];

    if (params.page_size !== undefined) {
      if (params.page_size < 1 || params.page_size > 1000) {
        errors.push({ field: 'page_size', message: 'Must be between 1 and 1000' });
      }
    }

    return {
      valid: errors.length === 0,
      success: errors.length === 0,
      errors
    };
  }

  async execute(params: GetHighlightsParams): Promise<MCPToolResult<PaginatedHighlights>> {
    try {
      const result = await this.api.getHighlights({
        page_size: params.page_size ?? 100,
        page: params.page ?? 1,
        book_id: params.book_id,
        updated__gt: params.updated_after
      });

      return { result };
    } catch (error) {
      if (error instanceof APIException) {
        throw error;
      }
      return {
        result: null,
        success: false,
        error: `Failed to get highlights: ${error.message}`
      };
    }
  }
}
```

---

## Prompt System

### Base Prompt Class

```typescript
abstract class BaseMCPPrompt<TParams = unknown, TResult = unknown> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: JSONSchema;

  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  validate(params: TParams): ValidationResult {
    return { valid: true, success: true, errors: [] };
  }

  abstract execute(params: TParams): Promise<MCPPromptResult<TResult>>;
}
```

### Available Prompts

#### ReadwiseHighlightPrompt

Analyzes highlights with different task types:

| Task | Description |
|------|-------------|
| `summarize` | Create a summary of highlights |
| `analyze` | Analyze themes and patterns |
| `connect` | Find connections between ideas |
| `question` | Generate questions from content |

**Parameters:**
```typescript
{
  book_id?: number;      // Filter by book
  tag?: string;          // Filter by tag
  task: 'summarize' | 'analyze' | 'connect' | 'question';
}
```

#### ReadwiseSearchPrompt

Searches and formats highlight results:

**Parameters:**
```typescript
{
  query: string;         // Search query
  limit?: number;        // Max results
}
```

---

## Type System

### Core Data Models

```typescript
// Highlight
interface Highlight {
  id: number;
  text: string;
  note?: string;
  location?: number;
  location_type?: string;
  color?: string;
  highlighted_at?: string;
  created_at: string;
  updated_at: string;
  book_id: number;
  tags: Tag[];
  url?: string;
}

// Book
interface Book {
  id: number;
  title: string;
  author?: string;
  category: string;
  source: string;
  cover_image_url?: string;
  highlights_count: number;
  source_url?: string;
  unique_url?: string;
  asin?: string;
}

// Document
interface Document {
  id: string;
  title: string;
  author?: string;
  url: string;
  source_url?: string;
  category: string;
  created_at: string;
  updated_at: string;
  reading_progress?: number;
  tags: Tag[];
}

// Tag
interface Tag {
  id: number;
  name: string;
}
```

### Pagination

```typescript
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
```

### Bulk Operations

```typescript
interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    success: boolean;
    document_id?: string;
    error?: string;
  }>;
}
```

### Validation

```typescript
interface ValidationResult {
  valid: boolean;
  success: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
}

// Validation Helpers
function validateRequired(value: unknown, field: string): ValidationError | null;
function validateNumberRange(value: number, min: number, max: number, field: string): ValidationError | null;
function validateArray(value: unknown, field: string): ValidationError | null;
function validateAllowedValues<T>(value: T, allowed: T[], field: string): ValidationError | null;
function combineValidationResults(...results: ValidationResult[]): ValidationResult;
```

### Errors

```typescript
// Base Exception
class ReadwiseMCPException extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

// Validation Exception
class ValidationException extends ReadwiseMCPException {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
  }
}

// API Exception
class APIException extends ReadwiseMCPException {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }
}

// Transport Exception
class TransportException extends ReadwiseMCPException {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}
```

---

## Configuration Management

### Configuration Hierarchy

Priority (highest to lowest):
1. Command-line arguments
2. Environment variables
3. Config file (`~/.readwise-mcp/config.json`)
4. Credentials file (`~/.readwise-mcp/credentials.json`)
5. Default values

### Configuration Schema

```typescript
interface ServerConfig {
  readwiseApiKey: string;           // Required: Readwise API token
  readwiseApiBaseUrl: string;       // Base URL (default: https://readwise.io/api/v2)
  port: number;                     // HTTP port (default: 3001)
  transport: 'stdio' | 'sse';       // Transport type (default: stdio)
  debug: boolean;                   // Enable debug logging (default: false)
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `READWISE_API_KEY` | Readwise API token | - |
| `READWISE_API_BASE_URL` | API base URL | https://readwise.io/api/v2 |
| `PORT` | HTTP server port | 3001 |
| `TRANSPORT` | Transport type | stdio |
| `DEBUG` | Enable debug logging | false |

### Config File Locations

```
Standard:
  ~/.readwise-mcp/config.json
  ~/.readwise-mcp/credentials.json

Docker:
  /app/config/config.json
  /app/config/credentials.json
```

### File Security

- Config directory: `0o700` (owner read/write/execute only)
- Config files: `0o600` (owner read/write only)

---

## Error Handling

### Error Categories

| Category | Error Type | HTTP Status | Recovery |
|----------|------------|-------------|----------|
| Validation | `ValidationException` | 400 | Fix parameters |
| Authentication | `APIException` | 401/403 | Check API key |
| Rate Limiting | `APIException` | 429 | Wait and retry |
| Not Found | `APIException` | 404 | Check resource ID |
| Server Error | `APIException` | 5xx | Retry with backoff |
| Network | `TransportException` | - | Retry |

### Error Response Format

```typescript
{
  error: {
    type: "validation_error" | "api_error" | "transport_error" | "internal_error",
    details: "Human-readable error message"
  },
  request_id: "original-request-id"
}
```

### Retry Strategy

```typescript
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,         // 1 second
  maxDelay: 30000,         // 30 seconds
  backoffMultiplier: 2,    // Exponential
  retryableStatuses: [429, 500, 502, 503, 504]
};
```

---

## Security Architecture

### Authentication

- **API Key Storage**: Secured in config file with restricted permissions
- **Transport**: API key sent via `Authorization: Token <key>` header
- **No Key Logging**: API keys are never logged

### Destructive Operation Protection

Operations requiring confirmation:

| Operation | Confirmation String |
|-----------|---------------------|
| Delete Document | `'I confirm deletion'` |
| Bulk Delete Documents | `'I confirm deletion of these documents'` |
| Bulk Save Documents | `'I confirm saving these items'` |
| Bulk Update Documents | `'I confirm these updates'` |

### Input Validation

- All tool parameters validated before execution
- JSON Schema validation for parameter types
- Range validation for numeric parameters
- Required field validation

### File System Security

- Config files created with `0o600` permissions
- Config directory created with `0o700` permissions
- No world-readable sensitive files

---

## Performance & Resilience

### Rate Limiting

```typescript
const rateLimitConfig = {
  requestsPerMinute: 60,
  minimumDelay: 100,       // ms between requests
  windowSize: 60000        // 1 minute window
};
```

**Implementation:**
- Queue-based request processing
- Sliding window rate tracking
- Automatic wait when limit approached
- Exposed metrics: queue size, window requests

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error, options)) {
        throw error;
      }

      const delay = Math.min(
        options.baseDelay * Math.pow(options.backoffMultiplier, attempt),
        options.maxDelay
      );

      await sleep(delay);
    }
  }

  throw lastError;
}
```

### Pagination

All list endpoints support pagination:

```typescript
{
  page_size: number;     // Items per page (default: 100, max: 1000)
  page: number;          // Page number (1-indexed)
}
```

Response includes:
- `count`: Total items
- `next`: URL to next page (null if none)
- `previous`: URL to previous page (null if none)
- `results`: Current page items

---

## Testing Architecture

### Test Framework

- **Framework**: Jest with ts-jest
- **Environment**: Node
- **Coverage Threshold**: 5% minimum (configurable)

### Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── api/
│   └── client.test.ts          # API client tests
├── tools/
│   ├── get-highlights.test.ts  # Tool unit tests
│   ├── get-books.test.ts
│   └── ...
├── prompts/
│   └── highlight-prompt.test.ts
├── types/
│   ├── errors.test.ts
│   └── validation.test.ts
├── utils/
│   └── rate-limiter.test.ts
└── integration/
    ├── server.test.ts
    └── ...
```

### Test Setup

```typescript
// tests/setup.ts
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.READWISE_API_KEY = 'test-api-key';
});

afterAll(() => {
  jest.clearAllMocks();
});

// Global timeout
jest.setTimeout(5000);
```

### Mocking Strategy

```typescript
// Mock API Client
const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

// Mock Logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- tests/tools/get-highlights.test.ts
```

---

## Deployment Options

### Claude Desktop (stdio)

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "readwise": {
      "command": "npx",
      "args": ["-y", "readwise-mcp"],
      "env": {
        "READWISE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### HTTP/SSE Server

```bash
# Start SSE server
readwise-mcp --transport sse --port 3001

# With debug logging
readwise-mcp --transport sse --port 3001 --debug
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/

ENV NODE_ENV=production
ENV TRANSPORT=sse
ENV PORT=3001

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### AWS Lambda

```typescript
// Using serverless-http adapter
import serverless from 'serverless-http';
import { createServer } from './server';

export const handler = serverless(createServer());
```

### Google Cloud Functions

```typescript
// src/gcf.ts
import { Request, Response } from '@google-cloud/functions-framework';

export async function readwiseMCP(req: Request, res: Response) {
  // Handle request...
}
```

---

## Extension Guide

### Adding a New Tool

1. **Create tool file** in `src/tools/`:

```typescript
// src/tools/my-new-tool.ts
import { BaseMCPTool, MCPToolResult, ValidationResult } from '../mcp/registry/base-tool';
import { ReadwiseAPI } from '../api/readwise-api';
import { Logger } from '../utils/logger';

interface MyToolParams {
  required_param: string;
  optional_param?: number;
}

interface MyToolResult {
  data: unknown;
}

export class MyNewTool extends BaseMCPTool<MyToolParams, MyToolResult> {
  readonly name = 'my_new_tool';
  readonly description = 'Description of what this tool does';
  readonly parameters = {
    type: 'object',
    required: ['required_param'],
    properties: {
      required_param: {
        type: 'string',
        description: 'Description of this parameter'
      },
      optional_param: {
        type: 'number',
        description: 'Optional parameter',
        default: 10
      }
    }
  };

  constructor(private api: ReadwiseAPI, logger: Logger) {
    super(logger);
  }

  validate(params: MyToolParams): ValidationResult {
    const errors = [];

    if (!params.required_param) {
      errors.push({ field: 'required_param', message: 'Required' });
    }

    return {
      valid: errors.length === 0,
      success: errors.length === 0,
      errors
    };
  }

  async execute(params: MyToolParams): Promise<MCPToolResult<MyToolResult>> {
    try {
      // Implementation...
      const result = await this.api.someMethod(params);
      return { result: { data: result } };
    } catch (error) {
      return {
        result: null,
        success: false,
        error: `Failed: ${error.message}`
      };
    }
  }
}
```

2. **Register in server** (`src/server.ts`):

```typescript
import { MyNewTool } from './tools/my-new-tool';

// In constructor or setup method:
this.toolRegistry.register(new MyNewTool(this.api, this.logger));
```

3. **Add tests** in `tests/tools/my-new-tool.test.ts`

### Adding a New Prompt

1. **Create prompt file** in `src/prompts/`:

```typescript
// src/prompts/my-prompt.ts
import { BaseMCPPrompt, MCPPromptResult } from '../mcp/registry/base-prompt';

export class MyPrompt extends BaseMCPPrompt<MyPromptParams, MyPromptResult> {
  readonly name = 'my_prompt';
  readonly description = 'Description of prompt';
  readonly parameters = { /* JSON Schema */ };

  async execute(params: MyPromptParams): Promise<MCPPromptResult<MyPromptResult>> {
    // Implementation...
  }
}
```

2. **Register in server**

3. **Add tests**

### Adding API Methods

1. **Add to ReadwiseAPI** (`src/api/readwise-api.ts`):

```typescript
async myNewMethod(params: MyParams): Promise<MyResult> {
  const response = await this.client.get<MyResult>('/new-endpoint', params);
  return response;
}
```

2. **Add types** if needed in `src/types/`

---

## Appendix: MCP Tool Reference

### Complete Tool List (30 tools)

| Tool Name | Category | Description |
|-----------|----------|-------------|
| `validate_token` | Auth | Check API token validity |
| `list_documents` | Documents | List documents with filters |
| `get_document` | Documents | Get a single document by ID |
| `save_document` | Documents | Save URL/content to library |
| `update_document` | Documents | Update document metadata |
| `delete_document` | Documents | Remove a document |
| `get_recent_content` | Documents | Get recently saved content |
| `get_highlights` | Highlights | List highlights with pagination |
| `get_highlight` | Highlights | Get a single highlight by ID |
| `create_highlight` | Highlights | Create a new highlight |
| `update_highlight` | Highlights | Update an existing highlight |
| `delete_highlight` | Highlights | Remove a highlight |
| `export_highlights` | Highlights | Bulk export with incremental sync |
| `get_daily_review` | Highlights | Get today's daily review |
| `get_books` | Books | List books from library |
| `get_book` | Books | Get a single book by ID |
| `get_tags` | Tags | List all tags |
| `list_highlight_tags` | Tags | List tags on a highlight |
| `get_highlight_tag` | Tags | Get a specific highlight tag |
| `create_highlight_tag` | Tags | Add a tag to a highlight |
| `rename_highlight_tag` | Tags | Rename a highlight tag |
| `delete_highlight_tag` | Tags | Remove a tag from a highlight |
| `list_book_tags` | Tags | List tags on a book |
| `get_book_tag` | Tags | Get a specific book tag |
| `create_book_tag` | Tags | Add a tag to a book |
| `rename_book_tag` | Tags | Rename a book tag |
| `delete_book_tag` | Tags | Remove a tag from a book |
| `bulk_save_documents` | Bulk | Save multiple documents |
| `bulk_update_documents` | Bulk | Update multiple documents |
| `bulk_delete_documents` | Bulk | Delete multiple documents |

---

## Appendix: Sequence Diagrams

### Tool Execution Sequence

```
User         Claude       MCP Server    Tool Registry    Tool         API
 │             │              │              │             │           │
 │─ Request ──►│              │              │             │           │
 │             │─ tool_call ─►│              │             │           │
 │             │              │─ get(name) ─►│             │           │
 │             │              │◄─── tool ────│             │           │
 │             │              │─ validate() ────────────►│           │
 │             │              │◄── result ─────────────────│           │
 │             │              │─ execute() ─────────────►│           │
 │             │              │              │             │─ request ►│
 │             │              │              │             │◄─response─│
 │             │              │◄──── result ──────────────│           │
 │             │◄─ response ──│              │             │           │
 │◄── Answer ──│              │              │             │           │
 │             │              │              │             │           │
```

### Error Handling Sequence

```
User         Claude       MCP Server    Tool           API
 │             │              │            │             │
 │─ Request ──►│              │            │             │
 │             │─ tool_call ─►│            │             │
 │             │              │─ execute()─►│             │
 │             │              │            │─ request ──►│
 │             │              │            │◄─ 429 error─│
 │             │              │            │── wait ────►│ (rate limit)
 │             │              │            │─ retry ────►│
 │             │              │            │◄─ response ─│
 │             │              │◄── result ─│             │
 │             │◄─ response ──│            │             │
 │◄── Answer ──│              │            │             │
```

---

*Last updated: Generated from codebase analysis*
*Version: 1.0.0*
