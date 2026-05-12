import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

const criteriaSchema = z.object({
  type: z
    .enum(['event_count', 'streak_length', 'xp_threshold', 'property_value'])
    .describe(
      'Type of criteria: event_count (track X N times), streak_length (N-day streak), xp_threshold (reach N XP), property_value (user property equals N)',
    ),
  event_name: z.string().optional().describe('Event name (required for event_count type)'),
  streak_definition_id: z
    .string()
    .optional()
    .describe('Streak definition ID (required for streak_length type)'),
  property_key: z
    .string()
    .optional()
    .describe('User property key (required for property_value type)'),
  target_value: z.number().describe('Target value to unlock the achievement'),
});

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_create_achievement',
    'Create an achievement/badge definition. Achievements unlock automatically when users meet the criteria (e.g. track 5 workouts, reach a 7-day streak, earn 5000 XP). Can optionally award bonus XP on unlock.',
    {
      project_id: z.string().describe('The project ID'),
      key: z
        .string()
        .describe('Unique key for this achievement (e.g. "first_workout", "streak_master_7")'),
      name: z.string().describe('Display name (e.g. "First Workout", "Streak Master")'),
      description: z.string().optional().describe('Description shown to users'),
      icon_url: z.string().optional().describe('URL to the achievement badge/icon image'),
      xp_reward: z
        .number()
        .optional()
        .describe('Bonus XP to award when the achievement is unlocked (default 0)'),
      criteria: criteriaSchema.describe('Unlock criteria for the achievement'),
      is_hidden: z
        .boolean()
        .optional()
        .describe('Whether this achievement is hidden until unlocked (default false)'),
      sort_order: z.number().optional().describe('Display order (lower numbers appear first)'),
    },
    async ({
      project_id,
      key,
      name,
      description,
      icon_url,
      xp_reward,
      criteria,
      is_hidden,
      sort_order,
    }) => {
      const payload: Record<string, unknown> = { key, name, criteria };
      if (description !== undefined) payload.description = description;
      if (icon_url !== undefined) payload.icon_url = icon_url;
      if (xp_reward !== undefined) payload.xp_reward = xp_reward;
      if (is_hidden !== undefined) payload.is_hidden = is_hidden;
      if (sort_order !== undefined) payload.sort_order = sort_order;

      const result = await apiClient.post(`/projects/${project_id}/achievements`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_achievements',
    'List all achievement definitions for a project, including criteria and XP rewards.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/achievements`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_achievement',
    'Fetch a single achievement definition by ID, including criteria and XP reward.',
    {
      project_id: z.string().describe('The project ID'),
      achievement_id: z.string().describe('The achievement ID'),
    },
    async ({ project_id, achievement_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/achievements/${achievement_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_update_achievement',
    'Partially update an achievement definition. Only supply the fields you want to change.',
    {
      project_id: z.string().describe('The project ID'),
      achievement_id: z.string().describe('The achievement ID'),
      name: z.string().optional().describe('Display name'),
      description: z.string().optional().describe('Description shown to users'),
      icon_url: z.string().optional().describe('URL to the achievement badge/icon image'),
      xp_reward: z.number().optional().describe('Bonus XP awarded on unlock'),
      criteria: criteriaSchema.optional().describe('New unlock criteria'),
      is_hidden: z
        .boolean()
        .optional()
        .describe('Whether the achievement is hidden until unlocked'),
      sort_order: z.number().optional().describe('Display order'),
    },
    async ({
      project_id,
      achievement_id,
      name,
      description,
      icon_url,
      xp_reward,
      criteria,
      is_hidden,
      sort_order,
    }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (icon_url !== undefined) payload.icon_url = icon_url;
      if (xp_reward !== undefined) payload.xp_reward = xp_reward;
      if (criteria !== undefined) payload.criteria = criteria;
      if (is_hidden !== undefined) payload.is_hidden = is_hidden;
      if (sort_order !== undefined) payload.sort_order = sort_order;

      const result = await apiClient.patch(
        `/projects/${project_id}/achievements/${achievement_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_achievement',
    'Delete an achievement definition. Existing user unlocks are not removed; the row is hard-deleted from `achievements`.',
    {
      project_id: z.string().describe('The project ID'),
      achievement_id: z.string().describe('The achievement ID'),
    },
    async ({ project_id, achievement_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/achievements/${achievement_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
