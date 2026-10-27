/**
 * Model Context Protocol (MCP) Types & Contracts
 * Standard JSON-RPC 2.0 specifications for AI Agent tool invocation.
 */

export interface JsonRpcRequest<T = any> {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: T;
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface McpToolParameterProperty {
  type: string;
  description: string;
  enum?: string[];
  format?: string;
  items?: {
    type: string;
    description?: string;
  };
}

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, McpToolParameterProperty>;
    required?: string[];
  };
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}
