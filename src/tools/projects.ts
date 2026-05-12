import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_list_projects',
    'List all Amba projects owned by the authenticated developer. Returns project id, name, bundle_id, platform, and environment.',
    {},
    async () => {
      const result = await apiClient.get('/projects');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_project',
    'Get detailed information about a specific Amba project by its ID, including API keys, integrations, and configuration.',
    { project_id: z.string().describe('The project ID') },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_create_project',
    'Create a new Amba project. A project represents a mobile app and contains all its engagement configuration (push, segments, config, content, streaks).',
    {
      name: z.string().describe('Human-readable project name (e.g. "My Fitness App")'),
      bundle_id: z.string().optional().describe('App bundle identifier (e.g. "com.example.myapp")'),
      platform: z
        .enum(['ios', 'android', 'all'])
        .optional()
        .describe('Target platform. Defaults to "all".'),
    },
    async ({ name, bundle_id, platform }) => {
      const body: Record<string, unknown> = { name };
      if (bundle_id !== undefined) body.bundle_id = bundle_id;
      if (platform !== undefined) body.platform = platform;

      const result = await apiClient.post('/projects', body);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_update_project',
    'Update a project. Only `name`, `bundle_id`, `platform`, and `environment` are mutable; other fields are silently ignored. At least one editable field must be supplied.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().optional().describe('Human-readable project name.'),
      bundle_id: z
        .string()
        .optional()
        .describe('App bundle identifier (e.g. "com.example.myapp").'),
      platform: z.enum(['ios', 'android', 'all']).optional().describe('Target platform.'),
      environment: z
        .enum(['development', 'production'])
        .optional()
        .describe('Project environment.'),
    },
    async ({ project_id, name, bundle_id, platform, environment }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (bundle_id !== undefined) payload.bundle_id = bundle_id;
      if (platform !== undefined) payload.platform = platform;
      if (environment !== undefined) payload.environment = environment;

      const result = await apiClient.patch(`/projects/${project_id}`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_project',
    'Permanently delete an Amba project. This removes the project from Amba metadata. The associated Neon database is NOT auto-deleted — clean it up via the Neon console if no longer needed.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_create_api_key',
    'Generate a new API key for a project. The full key value is returned ONCE in the response and cannot be retrieved later — store it immediately. Server keys are for backend services; client keys are for the @layers/amba-client SDK.',
    {
      project_id: z.string().describe('The project ID'),
      key_type: z
        .enum(['client', 'server'])
        .describe(
          'Key type. `client` for the SDK on end-user devices; `server` for backend services.',
        ),
      environment: z.enum(['development', 'production']).describe('Environment this key targets.'),
    },
    async ({ project_id, key_type, environment }) => {
      const result = await apiClient.post(`/projects/${project_id}/api-keys`, {
        key_type,
        environment,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_api_key',
    'Revoke an API key. Subsequent requests using the key will be rejected with 401. Useful when a key is compromised or rotated.',
    {
      project_id: z.string().describe('The project ID'),
      key_id: z.string().describe('The API key ID to revoke'),
    },
    async ({ project_id, key_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/api-keys/${key_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_reprovision_project',
    'Re-drive a failed or stalled project provisioning. Kicks off the same provisioning workflow used at create-time but with a fresh per-attempt id, so duplicate POSTs collapse rather than fan out. Provisioning is idempotent.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.post(`/projects/${project_id}/reprovision`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_provisioning_status',
    "Inspect a project's Neon provisioning state. Returns the provisioning record plus a workflow descriptor (status, run id, start/close times) for the most recent provisioning attempt.",
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/provisioning-status`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
