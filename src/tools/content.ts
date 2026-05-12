import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

const contentItemSchema = z.object({
  title: z.string().optional().describe('Content item title'),
  body: z.string().describe('Content body text'),
  media_url: z.string().optional().describe('URL to associated media (image, video)'),
  category: z.string().optional().describe('Category for organizing content'),
  tags: z.array(z.string()).optional().describe('Tags for content filtering'),
  metadata: z.record(z.unknown()).optional().describe('Arbitrary metadata key-value pairs'),
  is_premium: z
    .boolean()
    .optional()
    .describe('Whether this content requires a premium entitlement'),
});

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.tool(
    'amba_create_content_library',
    'Create a content library for a project. A content library is a collection of content items (tips, quotes, articles) that can be delivered on a schedule to keep users engaged.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Library name (e.g. "Daily Motivation", "Workout Tips")'),
      description: z.string().optional().describe('Description of the library content'),
      content_schema: z
        .record(z.unknown())
        .optional()
        .describe('Optional JSON schema for validating content item metadata'),
    },
    async ({ project_id, name, description, content_schema }) => {
      const payload: Record<string, unknown> = { name };
      if (description !== undefined) payload.description = description;
      if (content_schema !== undefined) payload.content_schema = content_schema;

      const result = await apiClient.post(`/projects/${project_id}/content/libraries`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_add_content_items',
    'Add one or more content items to an existing content library. Items can include text, media URLs, categories, tags, and metadata.',
    {
      project_id: z.string().describe('The project ID'),
      library_id: z.string().describe('The content library ID'),
      items: z.array(contentItemSchema).describe('Array of content items to add'),
    },
    async ({ project_id, library_id, items }) => {
      const result = await apiClient.post(
        `/projects/${project_id}/content/libraries/${library_id}/items`,
        { items },
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_create_content_schedule',
    'Create a delivery schedule for a content library. Schedules control how and when content items are delivered to users (daily rotation, weekly, random, or sequential).',
    {
      project_id: z.string().describe('The project ID'),
      library_id: z.string().describe('The content library ID to schedule'),
      name: z.string().describe('Schedule name (e.g. "Morning Tip of the Day")'),
      schedule_type: z
        .enum(['daily_rotation', 'weekly', 'random', 'sequential'])
        .describe('How content items are selected for delivery'),
      config: z
        .record(z.unknown())
        .optional()
        .describe('Schedule-specific configuration (e.g. delivery time, timezone)'),
    },
    async ({ project_id, library_id, name, schedule_type, config }) => {
      const payload: Record<string, unknown> = { library_id, name, schedule_type };
      if (config !== undefined) payload.config = config;

      const result = await apiClient.post(`/projects/${project_id}/content/schedules`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_content_list_libraries',
    'List content libraries for a project.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/content/libraries`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_content_list_items',
    'List content items in a specific library. Supports pagination.',
    {
      project_id: z.string().describe('The project ID'),
      library_id: z.string().describe('The content library ID'),
      limit: z.number().optional().describe('Max results to return (default 50)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
    },
    async ({ project_id, library_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(
        `/projects/${project_id}/content/libraries/${library_id}/items`,
        query,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_content_list_schedules',
    'List all content delivery schedules for a project.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/content/schedules`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_content_delete_item',
    'Delete a single content item permanently. Historical deliveries referencing this item are preserved.',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The content item ID'),
    },
    async ({ project_id, item_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/content/items/${item_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_content_update_item',
    'Partially update a content item. Only the supplied fields are touched. Use this to edit body, title, metadata, or active state without recreating the row.',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The content item ID'),
      title: z.string().optional().describe('Item title'),
      body: z.string().optional().describe('Item body / payload text'),
      metadata: z.record(z.unknown()).optional().describe('Custom metadata'),
      tags: z.array(z.string()).optional().describe('Tag list (replaces existing tags)'),
      is_active: z.boolean().optional().describe('Whether the item is active'),
    },
    async ({ project_id, item_id, title, body, metadata, tags, is_active }) => {
      const payload: Record<string, unknown> = {};
      if (title !== undefined) payload.title = title;
      if (body !== undefined) payload.body = body;
      if (metadata !== undefined) payload.metadata = metadata;
      if (tags !== undefined) payload.tags = tags;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(
        `/projects/${project_id}/content/items/${item_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_content_update_schedule',
    'Partially update a content delivery schedule. Only the supplied fields are touched. Updating timing or targeting fields restarts the underlying Temporal cron schedule.',
    {
      project_id: z.string().describe('The project ID'),
      schedule_id: z.string().describe('The schedule ID'),
      name: z.string().optional().describe('Schedule name'),
      cron: z.string().optional().describe('Cron expression (5-field) for delivery timing'),
      timezone: z.string().optional().describe('IANA timezone (e.g. "America/Los_Angeles")'),
      segment_id: z
        .string()
        .nullable()
        .optional()
        .describe('Target segment, or null to broadcast to all users'),
      is_active: z.boolean().optional().describe('Whether the schedule is active'),
    },
    async ({ project_id, schedule_id, name, cron, timezone, segment_id, is_active }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (cron !== undefined) payload.cron = cron;
      if (timezone !== undefined) payload.timezone = timezone;
      if (segment_id !== undefined) payload.segment_id = segment_id;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(
        `/projects/${project_id}/content/schedules/${schedule_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_content_delete_schedule',
    'Delete a content delivery schedule. The underlying Temporal cron is terminated as part of the delete.',
    {
      project_id: z.string().describe('The project ID'),
      schedule_id: z.string().describe('The schedule ID'),
    },
    async ({ project_id, schedule_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/content/schedules/${schedule_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_content_bulk_import',
    'Bulk-import multiple content items into a library in a single transactional call. Each item is upsert-on-key within the library. Useful for seed data and for migrating from external content sources.',
    {
      project_id: z.string().describe('The project ID'),
      library_id: z.string().describe('The content library ID'),
      items: z
        .array(z.record(z.unknown()))
        .describe(
          'Array of content items to import. Each item should include `key`, `title`, `body`, and optional `metadata`, `tags`.',
        ),
    },
    async ({ project_id, library_id, items }) => {
      const result = await apiClient.post(
        `/projects/${project_id}/content/libraries/${library_id}/bulk`,
        { items },
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
