/**
 * Developer-account auth tools.
 *
 * Why these are special: every other MCP tool runs against `/admin/*` with
 * the inbound developer Bearer forwarded verbatim (`ApiClient.request`).
 * Signup/login/refresh hit the public `/auth/developer/*` endpoints which
 * either don't require a Bearer (signup, login, refresh) or require the
 * NEW token returned by an earlier tool (`me`, `rotate_pat`). So these
 * handlers bypass the shared `ApiClient.request` flow and use plain
 * `fetch` against `apiClient.getApiRoot()` (the API root with `/admin`
 * stripped).
 *
 * Bootstrap flow for an agent that has zero credentials:
 *
 *   1. Call `amba_developer_signup` with NO Authorization header. The MCP
 *      server's public-tools allowlist lets signup/login/refresh through
 *      unauthenticated.
 *   2. The signup response includes:
 *        - `pat`         — a long-lived Personal Access Token. Use the
 *                          PAT for agent flows: pass it as the inbound
 *                          Bearer for every subsequent MCP call. Survives
 *                          until rotated.
 *        - `project`     — a real isolated Neon-backed project provisioning
 *                          asynchronously. Includes project_id, client_key,
 *                          server_key, provisioning_status, and verify_url.
 *                          Poll `amba_get_provisioning_status` until the
 *                          workflow completes (~10s) before issuing
 *                          client-plane traffic.
 *   3. Re-issue subsequent MCP calls with `Authorization: Bearer <pat>`.
 *      All downstream tools (`amba_create_project`, etc.) now work.
 *
 * The PAT can be rotated via `amba_developer_rotate_pat`. The old PAT
 * stops working immediately on rotation (may take up to 30s to propagate).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

interface AuthFetchOptions {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  bearer?: string;
}

async function authFetch(
  apiClient: ApiClient,
  options: AuthFetchOptions,
): Promise<{ status: number; body: unknown }> {
  const url = `${apiClient.getApiRoot()}${options.path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (options.bearer) {
    headers['Authorization'] = `Bearer ${options.bearer}`;
  }
  const res = await fetch(url, {
    method: options.method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = { error: { code: 'INVALID_RESPONSE', message: res.statusText } };
  }
  return { status: res.status, body };
}

function jsonResult(payload: unknown): { content: { type: 'text'; text: string }[] } {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

/**
 * Flatten an authFetch result into the agent-facing tool payload.
 *
 * The body is spread FIRST so the HTTP `status` written last cannot be
 * shadowed by a colliding top-level `status` field in the API response.
 * Today no /auth/developer handler emits a top-level `status` key, but
 * agents read `parsed.status` to distinguish 2xx from 4xx/5xx — making
 * that key authoritative defends against a future API change silently
 * breaking error handling.
 */
function passthroughResult(result: { status: number; body: unknown }): {
  content: { type: 'text'; text: string }[];
} {
  return jsonResult({ ...((result.body as object) ?? {}), status: result.status });
}

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_developer_signup',
    [
      'Create a new Amba developer account. Returns a long-lived Personal Access Token (PAT)',
      'plus a real isolated Neon-backed project (provisioning asynchronously).',
      'Use the PAT for agent flows: pass the returned `pat` as the inbound Bearer for every',
      'subsequent MCP call — no refresh dance required.',
      'Verify your account via the returned `project.verify_url`. Poll',
      "`amba_get_provisioning_status` until the project flips to status='active' (~10s)",
      'before issuing client-plane traffic against the returned API keys.',
      'Email is normalized to lowercase. Password must be at least 8 characters.',
      'Errors: 409 EMAIL_EXISTS, 400 WEAK_PASSWORD/INVALID_INPUT, 429 if rate-limited (5/min, 50/day per IP).',
    ].join(' '),
    {
      email: z.string().email().describe('Developer email address. Will be lowercased.'),
      password: z.string().min(8).describe('Password, minimum 8 characters.'),
      name: z.string().optional().describe('Optional display name.'),
    },
    async ({ email, password, name }) => {
      const body: Record<string, unknown> = { email, password };
      if (name !== undefined) body.name = name;
      const result = await authFetch(apiClient, {
        method: 'POST',
        path: '/auth/developer/signup',
        body,
      });
      return passthroughResult(result);
    },
  );

  server.tool(
    'amba_developer_login',
    [
      'Log in to an existing Amba developer account. Returns access_token + refresh_token + developer record.',
      'Use the returned access_token as the inbound Bearer header on every subsequent MCP call.',
      'Errors: 401 INVALID_CREDENTIALS, 429 if rate-limited (10/min, 100/day per IP).',
    ].join(' '),
    {
      email: z.string().email().describe('Developer email address.'),
      password: z.string().describe('Developer password.'),
    },
    async ({ email, password }) => {
      const result = await authFetch(apiClient, {
        method: 'POST',
        path: '/auth/developer/login',
        body: { email, password },
      });
      return passthroughResult(result);
    },
  );

  server.tool(
    'amba_developer_refresh',
    [
      'Rotate a developer access_token using the refresh_token previously issued by signup or login.',
      'The old refresh_token is revoked and a new pair is issued — do NOT keep using the old one.',
      'Errors: 401 INVALID_TOKEN if refresh_token is expired/revoked/unknown, 429 if rate-limited.',
    ].join(' '),
    {
      refresh_token: z.string().describe('The refresh_token from a prior signup/login response.'),
    },
    async ({ refresh_token }) => {
      const result = await authFetch(apiClient, {
        method: 'POST',
        path: '/auth/developer/refresh',
        body: { refresh_token },
      });
      return passthroughResult(result);
    },
  );

  server.tool(
    'amba_developer_rotate_pat',
    [
      'Rotate the developer PAT. The old PAT stops working immediately (may take up to 30s to propagate).',
      'Use this if you suspect the current PAT has been exposed, or as a routine credential-hygiene step.',
      'Requires a valid Bearer (PAT or JWT) on the inbound request — does NOT bypass auth.',
      'Returns the new pat + pat_prefix + pat_last_4. The full pat is returned ONCE — store it immediately.',
      'Errors: 401 if Bearer is missing/invalid, 500 ROTATE_FAILED on DB error.',
    ].join(' '),
    {},
    async () => {
      const bearer = await apiClient.resolveTokenOrNull();
      if (!bearer) {
        return jsonResult({
          status: 401,
          error: {
            code: 'MISSING_BEARER',
            message:
              'No developer access token available. Call amba_developer_signup or amba_developer_login first.',
          },
        });
      }
      const result = await authFetch(apiClient, {
        method: 'POST',
        path: '/auth/developer/pat/rotate',
        bearer,
      });
      return passthroughResult(result);
    },
  );

  server.tool(
    'amba_developer_me',
    [
      'Return the developer profile (id, email, name, oauth_providers, avatar_url, github_username)',
      'for the access_token currently sent as the inbound Bearer. Useful for confirming the agent',
      'is authenticated as the expected developer before taking destructive actions.',
      'Errors: 401 if Bearer is missing/invalid, 404 NOT_FOUND if developer was deleted.',
    ].join(' '),
    {},
    async () => {
      const bearer = await apiClient.resolveTokenOrNull();
      if (!bearer) {
        return jsonResult({
          status: 401,
          error: {
            code: 'MISSING_BEARER',
            message:
              'No developer access token available. Call amba_developer_signup or amba_developer_login first, then re-issue this MCP request with the returned access_token as the inbound Bearer.',
          },
        });
      }
      const result = await authFetch(apiClient, {
        method: 'GET',
        path: '/auth/developer/me',
        bearer,
      });
      return passthroughResult(result);
    },
  );
}
