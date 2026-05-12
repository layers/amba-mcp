/**
 * Library entry for `@layers/amba-mcp`.
 *
 * Reusable MCP tool registry consumed by `mcp.amba.dev`. It registers
 * 100+ MCP tools — every Amba admin operation, basically — against an
 * injected `McpServer` and `ApiClient`. It does NOT bootstrap a transport.
 *
 * The hosted server mounts the registry behind the official MCP
 * **Streamable HTTP** transport so AI agents (Claude Desktop, Cursor,
 * Windsurf, …) can connect by URL +
 * `Authorization: Bearer <developer-access-token>`.
 *
 * Tool-group files in `./tools/*` only depend on `McpServer` + `ApiClient`.
 * They MUST stay free of transport coupling so the registry can run inside
 * any MCP transport, including future ones (SSE, WebSockets, …).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { ApiClient, type ApiClientOptions } from './api-client.js';

import { registerTools as registerProjectTools } from './tools/projects.js';
import { registerTools as registerPushTools } from './tools/push.js';
import { registerTools as registerSegmentTools } from './tools/segments.js';
import { registerTools as registerConfigTools } from './tools/config.js';
import { registerTools as registerContentTools } from './tools/content.js';
import { registerTools as registerStreakTools } from './tools/streaks.js';
import { registerTools as registerIntegrationTools } from './tools/integrations.js';
import { registerTools as registerAnalyticsTools } from './tools/analytics.js';
import { registerTools as registerUserTools } from './tools/users.js';
import { registerTools as registerSetupTools } from './tools/setup.js';
import { registerTools as registerAchievementTools } from './tools/achievements.js';
import { registerTools as registerChallengeTools } from './tools/challenges.js';
import { registerTools as registerEconomyTools } from './tools/economy.js';
import { registerTools as registerLeaderboardTools } from './tools/leaderboards.js';
import { registerTools as registerPlatformTools } from './tools/platform.js';
import { registerTools as registerSocialTools } from './tools/social.js';
import { registerTools as registerXpTools } from './tools/xp.js';
import { registerTools as registerEventsTools } from './tools/events.js';
import { registerTools as registerAuthTools } from './tools/auth.js';

/**
 * Register every Amba MCP tool group against the given server, using the
 * given API client. A single `McpServer` instance should only have this
 * called against it once.
 */
export function registerAllTools(server: McpServer, apiClient: ApiClient): void {
  // Auth tools land first so they're prominent in tools/list output — agents
  // bootstrapping with zero credentials need to find these before anything else.
  registerAuthTools(server, apiClient);
  registerProjectTools(server, apiClient);
  registerPushTools(server, apiClient);
  registerSegmentTools(server, apiClient);
  registerConfigTools(server, apiClient);
  registerContentTools(server, apiClient);
  registerStreakTools(server, apiClient);
  registerIntegrationTools(server, apiClient);
  registerAnalyticsTools(server, apiClient);
  registerUserTools(server, apiClient);
  registerSetupTools(server, apiClient);
  registerAchievementTools(server, apiClient);
  registerChallengeTools(server, apiClient);
  registerEconomyTools(server, apiClient);
  registerLeaderboardTools(server, apiClient);
  registerPlatformTools(server, apiClient);
  registerSocialTools(server, apiClient);
  registerXpTools(server, apiClient);
  registerEventsTools(server, apiClient);
}

/**
 * Convenience factory used by the hosted MCP server to build a per-request
 * `ApiClient` whose Bearer token comes from the inbound HTTP `Authorization`
 * header. Equivalent to `new ApiClient({ baseUrl, getToken: async () => token })`.
 *
 * If `token` is omitted the client falls back to `~/.amba/credentials.json`
 * — that path is only useful for tests or local-dev scripts; production
 * hosted-MCP traffic always passes an explicit token.
 */
export function createApiClient(options: { baseUrl?: string; token?: string }): ApiClient {
  const opts: ApiClientOptions = {};
  if (options.baseUrl !== undefined) opts.baseUrl = options.baseUrl;
  if (options.token !== undefined) {
    const token = options.token;
    opts.getToken = async () => token;
  }
  return new ApiClient(opts);
}

export { ApiClient } from './api-client.js';
export type { ApiClientOptions } from './api-client.js';
