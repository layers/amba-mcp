import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

const segmentConditionSchema = z.object({
  field: z
    .string()
    .describe(
      'User property field to evaluate (e.g. "last_seen_at", "properties.plan", "entitlements.is_active")',
    ),
  op: z
    .enum([
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'contains',
      'not_contains',
      'exists',
      'not_exists',
      'within',
      'not_within',
    ])
    .describe('Comparison operator'),
  value: z.unknown().describe('Value to compare against'),
});

const segmentRulesSchema = z.object({
  operator: z.enum(['AND', 'OR']).describe('Logical operator combining conditions'),
  conditions: z.array(segmentConditionSchema).describe('Array of filter conditions'),
});

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_list_segments',
    'List all user segments for a project. Segments define groups of users based on rules (e.g. "active in last 7 days", "premium users"). System segments are included.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/segments`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_create_segment',
    'Create a custom user segment with rule-based filters. Segments can target users by properties, activity, entitlements, and more. Used for push targeting and analytics.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Segment name (e.g. "Power Users", "Trial Expiring Soon")'),
      description: z.string().optional().describe('Human-readable description of the segment'),
      rules: segmentRulesSchema.describe('Segment filter rules with conditions'),
    },
    async ({ project_id, name, description, rules }) => {
      const payload: Record<string, unknown> = { name, rules };
      if (description !== undefined) payload.description = description;

      const result = await apiClient.post(`/projects/${project_id}/segments`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_segments_get',
    'Get a single segment by id including its rules and is_system flag.',
    {
      project_id: z.string().describe('The project ID'),
      segment_id: z.string().describe('The segment ID'),
    },
    async ({ project_id, segment_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/segments/${segment_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_segments_patch',
    "Update a non-system segment's name, description, and/or rules. System segments cannot be edited (API returns 403).",
    {
      project_id: z.string().describe('The project ID'),
      segment_id: z.string().describe('The segment ID'),
      name: z.string().optional().describe('New segment name'),
      description: z.string().nullable().optional().describe('New description; pass null to clear'),
      rules: segmentRulesSchema.optional().describe('Replacement rule tree'),
    },
    async ({ project_id, segment_id, name, description, rules }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (rules !== undefined) payload.rules = rules;

      const result = await apiClient.patch(
        `/projects/${project_id}/segments/${segment_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_segments_delete',
    'Delete a non-system segment. System segments cannot be deleted (API returns 403).',
    {
      project_id: z.string().describe('The project ID'),
      segment_id: z.string().describe('The segment ID'),
    },
    async ({ project_id, segment_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/segments/${segment_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_segments_evaluate',
    'Trigger an immediate segment evaluation workflow in Temporal. Useful after a rule change to refresh segment memberships without waiting for the 15-minute scheduled run.',
    {
      project_id: z.string().describe('The project ID'),
      segment_id: z.string().describe('The segment ID to evaluate'),
    },
    async ({ project_id, segment_id }) => {
      const result = await apiClient.post(
        `/projects/${project_id}/segments/${segment_id}/evaluate`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
