import { loadCredentials, isTokenExpired } from './auth.js';

// Base URL targets the versioned admin surface (`/v1/admin`). `getApiRoot()`
// strips the trailing `/admin` so auth tools (`amba_developer_signup`,
// `_login`, `_refresh`) can reach the sibling `/v1/auth/developer/*`
// without a separate constant.
const BASE_URL = 'https://api.amba.dev/v1/admin';

export interface ApiClientOptions {
  baseUrl?: string;
  /**
   * Optional override for token resolution. When provided, the client uses
   * this in place of `loadCredentials()` (the CLI's `~/.amba/credentials.json`
   * flow) — this is what the hosted MCP server uses to forward the developer's
   * Bearer token from the inbound HTTP request to the downstream API call.
   *
   * The provider is invoked once per request, so callers can rotate or refresh
   * tokens transparently. Sync values should be wrapped in `() => Promise.resolve(token)`.
   */
  getToken?: () => Promise<string>;
}

export class ApiClient {
  private baseUrl: string;
  private apiRoot: string;
  private tokenProvider?: () => Promise<string>;

  constructor(options?: ApiClientOptions) {
    const raw = (options?.baseUrl ?? BASE_URL).replace(/\/+$/, '');
    // `baseUrl` MUST end in `/admin` — every `request()` consumer pre-pends
    // admin-side paths (`/projects`, `/projects/:id/...`). Without the
    // suffix `getApiRoot()` would silently return the wrong root and
    // tools targeting `/auth/developer/*` (signup/login/refresh) would
    // 404. Fail fast so misconfigured envs are caught at boot, not on
    // first tool call.
    if (!/\/admin$/.test(raw)) {
      throw new Error(
        `ApiClient baseUrl must end in /admin (got ${JSON.stringify(raw)}). ` +
          'Set AMBA_API_URL=https://api.amba.dev/v1/admin (or your equivalent versioned host).',
      );
    }
    this.baseUrl = raw;
    this.apiRoot = raw.replace(/\/admin$/, '');
    this.tokenProvider = options?.getToken;
  }

  /**
   * Returns the configured admin-prefixed base URL (e.g.
   * `https://api.amba.dev/admin`). Auth tools (`amba_developer_signup`,
   * `amba_developer_login`, `amba_developer_refresh`) need a sibling root
   * because the public `/auth/developer/*` endpoints are NOT under `/admin`.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Returns the API root with the trailing `/admin` segment stripped —
   * computed once at construction so tools targeting sibling routes
   * (`/auth/developer/*`) get a stable root regardless of trailing-slash
   * normalisation. The constructor enforces the `/admin` suffix invariant.
   */
  getApiRoot(): string {
    return this.apiRoot;
  }

  /**
   * Resolve the current developer Bearer token, going through the configured
   * tokenProvider (or `~/.amba/credentials.json` for the CLI fallback).
   *
   * Returns `null` if no provider is configured AND no credentials file exists
   * — useful for tools like `amba_developer_signup` that may run with no
   * inbound Bearer at all. All other code paths should treat a thrown error
   * as a hard auth failure (e.g. expired token).
   */
  async resolveTokenOrNull(): Promise<string | null> {
    if (this.tokenProvider) {
      try {
        const token = await this.tokenProvider();
        return token || null;
      } catch {
        return null;
      }
    }
    try {
      const credentials = await loadCredentials();
      if (isTokenExpired(credentials)) return null;
      return credentials.access_token;
    } catch {
      return null;
    }
  }

  private async getToken(): Promise<string> {
    if (this.tokenProvider) {
      const token = await this.tokenProvider();
      if (!token) {
        throw new Error('Token provider returned an empty token.');
      }
      return token;
    }

    const credentials = await loadCredentials();

    if (isTokenExpired(credentials)) {
      throw new Error('Developer access token has expired. Run "amba login" to re-authenticate.');
    }

    return credentials.access_token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<T> {
    const token = await this.getToken();

    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorMessage: string;
      try {
        const errorBody = (await res.json()) as { error?: { message?: string } };
        errorMessage = errorBody?.error?.message ?? res.statusText;
      } catch {
        errorMessage = res.statusText;
      }
      throw new Error(`API error ${res.status}: ${errorMessage}`);
    }

    return (await res.json()) as T;
  }

  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /**
   * GET that returns the raw response body as a string and only reads up to
   * `maxBytes` bytes. Used by export tools that hit CSV/NDJSON streaming
   * endpoints — JSON parsing isn't applicable, and we cap at 10k rows worth
   * of bytes so a multi-million-row export can't blow the MCP context window.
   *
   * Errors are still parsed via the JSON envelope where possible to keep the
   * thrown message human-readable (matches the regular request() behavior).
   */
  async getRaw(
    path: string,
    query?: Record<string, string>,
    options?: { maxBytes?: number },
  ): Promise<{ body: string; truncated: boolean; contentType: string | null }> {
    const token = await this.getToken();
    const maxBytes = options?.maxBytes ?? 1_048_576; // ~1 MiB default cap.

    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/csv, application/x-ndjson, */*',
      },
    });

    if (!res.ok) {
      let errorMessage: string;
      try {
        const errorBody = (await res.json()) as { error?: { message?: string } };
        errorMessage = errorBody?.error?.message ?? res.statusText;
      } catch {
        errorMessage = res.statusText;
      }
      throw new Error(`API error ${res.status}: ${errorMessage}`);
    }

    const contentType = res.headers.get('content-type');
    const reader = res.body?.getReader();
    if (!reader) {
      // No streaming body (e.g. the test harness) — fall back to text(), still
      // capped on byte length so the contract holds.
      const full = await res.text();
      const truncated = full.length > maxBytes;
      return {
        body: truncated ? full.slice(0, maxBytes) : full,
        truncated,
        contentType,
      };
    }

    const decoder = new TextDecoder();
    let received = 0;
    let truncated = false;
    let body = '';
    while (received < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const remaining = maxBytes - received;
      if (value.byteLength > remaining) {
        body += decoder.decode(value.slice(0, remaining), { stream: false });
        received = maxBytes;
        truncated = true;
        await reader.cancel();
        break;
      }
      body += decoder.decode(value, { stream: true });
      received += value.byteLength;
    }
    body += decoder.decode();
    return { body, truncated, contentType };
  }
}
