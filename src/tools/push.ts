import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_create_push_campaign',
    'Create a new push notification campaign for a project. The campaign starts in "draft" status. You can optionally target a segment and schedule delivery.',
    {
      project_id: z.string().describe('The project ID'),
      title: z.string().describe('Push notification title shown to the user'),
      body: z.string().describe('Push notification body text'),
      name: z.string().optional().describe('Internal campaign name for developer reference'),
      segment_id: z
        .string()
        .optional()
        .describe('Target segment ID. If omitted, targets all users.'),
      data: z
        .record(z.unknown())
        .optional()
        .describe('Custom key-value data payload attached to the push notification'),
      scheduled_at: z
        .string()
        .optional()
        .describe(
          'ISO 8601 datetime to schedule delivery. If omitted, the campaign remains a draft.',
        ),
    },
    async ({ project_id, title, body, name, segment_id, data, scheduled_at }) => {
      const payload: Record<string, unknown> = { title, body };
      if (name !== undefined) payload.name = name;
      if (segment_id !== undefined) payload.segment_id = segment_id;
      if (data !== undefined) payload.data = data;
      if (scheduled_at !== undefined) payload.scheduled_at = scheduled_at;

      const result = await apiClient.post(`/projects/${project_id}/push/campaigns`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_send_push_campaign',
    'Send (trigger delivery of) a previously created push campaign. The campaign must be in "draft" status. Scheduled campaigns fire automatically.',
    {
      project_id: z.string().describe('The project ID'),
      campaign_id: z.string().describe('The push campaign ID to send'),
    },
    async ({ project_id, campaign_id }) => {
      const result = await apiClient.post(
        `/projects/${project_id}/push/campaigns/${campaign_id}/send`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_send_test_push',
    "Send a test push notification. Provide either `app_user_id` (uses the user's most recent active push token) or an explicit `device_token`+`provider` pair. Useful for verifying APNs/FCM configuration before launching a campaign.",
    {
      project_id: z.string().describe('The project ID'),
      title: z.string().describe('Push notification title'),
      body: z.string().describe('Push notification body text'),
      app_user_id: z
        .string()
        .optional()
        .describe(
          'Target app user ID; server looks up their most recent active push token. Either this or device_token+provider is required.',
        ),
      device_token: z
        .string()
        .optional()
        .describe('Explicit device push token (APNs or FCM). Requires `provider` when set.'),
      provider: z
        .enum(['apns', 'fcm'])
        .optional()
        .describe('Push provider when `device_token` is supplied. Required with device_token.'),
      data: z.record(z.unknown()).optional().describe('Optional custom data payload'),
    },
    async ({ project_id, title, body, app_user_id, device_token, provider, data }) => {
      const payload: Record<string, unknown> = { title, body };
      if (app_user_id !== undefined) payload.app_user_id = app_user_id;
      if (device_token !== undefined) payload.device_token = device_token;
      if (provider !== undefined) payload.provider = provider;
      if (data !== undefined) payload.data = data;

      const result = await apiClient.post(`/projects/${project_id}/push/campaigns/test`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Push Campaigns completion (list / get / delete) ──────────────────
  //
  // Note: the API currently exposes list, get, and send; there is no PATCH
  // or DELETE for push campaigns yet. We register list + get here so agents
  // can inspect campaign state after creation.

  server.tool(
    'amba_push_list_campaigns',
    'List push notification campaigns for a project, ordered by most recent. Returns name, title, body, segment_id, status, scheduled_at, and created_at.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/push/campaigns`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_push_get_campaign',
    'Get a single push campaign by ID including its current status (draft, scheduled, sending, sent, failed), schedule, and payload.',
    {
      project_id: z.string().describe('The project ID'),
      campaign_id: z.string().describe('The push campaign ID'),
    },
    async ({ project_id, campaign_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/push/campaigns/${campaign_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_push_update_campaign',
    'Update a push campaign before send. Only campaigns in `draft` or `scheduled` state are mutable; anything past that returns 409 ALREADY_SENT. If `scheduled_at` changes on a `scheduled` campaign, the existing Temporal workflow is terminated and re-started with the new startDelay. At least one editable field must be supplied.',
    {
      project_id: z.string().describe('The project ID'),
      campaign_id: z.string().describe('The push campaign ID'),
      title: z.string().optional().describe('New notification title.'),
      body: z.string().optional().describe('New notification body text.'),
      data: z.record(z.unknown()).optional().describe('New custom data payload (object).'),
      segment_id: z
        .string()
        .nullable()
        .optional()
        .describe('New target segment UUID, or null to broadcast to all users.'),
      scheduled_at: z
        .string()
        .optional()
        .describe(
          'New ISO-8601 send time. Must be in the future. Setting this on a draft promotes it to scheduled.',
        ),
    },
    async ({ project_id, campaign_id, title, body, data, segment_id, scheduled_at }) => {
      const payload: Record<string, unknown> = {};
      if (title !== undefined) payload.title = title;
      if (body !== undefined) payload.body = body;
      if (data !== undefined) payload.data = data;
      if (segment_id !== undefined) payload.segment_id = segment_id;
      if (scheduled_at !== undefined) payload.scheduled_at = scheduled_at;

      const result = await apiClient.patch(
        `/projects/${project_id}/push/campaigns/${campaign_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_push_delete_campaign',
    'Cancel and hard-delete a push campaign. Only campaigns in `draft` or `scheduled` state can be deleted; anything past that returns 409 ALREADY_SENT. Any pending Temporal workflow is terminated as part of the delete. Returns 204 No Content on success.',
    {
      project_id: z.string().describe('The project ID'),
      campaign_id: z.string().describe('The push campaign ID'),
    },
    async ({ project_id, campaign_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/push/campaigns/${campaign_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
