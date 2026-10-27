#!/usr/bin/env node

/**
 * ThreeKingdoms-AgentEngine: Official Model Context Protocol (MCP) Server
 * Enables Antigravity Agents, Claude Desktop, and IDEs to query and manipulate
 * the deterministic Grand Strategy simulation engine via standard JSON-RPC 2.0 over stdio.
 */

import readline from 'readline';
import { JsonRpcRequest, JsonRpcResponse } from './types';
import { MCP_TOOL_DEFINITIONS, executeMcpTool } from './tools';

const SERVER_NAME = 'threekingdoms-sim-mcp';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '2024-11-05';

export class McpServer {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  public start(): void {
    // Write diagnostics to stderr so standard stdout remains pure JSON-RPC
    process.stderr.write(`[MCP Server] Initialized "${SERVER_NAME}" (v${SERVER_VERSION}) on stdio.\n`);

    this.rl.on('line', async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const req: JsonRpcRequest = JSON.parse(trimmed);
        const res = await this.handleRequest(req);
        if (res) {
          process.stdout.write(JSON.stringify(res) + '\n');
        }
      } catch (err: any) {
        const errorRes: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: 0,
          error: {
            code: -32700,
            message: `Parse error: ${err.message}`
          }
        };
        process.stdout.write(JSON.stringify(errorRes) + '\n');
      }
    });
  }

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const { id, method, params } = req;

    switch (method) {
      // 1. MCP Handshake Initialize
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false }
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION
            }
          }
        };
      }

      case 'notifications/initialized': {
        // Notification, no response needed
        return null;
      }

      case 'ping': {
        return {
          jsonrpc: '2.0',
          id,
          result: {}
        };
      }

      // 2. Tools Discovery
      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOL_DEFINITIONS
          }
        };
      }

      // 3. Tool Execution
      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        try {
          const toolResult = await executeMcpTool(toolName, toolArgs);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
                }
              ],
              isError: false
            }
          };
        } catch (err: any) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Lỗi thực thi tool "${toolName}": ${err.message}`
                }
              ],
              isError: true
            }
          };
        }
      }

      // 4. Resources Discovery
      case 'resources/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: [
              {
                uri: 'threekingdoms://campaign/status',
                name: 'Current Campaign Overview',
                description: 'Overview of Year 184 AD campaign, protagonist net worth, and invariants',
                mimeType: 'application/json'
              }
            ]
          }
        };
      }

      default: {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
      }
    }
  }
}

// Start if executed directly
if (require.main === module || process.env.RUN_MCP === 'true') {
  const server = new McpServer();
  server.start();
}
