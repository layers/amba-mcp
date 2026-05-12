import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_create_leaderboard',
    'Create a leaderboard definition. Leaderboards rank users by XP, streak length, or a custom metric. Supports all-time, daily, weekly, and monthly periods with configurable max entries.',
    {
      project_id: z.string().describe('The project ID'),
      name: z
        .string()
        .describe('Leaderboard name (e.g. "Top XP Earners", "Weekly Streak Leaders")'),
      metric: z
        .enum(['xp', 'streak', 'custom'])
        .describe(
          'What metric to rank by: xp (total XP), streak (longest streak), custom (custom event count)',
        ),
      period: z
        .enum(['all_time', 'daily', 'weekly', 'monthly'])
        .optional()
        .describe('Time period for the leaderboard. Defaults to "all_time".'),
      max_entries: z
        .number()
        .optional()
        .describe('Maximum number of entries to keep on the leaderboard (default 100)'),
      custom_event: z
        .string()
        .optional()
        .describe('Event name to count for custom metric leaderboards'),
    },
    async ({ project_id, name, metric, period, max_entries, custom_event }) => {
      const payload: Record<string, unknown> = { name, metric };
      if (period !== undefined) payload.period = period;
      if (max_entries !== undefined) payload.max_entries = max_entries;
      if (custom_event !== undefined) payload.custom_event = custom_event;

      const result = await apiClient.post(`/projects/${project_id}/leaderboards`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_leaderboard',
    'Get leaderboard entries with user display names and avatars. Returns ranked entries with scores.',
    {
      project_id: z.string().describe('The project ID'),
      leaderboard_id: z.string().describe('The leaderboard definition ID'),
      limit: z.number().optional().describe('Number of entries to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, leaderboard_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(
        `/projects/${project_id}/leaderboards/${leaderboard_id}/entries`,
        query,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_leaderboards',
    'List all leaderboard definitions for a project. Returns name, metric, period, and max_entries per leaderboard. (Use `amba_get_leaderboard` to fetch ranked entries for a specific leaderboard.)',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/leaderboards`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_leaderboard_definition',
    'Fetch a single leaderboard definition by ID — its metric, period, and configuration. (Use `amba_get_leaderboard` for ranked entries instead.)',
    {
      project_id: z.string().describe('The project ID'),
      leaderboard_id: z.string().describe('The leaderboard definition ID'),
    },
    async ({ project_id, leaderboard_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/leaderboards/${leaderboard_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_update_leaderboard',
    'Partially update a leaderboard definition. Only the supplied fields are touched.',
    {
      project_id: z.string().describe('The project ID'),
      leaderboard_id: z.string().describe('The leaderboard definition ID'),
      name: z.string().optional().describe('New display name'),
      metric: z.enum(['xp', 'streak', 'custom']).optional().describe('New ranking metric'),
      period: z
        .enum(['all_time', 'daily', 'weekly', 'monthly'])
        .optional()
        .describe('New time period'),
      max_entries: z.number().optional().describe('New max entries cap'),
      custom_event: z
        .string()
        .optional()
        .describe('Event name to count for custom metric leaderboards'),
    },
    async ({ project_id, leaderboard_id, name, metric, period, max_entries, custom_event }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (metric !== undefined) payload.metric = metric;
      if (period !== undefined) payload.period = period;
      if (max_entries !== undefined) payload.max_entries = max_entries;
      if (custom_event !== undefined) payload.custom_event = custom_event;

      const result = await apiClient.patch(
        `/projects/${project_id}/leaderboards/${leaderboard_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_leaderboard',
    'Delete a leaderboard definition. Existing entries are cleared as part of the delete.',
    {
      project_id: z.string().describe('The project ID'),
      leaderboard_id: z.string().describe('The leaderboard definition ID'),
    },
    async ({ project_id, leaderboard_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/leaderboards/${leaderboard_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
