import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

// Remote-config admin tools. Four endpoints map to the four handlers:
//
//   POST   /config         → amba_create_config  (upsert by key)
//   GET    /config         → amba_list_configs   (list active keys)
//   PATCH  /config/:key    → amba_update_config  (partial update)
//   DELETE /config/:key    → amba_delete_config  (remove key)

const configConditionSchema = z.object({
  segment_id: z.string().optional().describe('Segment ID to conditionally apply this value'),
  percentage: z.number().optional().describe('Percentage rollout (0-100)'),
  value: z.unknown().describe('Override value for this condition'),
});

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_list_configs',
    'List all remote-config keys for a project. Returns key, value, value_type, description, conditions, and version per active row. Remote config lets you change app behavior without deploying an update.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/config`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_create_config',
    'Create or upsert a remote-config key. Supports string, number, boolean, and JSON value types. Can include segment-based or percentage-based conditions for targeted rollouts. The handler is upsert-on-key — calling this for an existing key replaces it.',
    {
      project_id: z.string().describe('The project ID'),
      key: z.string().describe('Config key name (e.g. "feature_paywall_v2", "daily_limit")'),
      value: z.unknown().describe('The default config value'),
      value_type: z
        .enum(['string', 'number', 'boolean', 'json'])
        .optional()
        .describe('Value type. Defaults to "string".'),
      description: z.string().optional().describe('Description of what this config controls'),
      conditions: z
        .array(configConditionSchema)
        .optional()
        .describe('Conditional overrides based on segments or percentage rollout'),
    },
    async ({ project_id, key, value, value_type, description, conditions }) => {
      const payload: Record<string, unknown> = { key, value };
      if (value_type !== undefined) payload.value_type = value_type;
      if (description !== undefined) payload.description = description;
      if (conditions !== undefined) payload.conditions = conditions;

      const result = await apiClient.post(`/projects/${project_id}/config`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_update_config',
    'Partially update a single remote-config key. Only fields provided are touched — other fields are preserved. Updating `value` bumps the per-row version counter; any successful mutation also recomputes the singleton config_versions hash so cached clients see the change.',
    {
      project_id: z.string().describe('The project ID'),
      key: z.string().describe('The config key to update'),
      value: z.unknown().optional().describe('New default value (omit to leave unchanged)'),
      description: z.string().nullable().optional().describe('New description (null to clear)'),
      conditions: z
        .array(configConditionSchema)
        .optional()
        .describe('New conditional overrides (replaces the existing list)'),
    },
    async ({ project_id, key, value, description, conditions }) => {
      const payload: Record<string, unknown> = {};
      if (value !== undefined) payload.value = value;
      if (description !== undefined) payload.description = description;
      if (conditions !== undefined) payload.conditions = conditions;

      const result = await apiClient.patch(
        `/projects/${project_id}/config/${encodeURIComponent(key)}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_config',
    'Delete a remote-config key. Idempotent — deleting a non-existent key returns success. Recomputes the config_versions hash so clients refresh cached config on next fetch.',
    {
      project_id: z.string().describe('The project ID'),
      key: z.string().describe('The config key to delete'),
    },
    async ({ project_id, key }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/config/${encodeURIComponent(key)}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
