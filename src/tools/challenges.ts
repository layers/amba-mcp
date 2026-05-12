import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_create_challenge',
    'Create a time-limited challenge. Challenges are events that run between start_at and end_at, where users try to reach a goal (e.g. track 10 workouts this week, earn 500 XP in 3 days). Can reward XP and/or unlock an achievement on completion.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Challenge name (e.g. "7-Day Fitness Sprint", "XP Weekend Blitz")'),
      description: z.string().optional().describe('Description shown to users'),
      start_at: z.string().describe('ISO 8601 timestamp when the challenge starts'),
      end_at: z.string().describe('ISO 8601 timestamp when the challenge ends'),
      goal_type: z
        .enum(['event_count', 'xp_earned', 'streak_maintained'])
        .describe(
          'Type of goal: event_count (track N events), xp_earned (earn N XP), streak_maintained (keep streak for N days)',
        ),
      goal_value: z.number().describe('Target value for the goal'),
      reward_xp: z.number().optional().describe('XP to award on challenge completion (default 0)'),
      reward_achievement_id: z
        .string()
        .optional()
        .describe('Achievement to unlock on challenge completion'),
    },
    async ({
      project_id,
      name,
      description,
      start_at,
      end_at,
      goal_type,
      goal_value,
      reward_xp,
      reward_achievement_id,
    }) => {
      const payload: Record<string, unknown> = { name, start_at, end_at, goal_type, goal_value };
      if (description !== undefined) payload.description = description;
      if (reward_xp !== undefined) payload.reward_xp = reward_xp;
      if (reward_achievement_id !== undefined)
        payload.reward_achievement_id = reward_achievement_id;

      const result = await apiClient.post(`/projects/${project_id}/challenges`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_challenges',
    'List challenge definitions for a project. Optionally filter by status (active, upcoming, ended).',
    {
      project_id: z.string().describe('The project ID'),
      status: z
        .enum(['active', 'upcoming', 'ended'])
        .optional()
        .describe('Filter by challenge status'),
    },
    async ({ project_id, status }) => {
      const query: Record<string, string> = {};
      if (status !== undefined) query.status = status;

      const result = await apiClient.get(`/projects/${project_id}/challenges`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_challenge',
    'Fetch a single challenge by ID, including timing, goal, and reward configuration.',
    {
      project_id: z.string().describe('The project ID'),
      challenge_id: z.string().describe('The challenge ID'),
    },
    async ({ project_id, challenge_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/challenges/${challenge_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_update_challenge',
    'Partially update a challenge definition. Only the supplied fields are touched.',
    {
      project_id: z.string().describe('The project ID'),
      challenge_id: z.string().describe('The challenge ID'),
      name: z.string().optional().describe('Challenge name'),
      description: z.string().optional().describe('Description shown to users'),
      start_at: z.string().optional().describe('ISO 8601 start timestamp'),
      end_at: z.string().optional().describe('ISO 8601 end timestamp'),
      goal_value: z.number().optional().describe('Target value for the goal'),
      reward_xp: z.number().optional().describe('XP awarded on completion'),
      reward_achievement_id: z.string().optional().describe('Achievement to unlock on completion'),
    },
    async ({
      project_id,
      challenge_id,
      name,
      description,
      start_at,
      end_at,
      goal_value,
      reward_xp,
      reward_achievement_id,
    }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (start_at !== undefined) payload.start_at = start_at;
      if (end_at !== undefined) payload.end_at = end_at;
      if (goal_value !== undefined) payload.goal_value = goal_value;
      if (reward_xp !== undefined) payload.reward_xp = reward_xp;
      if (reward_achievement_id !== undefined)
        payload.reward_achievement_id = reward_achievement_id;

      const result = await apiClient.patch(
        `/projects/${project_id}/challenges/${challenge_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_challenge',
    'Delete a challenge definition. Hard delete — the row is removed; existing participant rows are cleaned up.',
    {
      project_id: z.string().describe('The project ID'),
      challenge_id: z.string().describe('The challenge ID'),
    },
    async ({ project_id, challenge_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/challenges/${challenge_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_challenge_participants',
    'List participants of a challenge with their progress toward the goal. Useful for inspecting who is participating and how close they are.',
    {
      project_id: z.string().describe('The project ID'),
      challenge_id: z.string().describe('The challenge ID'),
      limit: z.number().optional().describe('Max number of participants to return.'),
      offset: z.number().optional().describe('Offset for pagination.'),
    },
    async ({ project_id, challenge_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(
        `/projects/${project_id}/challenges/${challenge_id}/participants`,
        query,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
