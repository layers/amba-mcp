import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  // ─── Friendships ───────────────────────────────────────────────────

  server.tool(
    'amba_get_friendship_stats',
    'Get friendship statistics for a project. Returns total friendships, pending requests, accepted friendships, and blocked count.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/friends/stats`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Groups ────────────────────────────────────────────────────────

  server.tool(
    'amba_create_group',
    'Create a group (guild) within a project. Groups let users form communities, with configurable visibility and max members.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Group name'),
      owner_id: z.string().describe('The app_user ID who will own this group'),
      description: z.string().optional().describe('Group description'),
      avatar_url: z.string().optional().describe('URL for the group avatar'),
      is_public: z
        .boolean()
        .optional()
        .describe('Whether the group is publicly joinable (default true)'),
      max_members: z.number().optional().describe('Maximum number of members (default 100)'),
      metadata: z.record(z.unknown()).optional().describe('Arbitrary metadata key-value pairs'),
    },
    async ({
      project_id,
      name,
      owner_id,
      description,
      avatar_url,
      is_public,
      max_members,
      metadata,
    }) => {
      const payload: Record<string, unknown> = { name, owner_id };
      if (description !== undefined) payload.description = description;
      if (avatar_url !== undefined) payload.avatar_url = avatar_url;
      if (is_public !== undefined) payload.is_public = is_public;
      if (max_members !== undefined) payload.max_members = max_members;
      if (metadata !== undefined) payload.metadata = metadata;

      const result = await apiClient.post(`/projects/${project_id}/groups`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_groups',
    'List all groups in a project. Returns groups with member counts, ordered by name.',
    {
      project_id: z.string().describe('The project ID'),
      limit: z.number().optional().describe('Max number of groups to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/groups`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Activity Feeds ────────────────────────────────────────────────

  server.tool(
    'amba_create_feed_rule',
    'Create a feed generation rule. When the specified engagement event occurs, a feed item is automatically created with the given action.',
    {
      project_id: z.string().describe('The project ID'),
      source_event: z
        .string()
        .describe(
          'The engagement event name that triggers feed item creation (e.g. "streak_milestone", "achievement_unlocked")',
        ),
      action: z
        .string()
        .describe('The action string to use in the feed item (e.g. "reached_streak_milestone")'),
      target_type: z.string().optional().describe('Optional target type for the feed item'),
    },
    async ({ project_id, source_event, action, target_type }) => {
      const payload: Record<string, unknown> = { source_event, action };
      if (target_type !== undefined) payload.target_type = target_type;

      const result = await apiClient.post(`/projects/${project_id}/feeds/rules`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_feeds_list_rules',
    'List all feed generation rules for a project, ordered by source_event.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/feeds/rules`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_feeds_patch_rule',
    'Update a feed rule. Omitted fields are left unchanged.',
    {
      project_id: z.string().describe('The project ID'),
      rule_id: z.string().describe('The feed rule ID'),
      source_event: z.string().optional().describe('New source engagement event name'),
      action: z.string().optional().describe('New action string for generated feed items'),
      target_type: z.string().optional().describe('New target type'),
      is_active: z.boolean().optional().describe('Toggle whether the rule is active'),
    },
    async ({ project_id, rule_id, source_event, action, target_type, is_active }) => {
      const payload: Record<string, unknown> = {};
      if (source_event !== undefined) payload.source_event = source_event;
      if (action !== undefined) payload.action = action;
      if (target_type !== undefined) payload.target_type = target_type;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(
        `/projects/${project_id}/feeds/rules/${rule_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_feeds_delete_rule',
    'Delete a feed rule. Existing feed items generated by the rule are preserved.',
    {
      project_id: z.string().describe('The project ID'),
      rule_id: z.string().describe('The feed rule ID'),
    },
    async ({ project_id, rule_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/feeds/rules/${rule_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Messaging ─────────────────────────────────────────────────────

  server.tool(
    'amba_get_messaging_stats',
    'Get in-app messaging statistics for a project. Returns total conversations, total messages, and active conversations in the last 24 hours.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/messaging/stats`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Reviews & Ratings ─────────────────────────────────────────────

  server.tool(
    'amba_get_review_stats',
    'Get review and rating statistics for a project. Returns total reviews, average rating, pending approvals, and rating distribution.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/reviews/stats`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_reviews_list',
    'List reviews for a project, newest first. Supports pagination and filtering by approval status.',
    {
      project_id: z.string().describe('The project ID'),
      is_approved: z
        .boolean()
        .optional()
        .describe('Filter to approved (true) or pending (false) reviews. Omit for all.'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, is_approved, limit, offset }) => {
      const query: Record<string, string> = {};
      if (is_approved !== undefined) query.is_approved = String(is_approved);
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/reviews`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_reviews_patch',
    'Approve or unapprove a review by toggling `is_approved`. Unapproved reviews are hidden from public listings.',
    {
      project_id: z.string().describe('The project ID'),
      review_id: z.string().describe('The review ID'),
      is_approved: z.boolean().describe('True to approve, false to hide'),
    },
    async ({ project_id, review_id, is_approved }) => {
      const result = await apiClient.patch(`/projects/${project_id}/reviews/${review_id}`, {
        is_approved,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_reviews_delete',
    'Delete a review permanently.',
    {
      project_id: z.string().describe('The project ID'),
      review_id: z.string().describe('The review ID'),
    },
    async ({ project_id, review_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/reviews/${review_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_reviews_list_items',
    'List reviewable items for a project, ordered by average rating. Use this to see aggregate ratings per reviewable entity.',
    {
      project_id: z.string().describe('The project ID'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/reviews/items`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_reviews_export',
    'Export reviews for a project as CSV (default) or NDJSON. Streams via DB cursor on the API side. Filters: `since` (created_at lower bound), `rating_min`/`rating_max` (1-5). The MCP tool reads back at most ~1 MiB; for very large tenants prefer `format: "ndjson"` and narrow with rating + since filters. The returned `truncated` flag indicates whether the body was clipped.',
    {
      project_id: z.string().describe('The project ID'),
      format: z
        .enum(['csv', 'ndjson'])
        .optional()
        .describe('Response format. Default csv. Recommend ndjson for parsability.'),
      since: z.string().optional().describe('ISO-8601 lower bound on `created_at`.'),
      rating_min: z.number().int().min(1).max(5).optional().describe('Minimum star rating (1-5).'),
      rating_max: z.number().int().min(1).max(5).optional().describe('Maximum star rating (1-5).'),
    },
    async ({ project_id, format, since, rating_min, rating_max }) => {
      const query: Record<string, string> = {};
      if (format !== undefined) query.format = format;
      if (since !== undefined) query.since = since;
      if (rating_min !== undefined) query.rating_min = String(rating_min);
      if (rating_max !== undefined) query.rating_max = String(rating_max);

      const { body, truncated, contentType } = await apiClient.getRaw(
        `/projects/${project_id}/reviews/export`,
        query,
      );
      const header = `# format=${format ?? 'csv'} truncated=${truncated} content-type=${contentType ?? 'unknown'}\n`;
      return { content: [{ type: 'text', text: header + body }] };
    },
  );

  // ─── Friends + groups + feeds completion ──────────────────────────────

  server.tool(
    'amba_list_friendships',
    'List friendship rows for a project. Filter by status, user, or recency. Useful for moderation and engagement analytics.',
    {
      project_id: z.string().describe('The project ID'),
      status: z
        .enum(['pending', 'accepted', 'blocked'])
        .optional()
        .describe('Filter by friendship status'),
      user_id: z.string().optional().describe('Filter to friendships involving this app user'),
      limit: z.number().optional().describe('Page size (default 50)'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
    async ({ project_id, status, user_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (status !== undefined) query.status = status;
      if (user_id !== undefined) query.user_id = user_id;
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/friends`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_friendship',
    'Delete a friendship row. Used for moderation or cleanup. Idempotent.',
    {
      project_id: z.string().describe('The project ID'),
      friendship_id: z.string().describe('The friendship ID'),
    },
    async ({ project_id, friendship_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/friends/${friendship_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_update_group',
    'Partially update a group definition. Only the supplied fields are touched.',
    {
      project_id: z.string().describe('The project ID'),
      group_id: z.string().describe('The group ID'),
      name: z.string().optional().describe('Group name'),
      description: z.string().optional().describe('Group description'),
      avatar_url: z.string().optional().describe('Group avatar URL'),
      is_public: z.boolean().optional().describe('Whether the group is publicly joinable'),
      max_members: z.number().optional().describe('Maximum members allowed'),
      metadata: z.record(z.unknown()).optional().describe('Arbitrary metadata'),
    },
    async ({
      project_id,
      group_id,
      name,
      description,
      avatar_url,
      is_public,
      max_members,
      metadata,
    }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (avatar_url !== undefined) payload.avatar_url = avatar_url;
      if (is_public !== undefined) payload.is_public = is_public;
      if (max_members !== undefined) payload.max_members = max_members;
      if (metadata !== undefined) payload.metadata = metadata;

      const result = await apiClient.patch(`/projects/${project_id}/groups/${group_id}`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_group',
    'Delete a group. All membership rows for the group are also removed.',
    {
      project_id: z.string().describe('The project ID'),
      group_id: z.string().describe('The group ID'),
    },
    async ({ project_id, group_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/groups/${group_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_group_members',
    'List members of a single group, with their join timestamps and roles.',
    {
      project_id: z.string().describe('The project ID'),
      group_id: z.string().describe('The group ID'),
      limit: z.number().optional().describe('Page size'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
    async ({ project_id, group_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(
        `/projects/${project_id}/groups/${group_id}/members`,
        query,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_update_group_member',
    "Update a group member's role or metadata. Use this to promote/demote members or amend their custom data.",
    {
      project_id: z.string().describe('The project ID'),
      group_id: z.string().describe('The group ID'),
      member_id: z.string().describe('The membership row ID'),
      role: z
        .enum(['member', 'moderator', 'owner'])
        .optional()
        .describe('Member role within the group'),
      metadata: z.record(z.unknown()).optional().describe('Custom metadata'),
    },
    async ({ project_id, group_id, member_id, role, metadata }) => {
      const payload: Record<string, unknown> = {};
      if (role !== undefined) payload.role = role;
      if (metadata !== undefined) payload.metadata = metadata;

      const result = await apiClient.patch(
        `/projects/${project_id}/groups/${group_id}/members/${member_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_remove_group_member',
    'Remove a member from a group (kick or self-leave).',
    {
      project_id: z.string().describe('The project ID'),
      group_id: z.string().describe('The group ID'),
      member_id: z.string().describe('The membership row ID'),
    },
    async ({ project_id, group_id, member_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/groups/${group_id}/members/${member_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_feeds_list_items',
    'List feed items in a project. Useful for moderation review or analytics.',
    {
      project_id: z.string().describe('The project ID'),
      user_id: z.string().optional().describe('Filter to feed items posted by this user'),
      since: z.string().optional().describe('ISO 8601 lower-bound timestamp'),
      limit: z.number().optional().describe('Page size'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
    async ({ project_id, user_id, since, limit, offset }) => {
      const query: Record<string, string> = {};
      if (user_id !== undefined) query.user_id = user_id;
      if (since !== undefined) query.since = since;
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(`/projects/${project_id}/feeds/items`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_feeds_delete_item',
    'Delete a feed item. Used for moderation. Hard delete — the row is removed.',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The feed item ID'),
    },
    async ({ project_id, item_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/feeds/items/${item_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
