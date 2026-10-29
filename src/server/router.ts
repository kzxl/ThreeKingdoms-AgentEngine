/**
 * ThreeKingdoms-AgentEngine: Server HTTP Router (src/server/router.ts)
 * Lightweight, dependency-free HTTP router for Node.js native http.IncomingMessage & http.ServerResponse.
 * Supports HTTP methods, exact & parameterized route matching, query string parsing,
 * sub-router mounting, and JSON serialization helpers.
 *
 * Adheres to AgentOption Universe Architecture v4.0.
 */

import http from 'http';
import { URL } from 'url';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | string;

export interface RouteParams {
  [key: string]: string;
}

export interface RouteQuery {
  [key: string]: string | string[] | undefined;
}

export interface RouteContext<TBody = any> {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  pathname: string;
  params: RouteParams;
  query: RouteQuery;
  body: TBody;
}

export type RouteHandler<TBody = any> = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: RouteContext<TBody>
) => Promise<void> | void;

export interface RouteDefinition {
  method: HttpMethod;
  pattern: string;
  paramNames: string[];
  regex: RegExp;
  handler: RouteHandler;
}

/**
 * Sends a JSON response with standard CORS headers and utf-8 charset.
 */
export function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  payload: any,
  additionalHeaders?: Record<string, string>
): void {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    ...(additionalHeaders || {})
  };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
}

/**
 * Parses JSON body from Node.js IncomingMessage stream with size limit protection.
 */
export function parseJsonBody<T = any>(req: http.IncomingMessage): Promise<T> {
  if ((req as any).body !== undefined) {
    return Promise.resolve((req as any).body as T);
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer | string) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large (>10MB)'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        (req as any).body = {};
        resolve({} as T);
        return;
      }
      try {
        const parsed = JSON.parse(body);
        (req as any).body = parsed;
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(`Malformed JSON request body: ${err.message}`));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

/**
 * Compiles a route pattern into a RegExp and parameter names list.
 * e.g. "/api/items/:id" => regex: /^\/api\/items\/([^/]+)\/?$/i, paramNames: ['id']
 */
function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const clean = pattern.split('?')[0].trim();
  const normalized = clean === '/' ? '/' : clean.replace(/\/+$/, '');

  const segments = normalized.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { regex: /^\/?$/i, paramNames: [] };
  }

  const regexParts = segments.map((seg) => {
    if (seg.startsWith(':')) {
      paramNames.push(seg.slice(1));
      return '([^\\/]+)';
    } else if (seg === '*') {
      return '(?:.*)';
    } else {
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  });

  const regex = new RegExp(`^\\/${regexParts.join('\\/')}\\/?$`, 'i');
  return { regex, paramNames };
}

/**
 * Safely combines a mounting prefix and a sub-route pattern without duplication.
 */
function combinePaths(prefix: string, subPath: string): string {
  const normPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
  const cleanPrefix = normPrefix.replace(/\/+$/, '');
  const normSub = subPath.startsWith('/') ? subPath : `/${subPath}`;

  if (!cleanPrefix) return normSub;
  if (normSub === cleanPrefix || normSub.startsWith(`${cleanPrefix}/`)) {
    return normSub;
  }
  return `${cleanPrefix}${normSub}`;
}

export class Router {
  private readonly routes: RouteDefinition[] = [];

  /**
   * Registers a route with the given HTTP method, path pattern, and handler.
   */
  public registerRoute(method: HttpMethod, pattern: string, handler: RouteHandler): this {
    const { regex, paramNames } = compilePattern(pattern);
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      paramNames,
      regex,
      handler
    });
    return this;
  }

  public get(pattern: string, handler: RouteHandler): this {
    return this.registerRoute('GET', pattern, handler);
  }

  public post(pattern: string, handler: RouteHandler): this {
    return this.registerRoute('POST', pattern, handler);
  }

  public put(pattern: string, handler: RouteHandler): this {
    return this.registerRoute('PUT', pattern, handler);
  }

  public delete(pattern: string, handler: RouteHandler): this {
    return this.registerRoute('DELETE', pattern, handler);
  }

  public patch(pattern: string, handler: RouteHandler): this {
    return this.registerRoute('PATCH', pattern, handler);
  }

  public all(pattern: string, handler: RouteHandler): this {
    return this.registerRoute('*', pattern, handler);
  }

  /**
   * Registers all routes from a sub-router prefixed with the specified mount path.
   */
  public registerSubRouter(prefix: string, subRouter: Router): this {
    for (const route of subRouter.getRoutes()) {
      const combinedPattern = combinePaths(prefix, route.pattern);
      this.registerRoute(route.method, combinedPattern, route.handler);
    }
    return this;
  }

  /**
   * Helper method to return all currently registered route definitions.
   */
  public getRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  /**
   * Dispatches an incoming HTTP request against registered routes.
   * Returns true if a route was matched and handled, false otherwise.
   */
  /**
   * True when any registered route would handle this request. Used by the
   * gateway to detect modular routes before delegating, without consuming the
   * request body.
   */
  public matches(req: http.IncomingMessage): boolean {
    const method = (req.method || 'GET').toUpperCase();
    const host = req.headers.host || 'localhost';
    const pathname = new URL(req.url || '/', `http://${host}`).pathname;
    return this.routes.some(route => {
      if (route.method !== '*' && route.method !== method) return false;
      route.regex.lastIndex = 0;
      return route.regex.test(pathname);
    });
  }

  public async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
    const method = (req.method || 'GET').toUpperCase();
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);
    const pathname = parsedUrl.pathname;

    // Handle CORS preflight directly
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
      });
      res.end();
      return true;
    }

    for (const route of this.routes) {
      if (route.method !== '*' && route.method !== method) {
        continue;
      }

      const match = route.regex.exec(pathname);
      if (!match) {
        continue;
      }

      // Extract parameter dictionary
      const params: RouteParams = {};
      if (route.paramNames.length > 0) {
        for (let i = 0; i < route.paramNames.length; i++) {
          const paramName = route.paramNames[i];
          const rawValue = match[i + 1] || '';
          try {
            params[paramName] = decodeURIComponent(rawValue);
          } catch {
            params[paramName] = rawValue;
          }
        }
      }

      // Extract query parameters
      const query: RouteQuery = {};
      for (const [key, value] of parsedUrl.searchParams.entries()) {
        if (query[key] !== undefined) {
          if (Array.isArray(query[key])) {
            (query[key] as string[]).push(value);
          } else {
            query[key] = [query[key] as string, value];
          }
        } else {
          query[key] = value;
        }
      }

      // Parse JSON body for mutation requests if not pre-parsed
      let body: any = (req as any).body;
      if (body === undefined && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        try {
          body = await parseJsonBody(req);
        } catch (err: any) {
          sendJson(res, 400, { success: false, error: err.message || 'Invalid JSON body' });
          return true;
        }
      }

      const ctx: RouteContext = {
        req,
        res,
        pathname,
        params,
        query,
        body: body || {}
      };

      try {
        await route.handler(req, res, ctx);
        return true;
      } catch (err: any) {
        console.error(`[Router] Unhandled error at ${method} ${pathname}:`, err);
        if (!res.headersSent) {
          sendJson(res, 500, {
            success: false,
            error: err.message || 'Internal Server Error'
          });
        }
        return true;
      }
    }

    return false;
  }
}
