import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_get_analytics',
    'Get analytics overview for a project. Returns DAU, MAU, new users, retention (D1/D7), total events, active streaks, push stats, and premium/free user counts for the specified period.',
    {
      project_id: z.string().describe('The project ID'),
      period: z
        .enum(['24h', '7d', '30d', '90d'])
        .optional()
        .describe('Time period for analytics. Defaults to "7d".'),
    },
    async ({ project_id, period }) => {
      const query: Record<string, string> = {};
      if (period !== undefined) query.period = period;

      const result = await apiClient.get(`/projects/${project_id}/analytics`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
