/**
 * Base API Adapter
 *
 * Provides deployment-agnostic abstractions for handling HTTP requests
 * and responses across different platforms (Vercel, Firebase Functions, Express, etc.)
 */

import type { APIResponse, APIError } from '../types';

// =============================================================================
// Core Abstractions
// =============================================================================

export interface ParsedRequest {
  method: string;
  path: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  body: any;
  params: Record<string, string>;

  // Auth context
  user?: {
    id: string;
    organizationId: string;
    roles: string[];
  };
  apiKey?: {
    id: string;
    organizationId: string;
    scopes: string[];
  };

  // Metadata
  requestId: string;
  timestamp: number;
  ip?: string;
  userAgent?: string;
}

export interface FormattedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface DeploymentHandler {
  (req: any, res?: any, context?: any): Promise<any>;
}

export interface APIAdapter {
  name: string;
  parseRequest(req: any, context?: any): Promise<ParsedRequest>;
  formatResponse(response: APIResponse, statusCode?: number): FormattedResponse;
  createHandler(controller: Controller): DeploymentHandler;
  handleError(error: Error, req?: ParsedRequest): FormattedResponse;
}

export interface Controller {
  handle(req: ParsedRequest): Promise<APIResponse>;
}

// =============================================================================
// Base Adapter Implementation
// =============================================================================

export abstract class BaseAdapter implements APIAdapter {
  abstract name: string;

  abstract parseRequest(req: any, context?: any): Promise<ParsedRequest>;
  abstract createHandler(controller: Controller): DeploymentHandler;

  formatResponse(response: APIResponse, statusCode = 200): FormattedResponse {
    const body = JSON.stringify({
      ...response,
      meta: {
        timestamp: Date.now(),
        version: '1.0',
        ...response.meta,
      },
    });

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      },
      body,
    };
  }

  handleError(error: Error, req?: ParsedRequest): FormattedResponse {
    console.error('API Error:', error);

    const apiError: APIError = {
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    };

    // Don't expose internal details in production
    if (process.env.NODE_ENV === 'development') {
      apiError.details = {
        stack: error.stack,
        request: req ? {
          method: req.method,
          path: req.path,
          requestId: req.requestId,
        } : undefined,
      };
    }

    const response: APIResponse = {
      success: false,
      error: apiError,
    };

    return this.formatResponse(response, 500);
  }

  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected parseQueryString(queryString: string): Record<string, string | string[]> {
    const params = new URLSearchParams(queryString);
    const result: Record<string, string | string[]> = {};

    for (const [key, value] of params.entries()) {
      if (result[key]) {
        if (Array.isArray(result[key])) {
          (result[key] as string[]).push(value);
        } else {
          result[key] = [result[key] as string, value];
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  protected extractPathParams(template: string, actualPath: string): Record<string, string> {
    const templateParts = template.split('/');
    const pathParts = actualPath.split('/');
    const params: Record<string, string> = {};

    for (let i = 0; i < templateParts.length; i++) {
      const templatePart = templateParts[i];
      const pathPart = pathParts[i];

      if (templatePart?.startsWith('{') && templatePart.endsWith('}')) {
        const paramName = templatePart.slice(1, -1);
        if (pathPart) {
          params[paramName] = decodeURIComponent(pathPart);
        }
      }
    }

    return params;
  }
}

// =============================================================================
// Controller Base Class
// =============================================================================

export abstract class BaseController implements Controller {
  abstract handle(req: ParsedRequest): Promise<APIResponse>;

  protected success<T>(data: T, meta?: any): APIResponse<T> {
    return {
      success: true,
      data,
      meta,
    };
  }

  protected error(code: string, message: string, details?: any): APIResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    };
  }

  protected validateRequiredFields(body: any, fields: string[]): string[] {
    const missing: string[] = [];

    for (const field of fields) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        missing.push(field);
      }
    }

    return missing;
  }

  protected parseIntParam(value: string | undefined, defaultValue?: number): number | undefined {
    if (value === undefined) return defaultValue;

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  protected parseBooleanParam(value: string | undefined, defaultValue?: boolean): boolean | undefined {
    if (value === undefined) return defaultValue;

    return value.toLowerCase() === 'true';
  }
}

// =============================================================================
// Route Matching Utilities
// =============================================================================

export interface RouteDefinition {
  method: string;
  pattern: string;
  controller: Controller;
}

export class Router {
  private routes: RouteDefinition[] = [];

  addRoute(method: string, pattern: string, controller: Controller): void {
    this.routes.push({ method, pattern, controller });
  }

  match(method: string, path: string): { controller: Controller; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method && route.method !== '*') continue;

      const params = this.matchPattern(route.pattern, path);
      if (params !== null) {
        return { controller: route.controller, params };
      }
    }

    return null;
  }

  private matchPattern(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart?.startsWith('{') && patternPart.endsWith('}')) {
        const paramName = patternPart.slice(1, -1);
        if (pathPart) {
          params[paramName] = decodeURIComponent(pathPart);
        }
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }
}

// =============================================================================
// Middleware Support
// =============================================================================

export interface Middleware {
  (req: ParsedRequest, next: () => Promise<APIResponse>): Promise<APIResponse>;
}

export class MiddlewareChain {
  private middlewares: Middleware[] = [];

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  async execute(req: ParsedRequest, finalHandler: () => Promise<APIResponse>): Promise<APIResponse> {
    let index = 0;

    const next = async (): Promise<APIResponse> => {
      if (index >= this.middlewares.length) {
        return finalHandler();
      }

      const middleware = this.middlewares[index++];
      return middleware!(req, next);
    };

    return next();
  }
}

// =============================================================================
// Common Middleware Implementations
// =============================================================================

export const corsMiddleware: Middleware = async (req, next) => {
  if (req.method === 'OPTIONS') {
    return {
      success: true,
      data: { message: 'CORS preflight response' },
    };
  }

  return next();
};

export const requestLoggingMiddleware: Middleware = async (req, next) => {
  const startTime = Date.now();

  console.log(`[${req.requestId}] ${req.method} ${req.path} - Started`);

  try {
    const response = await next();
    const duration = Date.now() - startTime;

    console.log(
      `[${req.requestId}] ${req.method} ${req.path} - ${response.success ? 'Success' : 'Error'} (${duration}ms)`
    );

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${req.requestId}] ${req.method} ${req.path} - Exception (${duration}ms):`, error);
    throw error;
  }
};

export const authMiddleware: Middleware = async (req, next) => {
  // Skip auth for public endpoints
  const publicPaths = ['/health', '/docs', '/openapi.json'];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (!authHeader && !apiKey) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // TODO: Implement actual auth validation
  // For now, we'll assume valid auth
  if (authHeader?.startsWith('Bearer ')) {
    req.user = {
      id: 'user_123',
      organizationId: 'org_123',
      roles: ['user'],
    };
  } else if (apiKey) {
    req.apiKey = {
      id: 'key_123',
      organizationId: 'org_123',
      scopes: ['read', 'write'],
    };
  }

  return next();
};

export const validationMiddleware: Middleware = async (req, next) => {
  // Basic request validation
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.body) {
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request body is required',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  return next();
};