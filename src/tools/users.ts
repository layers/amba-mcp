import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_list_users',
    'List app users for a project. Supports pagination with offset and limit, plus optional search (matches email / external_id / display_name with ILIKE) and segment filter. Returns user profiles including external_id, email, display_name, properties, and activity timestamps.',
    {
      project_id: z.string().describe('The project ID'),
      limit: z.number().optional().describe('Maximum number of users to return (default 50)'),
      offset: z.number().optional().describe('Number of users to skip for pagination (default 0)'),
      segment_id: z.string().optional().describe('Filter users by segment ID'),
      search: z
        .string()
        .optional()
        .describe(
          'Free-text search across email, external_id, and display_name (case-insensitive)',
        ),
    },
    async ({ project_id, limit, offset, segment_id, search }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);
      if (segment_id !== undefined) query.segment_id = segment_id;
      if (search !== undefined) query.search = search;

      const result = await apiClient.get(`/projects/${project_id}/users`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_users_get',
    'Get a single app user by id, with their streaks and entitlements joined in.',
    {
      project_id: z.string().describe('The project ID'),
      user_id: z.string().describe('The app user ID'),
    },
    async ({ project_id, user_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/users/${user_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_users_list_events',
    "List a single user's engagement events, newest first. Useful for debugging tracking issues or building a user timeline.",
    {
      project_id: z.string().describe('The project ID'),
      user_id: z.string().describe('The app user ID'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, user_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/users/${user_id}/events`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Bulk + export tools ─────────────────────────────────────────────

  server.tool(
    'amba_users_export',
    'Export all app users for a project as CSV (default) or NDJSON. Streams via DB cursor on the API side. The MCP tool reads back at most ~1 MiB of body — for very large tenants prefer `format: "ndjson"` (parsable line-by-line) and use a `since` filter to scope the export. The returned `truncated` flag is true if the body was clipped to fit the MCP context budget.',
    {
      project_id: z.string().describe('The project ID'),
      format: z
        .enum(['csv', 'ndjson'])
        .optional()
        .describe('Response format. Default csv. Recommend ndjson for parsability.'),
      since: z
        .string()
        .optional()
        .describe('ISO-8601 lower bound on `created_at`. Useful for incremental exports.'),
    },
    async ({ project_id, format, since }) => {
      const query: Record<string, string> = {};
      if (format !== undefined) query.format = format;
      if (since !== undefined) query.since = since;

      const { body, truncated, contentType } = await apiClient.getRaw(
        `/projects/${project_id}/users/export`,
        query,
      );
      const header = `# format=${format ?? 'csv'} truncated=${truncated} content-type=${contentType ?? 'unknown'}\n`;
      return { content: [{ type: 'text', text: header + body }] };
    },
  );

  server.tool(
    'amba_users_events_export',
    "Export one user's engagement events as CSV (default) or NDJSON. Streams via DB cursor on the API side. Filters: `since`, `until`, `event_name`. The MCP tool reads back at most ~1 MiB; the returned `truncated` flag indicates whether the body was clipped.",
    {
      project_id: z.string().describe('The project ID'),
      user_id: z.string().describe('The app user ID'),
      format: z
        .enum(['csv', 'ndjson'])
        .optional()
        .describe('Response format. Default csv. Recommend ndjson for parsability.'),
      since: z.string().optional().describe('ISO-8601 lower bound on `occurred_at`.'),
      until: z.string().optional().describe('ISO-8601 upper bound on `occurred_at`.'),
      event_name: z.string().optional().describe('Filter to a specific event_name.'),
    },
    async ({ project_id, user_id, format, since, until, event_name }) => {
      const query: Record<string, string> = {};
      if (format !== undefined) query.format = format;
      if (since !== undefined) query.since = since;
      if (until !== undefined) query.until = until;
      if (event_name !== undefined) query.event_name = event_name;

      const { body, truncated, contentType } = await apiClient.getRaw(
        `/projects/${project_id}/users/${user_id}/events/export`,
        query,
      );
      const header = `# format=${format ?? 'csv'} truncated=${truncated} content-type=${contentType ?? 'unknown'}\n`;
      return { content: [{ type: 'text', text: header + body }] };
    },
  );

  server.tool(
    'amba_users_bulk_update',
    'Apply property merges and/or segment add/remove to up to 1000 users in a single transactional call. Property updates use jsonb concat (top-level merge). Returns `{updated, failed}` where `failed` lists user_ids that did not exist in the project. At least one of `properties`, `add_segment_ids`, or `remove_segment_ids` must be set.',
    {
      project_id: z.string().describe('The project ID'),
      user_ids: z
        .array(z.string())
        .min(1)
        .max(1000)
        .describe('Array of app_user UUIDs (1-1000). Larger batches return BATCH_TOO_LARGE.'),
      updates: z
        .object({
          properties: z
            .record(z.unknown())
            .optional()
            .describe("Top-level keys merged into each user's jsonb properties."),
          add_segment_ids: z
            .array(z.string())
            .optional()
            .describe('Segment UUIDs to add membership for (idempotent).'),
          remove_segment_ids: z
            .array(z.string())
            .optional()
            .describe('Segment UUIDs to remove membership from.'),
        })
        .describe('Update payload. At least one field must be present.'),
    },
    async ({ project_id, user_ids, updates }) => {
      const result = await apiClient.post(`/projects/${project_id}/users/bulk-update`, {
        user_ids,
        updates,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Sessions ────────────────────────────────────────────────────────

  server.tool(
    'amba_sessions_analytics',
    'Get session analytics (DAU, active users, total sessions, average and median session duration) for a project across a rolling window.',
    {
      project_id: z.string().describe('The project ID'),
      period: z
        .enum(['24h', '7d', '30d', '90d'])
        .optional()
        .describe('Rolling window for the analytics. Defaults to 7d.'),
    },
    async ({ project_id, period }) => {
      const query: Record<string, string> = {};
      if (period) query.period = period;

      const result = await apiClient.get(`/projects/${project_id}/sessions`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_sessions_list',
    'List recent app sessions for a project, newest first. Supports pagination.',
    {
      project_id: z.string().describe('The project ID'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/sessions/list`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
