import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_create_xp_rule',
    'Create an XP rule that auto-awards XP when a matching engagement event is tracked. For example, award 50 XP every time a user completes a workout, with optional daily caps and cooldowns.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Rule name (e.g. "Workout Completed", "Daily Login Bonus")'),
      event_name: z
        .string()
        .describe(
          'The engagement event name that triggers XP (e.g. "workout_completed", "app_open")',
        ),
      xp_amount: z.number().describe('Amount of XP to award per event'),
      max_per_day: z
        .number()
        .optional()
        .describe('Maximum number of times this rule can fire per user per day (null = unlimited)'),
      cooldown_seconds: z
        .number()
        .optional()
        .describe('Minimum seconds between XP awards for the same user (default 0)'),
    },
    async ({ project_id, name, event_name, xp_amount, max_per_day, cooldown_seconds }) => {
      const payload: Record<string, unknown> = { name, event_name, xp_amount };
      if (max_per_day !== undefined) payload.max_per_day = max_per_day;
      if (cooldown_seconds !== undefined) payload.cooldown_seconds = cooldown_seconds;

      const result = await apiClient.post(`/projects/${project_id}/xp`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_xp_rules',
    'List all XP rules configured for a project. Shows event triggers, XP amounts, daily caps, and cooldowns.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/xp`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_user_xp',
    "Get a specific user's XP total, current level, and XP history. Useful for debugging or customer support.",
    {
      project_id: z.string().describe('The project ID'),
      user_id: z.string().describe('The app user ID'),
    },
    async ({ project_id, user_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/xp/users/${user_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_xp_update_rule',
    'Update an XP rule. Only the supplied fields are changed; omitted fields are left untouched.',
    {
      project_id: z.string().describe('The project ID'),
      rule_id: z.string().describe('The XP rule ID'),
      name: z.string().optional().describe('New rule name'),
      event_name: z.string().optional().describe('New trigger event name'),
      xp_amount: z.number().optional().describe('New XP amount per event'),
      max_per_day: z
        .number()
        .nullable()
        .optional()
        .describe('New per-user-per-day cap (null = unlimited)'),
      cooldown_seconds: z.number().optional().describe('New cooldown between awards in seconds'),
      is_active: z.boolean().optional().describe('Toggle whether the rule is active'),
    },
    async ({
      project_id,
      rule_id,
      name,
      event_name,
      xp_amount,
      max_per_day,
      cooldown_seconds,
      is_active,
    }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (event_name !== undefined) payload.event_name = event_name;
      if (xp_amount !== undefined) payload.xp_amount = xp_amount;
      if (max_per_day !== undefined) payload.max_per_day = max_per_day;
      if (cooldown_seconds !== undefined) payload.cooldown_seconds = cooldown_seconds;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(`/projects/${project_id}/xp/${rule_id}`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_xp_delete_rule',
    'Delete an XP rule. Historical user_xp rows are preserved.',
    {
      project_id: z.string().describe('The project ID'),
      rule_id: z.string().describe('The XP rule ID'),
    },
    async ({ project_id, rule_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/xp/${rule_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_xp_list_users',
    'List users by total XP (leaderboard view). Ordered by total_xp descending with pagination.',
    {
      project_id: z.string().describe('The project ID'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/xp/users`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
