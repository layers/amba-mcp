import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  // ─── Project-wide event log tail ─────────────────────────────────────

  server.tool(
    'amba_events_list',
    'List engagement events for a project (most recent first) with cursor pagination on (occurred_at, id). Defaults to the last 24 hours when `since` is omitted. Pass `next_cursor` from a previous page back as `cursor` to continue.',
    {
      project_id: z.string().describe('The project ID'),
      since: z
        .string()
        .optional()
        .describe('ISO-8601 lower bound for occurred_at. Defaults to 24h ago.'),
      until: z.string().optional().describe('ISO-8601 upper bound for occurred_at.'),
      event_name: z.string().optional().describe('Filter to a specific event_name.'),
      user_id: z.string().optional().describe('Filter to a single app_user UUID.'),
      limit: z.number().optional().describe('Page size (default 100, max 1000).'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque cursor returned by a previous page as `next_cursor`.'),
    },
    async ({ project_id, since, until, event_name, user_id, limit, cursor }) => {
      const query: Record<string, string> = {};
      if (since !== undefined) query.since = since;
      if (until !== undefined) query.until = until;
      if (event_name !== undefined) query.event_name = event_name;
      if (user_id !== undefined) query.user_id = user_id;
      if (limit !== undefined) query.limit = String(limit);
      if (cursor !== undefined) query.cursor = cursor;

      const result = await apiClient.get(`/projects/${project_id}/events`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_events_count',
    'Aggregate event counts for a project across a time window. `since` is required; range is capped at 90 days. Optional `group_by` returns per-day or per-event_name buckets in addition to the total.',
    {
      project_id: z.string().describe('The project ID'),
      since: z.string().describe('ISO-8601 lower bound for occurred_at (required).'),
      until: z
        .string()
        .optional()
        .describe('ISO-8601 upper bound for occurred_at. Defaults to now.'),
      event_name: z.string().optional().describe('Filter to a specific event_name.'),
      group_by: z
        .enum(['day', 'event_name'])
        .optional()
        .describe('Bucket results by calendar day (UTC) or event_name. Omit for total only.'),
    },
    async ({ project_id, since, until, event_name, group_by }) => {
      const query: Record<string, string> = { since };
      if (until !== undefined) query.until = until;
      if (event_name !== undefined) query.event_name = event_name;
      if (group_by !== undefined) query.group_by = group_by;

      const result = await apiClient.get(`/projects/${project_id}/events/count`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
