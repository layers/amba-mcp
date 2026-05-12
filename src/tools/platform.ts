import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  // ─── Onboarding ──────────────────────────────────────────────────────

  server.tool(
    'amba_create_onboarding_flow',
    'Create an onboarding flow for a project. Onboarding flows define step-by-step experiences for new users (e.g. welcome screens, permission prompts, feature tours).',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Flow name (e.g. "Welcome Flow", "Premium Onboarding")'),
      steps: z
        .array(
          z.object({
            id: z.string().describe('Unique step identifier'),
            title: z.string().describe('Step title'),
            description: z.string().describe('Step description'),
            type: z
              .string()
              .describe(
                'Step type (e.g. "welcome", "permission", "feature_tour", "personalization")',
              ),
            config: z.record(z.unknown()).optional().describe('Step-specific configuration'),
          }),
        )
        .describe('Ordered array of onboarding steps'),
      is_active: z.boolean().optional().describe('Whether the flow is active. Defaults to true.'),
    },
    async ({ project_id, name, steps, is_active }) => {
      const payload: Record<string, unknown> = { name, steps };
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.post(`/projects/${project_id}/onboarding/flows`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_onboarding_stats',
    'Get onboarding completion statistics for a project. Shows how many users started, completed, and skipped each flow.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/onboarding/stats`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_onboarding_list',
    'List all onboarding flows for a project. Returns flow id, name, steps config, and is_active.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/onboarding/flows`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_onboarding_get',
    'Get a single onboarding flow by id including its ordered steps.',
    {
      project_id: z.string().describe('The project ID'),
      flow_id: z.string().describe('The onboarding flow ID'),
    },
    async ({ project_id, flow_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/onboarding/flows/${flow_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_onboarding_update',
    'Update an onboarding flow. Any omitted fields are left unchanged. Pass `steps` to replace the step list.',
    {
      project_id: z.string().describe('The project ID'),
      flow_id: z.string().describe('The onboarding flow ID'),
      name: z.string().optional().describe('New flow name'),
      steps: z.array(z.record(z.unknown())).optional().describe('Replacement ordered step list'),
      is_active: z.boolean().optional().describe('Toggle whether the flow is active'),
    },
    async ({ project_id, flow_id, name, steps, is_active }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (steps !== undefined) payload.steps = steps;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(
        `/projects/${project_id}/onboarding/flows/${flow_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_onboarding_delete',
    'Delete an onboarding flow. Existing user onboarding records referencing this flow are preserved; no new users will enter the deleted flow.',
    {
      project_id: z.string().describe('The project ID'),
      flow_id: z.string().describe('The onboarding flow ID'),
    },
    async ({ project_id, flow_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/onboarding/flows/${flow_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Roles / RBAC ───────────────────────────────────────────────────

  server.tool(
    'amba_create_role',
    'Create a role with specific permissions for a project. Roles define what users can do (e.g. admin, moderator, premium). Permissions are string identifiers your app checks at runtime.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Role name (e.g. "admin", "moderator", "premium")'),
      description: z.string().optional().describe('Human-readable description of the role'),
      permissions: z
        .array(z.string())
        .describe(
          'Array of permission strings (e.g. ["content:write", "users:read", "moderation:manage"])',
        ),
    },
    async ({ project_id, name, description, permissions }) => {
      const payload: Record<string, unknown> = { name, permissions };
      if (description !== undefined) payload.description = description;

      const result = await apiClient.post(`/projects/${project_id}/roles`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_roles',
    'List all roles defined for a project.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/roles`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_assign_role',
    'Assign a role to an app user. The user will inherit all permissions defined on the role.',
    {
      project_id: z.string().describe('The project ID'),
      app_user_id: z.string().describe('The app user ID to assign the role to'),
      role_id: z.string().describe('The role ID to assign'),
    },
    async ({ project_id, app_user_id, role_id }) => {
      const result = await apiClient.post(`/projects/${project_id}/roles/assign`, {
        app_user_id,
        role_id,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Deep Links ─────────────────────────────────────────────────────

  server.tool(
    'amba_create_tracked_link',
    'Create a tracked deep link for a project. Tracked links have a short slug, destination URL, and optional campaign metadata. Click analytics are recorded automatically.',
    {
      project_id: z.string().describe('The project ID'),
      slug: z.string().describe('Short URL slug (e.g. "summer-promo", "onboarding-cta")'),
      destination_url: z.string().describe('The destination URL the link resolves to'),
      metadata: z
        .record(z.unknown())
        .optional()
        .describe(
          'Campaign metadata (e.g. { campaign: "summer", source: "email", medium: "newsletter" })',
        ),
    },
    async ({ project_id, slug, destination_url, metadata }) => {
      const payload: Record<string, unknown> = { slug, destination_url };
      if (metadata !== undefined) payload.metadata = metadata;

      const result = await apiClient.post(`/projects/${project_id}/deep-links/tracked`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_link_stats',
    'Get click analytics for a tracked link including total clicks, unique users, and clicks by platform.',
    {
      project_id: z.string().describe('The project ID'),
      link_id: z.string().describe('The tracked link ID'),
    },
    async ({ project_id, link_id }) => {
      const result = await apiClient.get(
        `/projects/${project_id}/deep-links/tracked/${link_id}/stats`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_deeplinks_list',
    'List tracked deep links for a project, newest first. Supports pagination.',
    {
      project_id: z.string().describe('The project ID'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/deep-links/tracked`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_deeplinks_delete',
    'Delete a tracked deep link. Historical click rows for the link are preserved.',
    {
      project_id: z.string().describe('The project ID'),
      link_id: z.string().describe('The tracked link ID'),
    },
    async ({ project_id, link_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/deep-links/tracked/${link_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_deeplinks_get_config',
    'Get the deep-link configuration (URL scheme, universal link domain, iOS/Android identifiers, fallback URL) for a project.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/deep-links/config`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_deeplinks_set_config',
    'Upsert the deep-link configuration (URL scheme, universal link domain, iOS/Android identifiers, fallback URL) for a project.',
    {
      project_id: z.string().describe('The project ID'),
      url_scheme: z.string().optional().describe('Custom URL scheme (e.g. "myapp")'),
      universal_link_domain: z
        .string()
        .optional()
        .describe('Universal link domain (e.g. "links.example.com")'),
      android_package_name: z.string().optional().describe('Android package name'),
      ios_bundle_id: z.string().optional().describe('iOS bundle identifier'),
      fallback_url: z
        .string()
        .optional()
        .describe('Fallback URL for users without the app installed'),
    },
    async ({
      project_id,
      url_scheme,
      universal_link_domain,
      android_package_name,
      ios_bundle_id,
      fallback_url,
    }) => {
      const payload: Record<string, unknown> = {};
      if (url_scheme !== undefined) payload.url_scheme = url_scheme;
      if (universal_link_domain !== undefined)
        payload.universal_link_domain = universal_link_domain;
      if (android_package_name !== undefined) payload.android_package_name = android_package_name;
      if (ios_bundle_id !== undefined) payload.ios_bundle_id = ios_bundle_id;
      if (fallback_url !== undefined) payload.fallback_url = fallback_url;

      const result = await apiClient.put(`/projects/${project_id}/deep-links/config`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Media Management ───────────────────────────────────────────────

  server.tool(
    'amba_upload_media',
    'Register a media asset and get a signed upload URL. After calling this, upload the file to the returned upload_url.',
    {
      project_id: z.string().describe('The project ID'),
      filename: z.string().describe('Original filename (e.g. "hero-banner.png")'),
      mime_type: z.string().describe('MIME type (e.g. "image/png", "video/mp4")'),
      size_bytes: z.number().optional().describe('File size in bytes'),
      folder_id: z.string().optional().describe('ID of the folder to place the asset in'),
      alt_text: z.string().optional().describe('Alt text for accessibility'),
      metadata: z.record(z.unknown()).optional().describe('Custom metadata'),
    },
    async ({ project_id, filename, mime_type, size_bytes, folder_id, alt_text, metadata }) => {
      const payload: Record<string, unknown> = { filename, mime_type };
      if (size_bytes !== undefined) payload.size_bytes = size_bytes;
      if (folder_id !== undefined) payload.folder_id = folder_id;
      if (alt_text !== undefined) payload.alt_text = alt_text;
      if (metadata !== undefined) payload.metadata = metadata;

      const result = await apiClient.post(`/projects/${project_id}/media`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_media',
    'List media assets for a project. Supports pagination and filtering by folder.',
    {
      project_id: z.string().describe('The project ID'),
      folder_id: z.string().optional().describe('Filter by folder ID'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, folder_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (folder_id) query.folder_id = folder_id;
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/media`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_media_delete',
    'Delete a media asset. This removes the DB row; the underlying object in storage is garbage-collected separately.',
    {
      project_id: z.string().describe('The project ID'),
      asset_id: z.string().describe('The media asset ID'),
    },
    async ({ project_id, asset_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/media/${asset_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_media_create_folder',
    'Create a media folder for organizing assets. Folders can be nested via `parent_id`.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Folder name'),
      parent_id: z.string().optional().describe('Parent folder ID. Omit for a top-level folder.'),
    },
    async ({ project_id, name, parent_id }) => {
      const payload: Record<string, unknown> = { name };
      if (parent_id !== undefined) payload.parent_id = parent_id;

      const result = await apiClient.post(`/projects/${project_id}/media/folders`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_media_list_folders',
    'List media folders for a project. Pass `parent_id` to list children of a specific folder; omit to list top-level folders.',
    {
      project_id: z.string().describe('The project ID'),
      parent_id: z.string().optional().describe('Parent folder ID. Omit for top-level folders.'),
    },
    async ({ project_id, parent_id }) => {
      const query: Record<string, string> = {};
      if (parent_id) query.parent_id = parent_id;

      const result = await apiClient.get(`/projects/${project_id}/media/folders`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_media_delete_folder',
    'Delete a media folder. Assets inside the folder are not deleted; their folder_id is left dangling and should be reassigned before calling this tool.',
    {
      project_id: z.string().describe('The project ID'),
      folder_id: z.string().describe('The media folder ID'),
    },
    async ({ project_id, folder_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/media/folders/${folder_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Content Moderation ─────────────────────────────────────────────

  server.tool(
    'amba_get_moderation_queue',
    'Get the content moderation queue for a project. Shows reported content pending review.',
    {
      project_id: z.string().describe('The project ID'),
      status: z
        .enum(['pending', 'approved', 'rejected', 'escalated'])
        .optional()
        .describe('Filter by status. Defaults to "pending".'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
    },
    async ({ project_id, status, limit }) => {
      const query: Record<string, string> = {};
      if (status) query.status = status;
      if (limit !== undefined) query.limit = String(limit);

      const result = await apiClient.get(`/projects/${project_id}/moderation/queue`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_configure_moderation',
    'Create a moderation rule for a project. Rules can auto-filter content based on keywords, regex patterns, or auto-approve trusted users.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Rule name (e.g. "Profanity Filter", "Spam Detection")'),
      rule_type: z
        .enum(['keyword_filter', 'regex', 'auto_approve_trusted'])
        .describe('Type of moderation rule'),
      config: z
        .record(z.unknown())
        .describe(
          'Rule configuration (e.g. { keywords: ["spam", "scam"] } for keyword_filter, { pattern: "\\\\b(buy now)\\\\b" } for regex)',
        ),
      is_active: z.boolean().optional().describe('Whether the rule is active. Defaults to true.'),
    },
    async ({ project_id, name, rule_type, config, is_active }) => {
      const payload: Record<string, unknown> = { name, rule_type, config };
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.post(`/projects/${project_id}/moderation/rules`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_moderation_queue_list',
    'List moderation queue items for a project, filtered by status. Pagination via limit+offset.',
    {
      project_id: z.string().describe('The project ID'),
      status: z
        .enum(['pending', 'approved', 'rejected', 'escalated'])
        .optional()
        .describe('Queue status filter. Defaults to "pending".'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, status, limit, offset }) => {
      const query: Record<string, string> = {};
      if (status) query.status = status;
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/moderation/queue`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_moderation_queue_approve',
    'Approve a moderation-queue item. The item transitions to status="approved" and the reported content stays visible.',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The moderation queue item ID'),
    },
    async ({ project_id, item_id }) => {
      const result = await apiClient.post(
        `/projects/${project_id}/moderation/queue/${item_id}/approve`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_moderation_queue_reject',
    'Reject a moderation-queue item. The item transitions to status="rejected" — your app should treat the reported content as removed.',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The moderation queue item ID'),
    },
    async ({ project_id, item_id }) => {
      const result = await apiClient.post(
        `/projects/${project_id}/moderation/queue/${item_id}/reject`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_moderation_queue_escalate',
    'Escalate a moderation-queue item for senior review. Transitions the item to status="escalated".',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The moderation queue item ID'),
    },
    async ({ project_id, item_id }) => {
      const result = await apiClient.post(
        `/projects/${project_id}/moderation/queue/${item_id}/escalate`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Roles completion (patch / delete / revoke / list-users) ─────────

  server.tool(
    'amba_roles_patch',
    "Update a role's name, description, or permission list. Only the supplied fields are changed.",
    {
      project_id: z.string().describe('The project ID'),
      role_id: z.string().describe('The role ID'),
      name: z.string().optional().describe('New role name'),
      description: z.string().optional().describe('New description'),
      permissions: z
        .array(z.string())
        .optional()
        .describe('Replacement array of permission strings'),
    },
    async ({ project_id, role_id, name, description, permissions }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (permissions !== undefined) payload.permissions = permissions;

      const result = await apiClient.patch(`/projects/${project_id}/roles/${role_id}`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_roles_delete',
    'Delete a role. Users currently assigned to the role lose that assignment via cascade.',
    {
      project_id: z.string().describe('The project ID'),
      role_id: z.string().describe('The role ID'),
    },
    async ({ project_id, role_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/roles/${role_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_roles_revoke',
    'Revoke a role from an app user. The user loses the permissions that were only granted by this role.',
    {
      project_id: z.string().describe('The project ID'),
      app_user_id: z.string().describe('The app user ID'),
      role_id: z.string().describe('The role ID to revoke'),
    },
    async ({ project_id, app_user_id, role_id }) => {
      const result = await apiClient.post(`/projects/${project_id}/roles/revoke`, {
        app_user_id,
        role_id,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_roles_list_users',
    'List all users currently assigned to a specific role.',
    {
      project_id: z.string().describe('The project ID'),
      role_id: z.string().describe('The role ID'),
    },
    async ({ project_id, role_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/roles/${role_id}/users`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Messaging admin ─────────────────────────────────────────────────

  server.tool(
    'amba_messaging_list_conversations',
    'List message conversations for a project, newest first. Pagination via limit+offset.',
    {
      project_id: z.string().describe('The project ID'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/messaging/conversations`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_messaging_list_messages',
    'List messages within a single conversation, ordered by send time.',
    {
      project_id: z.string().describe('The project ID'),
      conversation_id: z.string().describe('The conversation ID'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, conversation_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(
        `/projects/${project_id}/messaging/conversations/${conversation_id}/messages`,
        query,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_messaging_delete_message',
    'Delete a single message permanently.',
    {
      project_id: z.string().describe('The project ID'),
      message_id: z.string().describe('The message ID'),
    },
    async ({ project_id, message_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/messaging/messages/${message_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Moderation rules + trust completion ──────────────────────────────

  server.tool(
    'amba_moderation_list_rules',
    'List moderation rule definitions. Rules drive automatic flag/escalate behavior on inbound content (feed posts, messages, reviews).',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/moderation/rules`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_moderation_update_rule',
    'Partially update a moderation rule. Only the supplied fields are touched.',
    {
      project_id: z.string().describe('The project ID'),
      rule_id: z.string().describe('The moderation rule ID'),
      name: z.string().optional().describe('Rule display name'),
      description: z.string().optional().describe('Rule description'),
      pattern: z.string().optional().describe('Match pattern (regex or keyword list)'),
      action: z
        .enum(['flag', 'block', 'escalate'])
        .optional()
        .describe('Action to take when the rule fires'),
      is_active: z.boolean().optional().describe('Whether the rule is active'),
    },
    async ({ project_id, rule_id, name, description, pattern, action, is_active }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (pattern !== undefined) payload.pattern = pattern;
      if (action !== undefined) payload.action = action;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(
        `/projects/${project_id}/moderation/rules/${rule_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_moderation_delete_rule',
    'Delete a moderation rule. New content will no longer be evaluated against this rule.',
    {
      project_id: z.string().describe('The project ID'),
      rule_id: z.string().describe('The moderation rule ID'),
    },
    async ({ project_id, rule_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/moderation/rules/${rule_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_moderation_list_trust',
    'List user trust scores. Useful to see who is currently trusted/untrusted by the moderation system.',
    {
      project_id: z.string().describe('The project ID'),
      min_score: z.number().optional().describe('Minimum trust score filter'),
      max_score: z.number().optional().describe('Maximum trust score filter'),
      limit: z.number().optional().describe('Page size'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
    async ({ project_id, min_score, max_score, limit, offset }) => {
      const query: Record<string, string> = {};
      if (min_score !== undefined) query.min_score = String(min_score);
      if (max_score !== undefined) query.max_score = String(max_score);
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/moderation/trust`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_moderation_set_trust',
    'Set or upsert a user trust score. Higher scores reduce moderation friction; lower scores raise it.',
    {
      project_id: z.string().describe('The project ID'),
      user_id: z.string().describe('The app user ID'),
      score: z.number().describe('Trust score (typically 0-100)'),
      reason: z.string().optional().describe('Optional human-readable reason for the change'),
    },
    async ({ project_id, user_id, score, reason }) => {
      const payload: Record<string, unknown> = { user_id, score };
      if (reason !== undefined) payload.reason = reason;

      const result = await apiClient.post(`/projects/${project_id}/moderation/trust`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
