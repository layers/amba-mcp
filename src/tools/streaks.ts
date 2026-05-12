import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_create_streak',
    'Create a streak definition for a project. Streaks track consecutive user engagement (e.g. daily logins, workout completions). Supports configurable periods, grace periods, and freeze mechanics.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Streak name (e.g. "Daily Login", "Workout Streak")'),
      description: z.string().optional().describe('Description of what this streak tracks'),
      qualifying_event: z
        .string()
        .describe(
          'The event name that qualifies for the streak (e.g. "app_open", "workout_completed")',
        ),
      period: z
        .enum(['daily', 'weekly'])
        .optional()
        .describe('Streak period. Defaults to "daily".'),
      grace_period_hours: z
        .number()
        .optional()
        .describe('Hours of grace before a streak breaks (default 0)'),
      freeze_enabled: z
        .boolean()
        .optional()
        .describe('Whether users can freeze their streak to prevent breaking it'),
      max_freezes: z
        .number()
        .optional()
        .describe('Maximum number of streak freezes (shields) a user can hold concurrently'),
      freezes_per_n_events: z
        .number()
        .nullable()
        .optional()
        .describe(
          'Auto-grant rule: every N consecutive qualifying events grants 1 freeze (shield), capped at max_freezes. Pass null or omit to disable auto-grant.',
        ),
    },
    async ({
      project_id,
      name,
      description,
      qualifying_event,
      period,
      grace_period_hours,
      freeze_enabled,
      max_freezes,
      freezes_per_n_events,
    }) => {
      const payload: Record<string, unknown> = { name, qualifying_event };
      if (description !== undefined) payload.description = description;
      if (period !== undefined) payload.period = period;
      if (grace_period_hours !== undefined) payload.grace_period_hours = grace_period_hours;
      if (freeze_enabled !== undefined) payload.freeze_enabled = freeze_enabled;
      if (max_freezes !== undefined) payload.max_freezes = max_freezes;
      if (freezes_per_n_events !== undefined) payload.freezes_per_n_events = freezes_per_n_events;

      const result = await apiClient.post(`/projects/${project_id}/streaks`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_streaks_list',
    'List all streak definitions for a project, ordered by name.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/streaks`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_streaks_update',
    'Update a streak definition. Only the supplied fields are changed; omitted fields are left untouched.',
    {
      project_id: z.string().describe('The project ID'),
      streak_id: z.string().describe('The streak definition ID'),
      name: z.string().optional().describe('New streak name'),
      description: z.string().optional().describe('New description'),
      qualifying_event: z.string().optional().describe('New qualifying event name'),
      period: z.enum(['daily', 'weekly']).optional().describe('New streak period'),
      grace_period_hours: z.number().optional().describe('New grace period in hours'),
      freeze_enabled: z.boolean().optional().describe('Toggle freeze support'),
      max_freezes: z.number().optional().describe('New shield cap'),
      freezes_per_n_events: z
        .number()
        .nullable()
        .optional()
        .describe(
          'Auto-grant rule. Pass null to disable; pass a positive integer to grant 1 shield every N qualifying events (capped at max_freezes).',
        ),
    },
    async ({
      project_id,
      streak_id,
      name,
      description,
      qualifying_event,
      period,
      grace_period_hours,
      freeze_enabled,
      max_freezes,
      freezes_per_n_events,
    }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (qualifying_event !== undefined) payload.qualifying_event = qualifying_event;
      if (period !== undefined) payload.period = period;
      if (grace_period_hours !== undefined) payload.grace_period_hours = grace_period_hours;
      if (freeze_enabled !== undefined) payload.freeze_enabled = freeze_enabled;
      if (max_freezes !== undefined) payload.max_freezes = max_freezes;
      if (freezes_per_n_events !== undefined) payload.freezes_per_n_events = freezes_per_n_events;

      const result = await apiClient.patch(`/projects/${project_id}/streaks/${streak_id}`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_streaks_delete',
    'Delete a streak definition. Existing user_streak rows are removed by DB cascade; historical streak_events may be preserved depending on schema.',
    {
      project_id: z.string().describe('The project ID'),
      streak_id: z.string().describe('The streak definition ID'),
    },
    async ({ project_id, streak_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/streaks/${streak_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
