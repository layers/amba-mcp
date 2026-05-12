import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { INTEGRATION_PROVIDERS } from '@layers/amba-shared';
import type { ApiClient } from '../api-client.js';

const providerEnum = z.enum(INTEGRATION_PROVIDERS);

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_configure_integration',
    'Configure (create or replace) a third-party integration for a project. Supported providers: "apns" (Apple Push), "fcm" (Firebase Cloud Messaging), "revenuecat" (subscription management), "superwall" (paywall management). Each provider requires specific config fields.',
    {
      project_id: z.string().describe('The project ID'),
      provider: providerEnum.describe('Integration provider name'),
      config: z
        .record(z.unknown())
        .describe(
          'Provider-specific configuration. For APNs: { key_id, team_id, bundle_id, key_p8 }. For FCM: { service_account_json }. For RevenueCat: { api_key, webhook_secret }. For Superwall: { api_key }.',
        ),
    },
    async ({ project_id, provider, config }) => {
      const result = await apiClient.post(`/projects/${project_id}/integrations`, {
        provider,
        config,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_test_integration',
    'Test an existing integration to verify it is configured correctly and can connect to the third-party service. For APNs/FCM this calls the provider with a deliberately-invalid token to prove the credentials themselves are valid.',
    {
      project_id: z.string().describe('The project ID'),
      provider: providerEnum.describe('Integration provider to test'),
    },
    async ({ project_id, provider }) => {
      const result = await apiClient.post(`/projects/${project_id}/integrations/${provider}/test`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_integrations_list',
    'List all integrations configured for a project. Returns provider, is_active, and timestamps. Secrets are not returned.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/integrations`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_integrations_set',
    'Create or replace an integration (upsert by project+provider). This is an alias for `amba_configure_integration` that matches the audit naming scheme.',
    {
      project_id: z.string().describe('The project ID'),
      provider: providerEnum.describe('Integration provider name'),
      config: z
        .record(z.unknown())
        .describe('Provider-specific configuration (see amba_configure_integration)'),
    },
    async ({ project_id, provider, config }) => {
      const result = await apiClient.post(`/projects/${project_id}/integrations`, {
        provider,
        config,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_integrations_patch',
    'Patch an existing integration — update its config and/or toggle is_active. Omitted fields are left unchanged.',
    {
      project_id: z.string().describe('The project ID'),
      provider: providerEnum.describe('Integration provider name'),
      config: z
        .record(z.unknown())
        .optional()
        .describe('Replacement provider-specific configuration'),
      is_active: z.boolean().optional().describe('Toggle whether the integration is active'),
    },
    async ({ project_id, provider, config, is_active }) => {
      const payload: Record<string, unknown> = {};
      if (config !== undefined) payload.config = config;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(
        `/projects/${project_id}/integrations/${provider}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
