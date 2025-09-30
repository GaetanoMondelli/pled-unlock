/**
 * Vercel/Next.js API Adapter
 *
 * Adapter for deploying PLED API on Vercel using Next.js API routes.
 * Supports both traditional API routes and the new App Router format.
 */

import type { NextRequest, NextResponse } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import { BaseAdapter, type ParsedRequest, type Controller, type DeploymentHandler } from './base';

// =============================================================================
// Vercel Adapter (App Router)
// =============================================================================

export class VercelAppRouterAdapter extends BaseAdapter {
  name = 'vercel-app-router';

  async parseRequest(req: NextRequest, context?: { params?: Record<string, string> }): Promise<ParsedRequest> {
    const url = new URL(req.url);
    const body = req.body ? await this.parseBody(req) : null;

    // Extract auth information
    const authHeader = req.headers.get('authorization') || undefined;
    const apiKey = req.headers.get('x-api-key') || undefined;

    return {
      method: req.method,
      path: url.pathname,
      query: this.parseURLQuery(url.searchParams),
      headers: this.nextHeadersToRecord(req.headers),
      body,
      params: context?.params || {},
      requestId: this.generateRequestId(),
      timestamp: Date.now(),
      ip: this.getClientIP(req),
      userAgent: req.headers.get('user-agent') || undefined,
      // TODO: Add actual auth parsing
      user: authHeader ? this.parseAuthHeader(authHeader) : undefined,
      apiKey: apiKey ? this.parseAPIKey(apiKey) : undefined,
    };
  }

  createHandler(controller: Controller): DeploymentHandler {
    return async (req: NextRequest, context?: { params?: Record<string, string> }) => {
      try {
        const parsedRequest = await this.parseRequest(req, context);
        const response = await controller.handle(parsedRequest);
        const formatted = this.formatResponse(response);

        return new Response(formatted.body, {
          status: formatted.statusCode,
          headers: formatted.headers,
        });
      } catch (error) {
        console.error('Vercel handler error:', error);
        const errorResponse = this.handleError(error as Error);

        return new Response(errorResponse.body, {
          status: errorResponse.statusCode,
          headers: errorResponse.headers,
        });
      }
    };
  }

  private async parseBody(req: NextRequest): Promise<any> {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        return await req.json();
      } catch {
        return null;
      }
    }

    if (contentType.includes('text/')) {
      return await req.text();
    }

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await req.formData();
        const result: any = {};

        formData.forEach((value, key) => {
          result[key] = value;
        });

        return result;
      } catch {
        return null;
      }
    }

    return null;
  }

  private parseURLQuery(searchParams: URLSearchParams): Record<string, string | string[]> {
    const query: Record<string, string | string[]> = {};

    searchParams.forEach((value, key) => {
      if (query[key]) {
        if (Array.isArray(query[key])) {
          (query[key] as string[]).push(value);
        } else {
          query[key] = [query[key] as string, value];
        }
      } else {
        query[key] = value;
      }
    });

    return query;
  }

  private nextHeadersToRecord(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};

    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });

    return result;
  }

  private getClientIP(req: NextRequest): string | undefined {
    return (
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      undefined
    );
  }

  private parseAuthHeader(authHeader: string): any {
    // TODO: Implement actual JWT parsing
    if (authHeader.startsWith('Bearer ')) {
      return {
        id: 'user_123',
        organizationId: 'org_123',
        roles: ['user'],
      };
    }
    return undefined;
  }

  private parseAPIKey(apiKey: string): any {
    // TODO: Implement actual API key validation
    return {
      id: 'key_123',
      organizationId: 'org_123',
      scopes: ['read', 'write'],
    };
  }
}

// =============================================================================
// Vercel Adapter (Pages Router)
// =============================================================================

export class VercelPagesRouterAdapter extends BaseAdapter {
  name = 'vercel-pages-router';

  async parseRequest(req: NextApiRequest, res?: NextApiResponse): Promise<ParsedRequest> {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    return {
      method: req.method || 'GET',
      path: req.url || '/',
      query: req.query,
      headers: req.headers as Record<string, string>,
      body: req.body,
      params: this.extractDynamicParams(req),
      requestId: this.generateRequestId(),
      timestamp: Date.now(),
      ip: this.getClientIPFromNextAPI(req),
      userAgent: req.headers['user-agent'],
      // TODO: Add actual auth parsing
      user: authHeader ? this.parseAuthHeader(authHeader) : undefined,
      apiKey: apiKey ? this.parseAPIKey(apiKey) : undefined,
    };
  }

  createHandler(controller: Controller): DeploymentHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
          res.status(200).end();
          return;
        }

        const parsedRequest = await this.parseRequest(req, res);
        const response = await controller.handle(parsedRequest);
        const formatted = this.formatResponse(response);

        // Set headers
        Object.entries(formatted.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        res.status(formatted.statusCode).send(formatted.body);
      } catch (error) {
        console.error('Vercel Pages handler error:', error);
        const errorResponse = this.handleError(error as Error);

        Object.entries(errorResponse.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        res.status(errorResponse.statusCode).send(errorResponse.body);
      }
    };
  }

  private extractDynamicParams(req: NextApiRequest): Record<string, string> {
    // Extract dynamic route parameters from Next.js query
    const params: Record<string, string> = {};

    if (req.query) {
      Object.entries(req.query).forEach(([key, value]) => {
        if (typeof value === 'string') {
          params[key] = value;
        } else if (Array.isArray(value)) {
          params[key] = value[0] || '';
        }
      });
    }

    return params;
  }

  private getClientIPFromNextAPI(req: NextApiRequest): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0]?.trim();
    }

    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }

    return (
      req.headers['x-real-ip'] as string ||
      req.headers['cf-connecting-ip'] as string ||
      undefined
    );
  }

  private parseAuthHeader(authHeader: string): any {
    // TODO: Implement actual JWT parsing
    if (authHeader.startsWith('Bearer ')) {
      return {
        id: 'user_123',
        organizationId: 'org_123',
        roles: ['user'],
      };
    }
    return undefined;
  }

  private parseAPIKey(apiKey: string): any {
    // TODO: Implement actual API key validation
    return {
      id: 'key_123',
      organizationId: 'org_123',
      scopes: ['read', 'write'],
    };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a Vercel App Router handler for a controller
 */
export function createAppRouterHandler(controller: Controller) {
  const adapter = new VercelAppRouterAdapter();
  return adapter.createHandler(controller);
}

/**
 * Create a Vercel Pages Router handler for a controller
 */
export function createPagesRouterHandler(controller: Controller) {
  const adapter = new VercelPagesRouterAdapter();
  return adapter.createHandler(controller);
}

/**
 * Create handlers for all HTTP methods (App Router)
 */
export function createAppRouterHandlers(controller: Controller) {
  const handler = createAppRouterHandler(controller);

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
    OPTIONS: handler,
  };
}

/**
 * Create a unified handler that delegates to multiple controllers based on path (App Router)
 */
export function createAppRouterAPI(routes: Record<string, Controller>) {
  const adapter = new VercelAppRouterAdapter();

  const handler = async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      const parsedRequest = await adapter.parseRequest(req, context);

      // Simple path-based routing
      for (const [pattern, controller] of Object.entries(routes)) {
        if (parsedRequest.path.includes(pattern)) {
          const response = await controller.handle(parsedRequest);
          const formatted = adapter.formatResponse(response);

          return new Response(formatted.body, {
            status: formatted.statusCode,
            headers: formatted.headers,
          });
        }
      }

      // No route found
      const notFoundResponse = adapter.formatResponse({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
          timestamp: new Date().toISOString(),
        },
      }, 404);

      return new Response(notFoundResponse.body, {
        status: notFoundResponse.statusCode,
        headers: notFoundResponse.headers,
      });
    } catch (error) {
      console.error('App Router API error:', error);
      const errorResponse = adapter.handleError(error as Error);

      return new Response(errorResponse.body, {
        status: errorResponse.statusCode,
        headers: errorResponse.headers,
      });
    }
  };

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
    OPTIONS: handler,
  };
}