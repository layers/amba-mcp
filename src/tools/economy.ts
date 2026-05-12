import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client.js';

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  // ─── Currencies ──────────────────────────────────────────────────────

  server.tool(
    'amba_create_currency',
    'Create a virtual currency for a project. Currencies can be soft (earned through gameplay) or premium (purchased with real money). Supports auto-recharge for time-gated mechanics like hearts/energy.',
    {
      project_id: z.string().describe('The project ID'),
      code: z.string().describe('Unique currency code (e.g. "gold", "gems", "hearts")'),
      name: z.string().describe('Display name (e.g. "Gold Coins", "Gems", "Hearts")'),
      description: z.string().optional().describe('Description of the currency'),
      is_premium: z
        .boolean()
        .optional()
        .describe(
          'Whether this is a premium/hard currency (purchased with real money). Defaults to false.',
        ),
      initial_balance: z
        .number()
        .optional()
        .describe('Starting balance for new users. Defaults to 0.'),
      max_balance: z.number().optional().describe('Maximum balance cap (null for unlimited)'),
      auto_recharge_amount: z
        .number()
        .optional()
        .describe('Amount to auto-recharge (e.g. 1 heart every N hours)'),
      auto_recharge_interval_hours: z.number().optional().describe('Hours between auto-recharges'),
    },
    async ({
      project_id,
      code,
      name,
      description,
      is_premium,
      initial_balance,
      max_balance,
      auto_recharge_amount,
      auto_recharge_interval_hours,
    }) => {
      const payload: Record<string, unknown> = { code, name };
      if (description !== undefined) payload.description = description;
      if (is_premium !== undefined) payload.is_premium = is_premium;
      if (initial_balance !== undefined) payload.initial_balance = initial_balance;
      if (max_balance !== undefined) payload.max_balance = max_balance;
      if (auto_recharge_amount !== undefined) payload.auto_recharge_amount = auto_recharge_amount;
      if (auto_recharge_interval_hours !== undefined)
        payload.auto_recharge_interval_hours = auto_recharge_interval_hours;

      const result = await apiClient.post(`/projects/${project_id}/currencies`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_currencies',
    'List all virtual currency definitions for a project.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/currencies`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_grant_currency',
    'Grant virtual currency to a specific user. Useful for rewards, promotions, or admin adjustments.',
    {
      project_id: z.string().describe('The project ID'),
      app_user_id: z.string().describe('The user to grant currency to'),
      currency_code: z.string().describe('Currency code (e.g. "gold")'),
      amount: z.number().describe('Amount to grant (positive integer)'),
      reason: z.string().optional().describe('Reason for the grant (for audit trail)'),
    },
    async ({ project_id, app_user_id, currency_code, amount, reason }) => {
      const payload: Record<string, unknown> = { app_user_id, currency_code, amount };
      if (reason !== undefined) payload.reason = reason;

      const result = await apiClient.post(`/projects/${project_id}/currencies/grant`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Catalog ─────────────────────────────────────────────────────────

  server.tool(
    'amba_create_catalog_item',
    'Create a catalog item for a project. Items can be durable (owned forever), consumable (used up), or bundles (contain other items).',
    {
      project_id: z.string().describe('The project ID'),
      key: z
        .string()
        .describe('Unique item key (e.g. "premium_theme", "extra_life", "starter_pack")'),
      name: z.string().describe('Display name'),
      description: z.string().optional().describe('Item description'),
      icon_url: z.string().optional().describe('URL to the item icon'),
      category: z
        .string()
        .optional()
        .describe('Category for filtering (e.g. "themes", "powerups", "packs")'),
      tags: z.array(z.string()).optional().describe('Tags for filtering'),
      item_type: z
        .enum(['durable', 'consumable', 'bundle'])
        .optional()
        .describe('Item type. Defaults to "durable".'),
      metadata: z.record(z.unknown()).optional().describe('Additional metadata (JSONB)'),
    },
    async ({
      project_id,
      key,
      name,
      description,
      icon_url,
      category,
      tags,
      item_type,
      metadata,
    }) => {
      const payload: Record<string, unknown> = { key, name };
      if (description !== undefined) payload.description = description;
      if (icon_url !== undefined) payload.icon_url = icon_url;
      if (category !== undefined) payload.category = category;
      if (tags !== undefined) payload.tags = tags;
      if (item_type !== undefined) payload.item_type = item_type;
      if (metadata !== undefined) payload.metadata = metadata;

      const result = await apiClient.post(`/projects/${project_id}/catalog`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_list_catalog',
    'List all catalog items for a project, optionally filtered by category.',
    {
      project_id: z.string().describe('The project ID'),
      category: z.string().optional().describe('Filter by category'),
    },
    async ({ project_id, category }) => {
      const query: Record<string, string> = {};
      if (category) query.category = category;

      const result = await apiClient.get(`/projects/${project_id}/catalog`, query);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_set_item_price',
    'Set the price of a catalog item in a specific virtual currency.',
    {
      project_id: z.string().describe('The project ID'),
      catalog_item_id: z.string().describe('The catalog item ID'),
      currency_code: z.string().describe('Currency code (e.g. "gold", "gems")'),
      price: z.number().describe('Price in the specified currency'),
    },
    async ({ project_id, catalog_item_id, currency_code, price }) => {
      const result = await apiClient.post(
        `/projects/${project_id}/catalog/${catalog_item_id}/prices`,
        { currency_code, price },
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Stores ──────────────────────────────────────────────────────────

  server.tool(
    'amba_create_store',
    'Create a store for a project. Stores are curated subsets of the catalog, optionally targeted at specific user segments.',
    {
      project_id: z.string().describe('The project ID'),
      name: z.string().describe('Store name (e.g. "Main Shop", "Premium Store", "Daily Deals")'),
      description: z.string().optional().describe('Store description'),
      segment_id: z
        .string()
        .optional()
        .describe('Target segment ID (only users in this segment see the store)'),
    },
    async ({ project_id, name, description, segment_id }) => {
      const payload: Record<string, unknown> = { name };
      if (description !== undefined) payload.description = description;
      if (segment_id !== undefined) payload.segment_id = segment_id;

      const result = await apiClient.post(`/projects/${project_id}/stores`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_add_store_listing',
    'Add a catalog item to a store with optional price overrides, scheduling, and purchase limits.',
    {
      project_id: z.string().describe('The project ID'),
      store_id: z.string().describe('The store ID'),
      catalog_item_id: z.string().describe('The catalog item ID to list'),
      override_prices: z
        .record(z.number())
        .optional()
        .describe('Price overrides by currency code (e.g. {"gold": 50, "gems": 5})'),
      sort_order: z.number().optional().describe('Sort order in the store (lower = first)'),
      available_from: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the listing becomes available'),
      available_until: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the listing expires'),
      max_purchases_per_user: z
        .number()
        .optional()
        .describe('Maximum number of times each user can purchase this listing'),
    },
    async ({
      project_id,
      store_id,
      catalog_item_id,
      override_prices,
      sort_order,
      available_from,
      available_until,
      max_purchases_per_user,
    }) => {
      const payload: Record<string, unknown> = { catalog_item_id };
      if (override_prices !== undefined) payload.override_prices = override_prices;
      if (sort_order !== undefined) payload.sort_order = sort_order;
      if (available_from !== undefined) payload.available_from = available_from;
      if (available_until !== undefined) payload.available_until = available_until;
      if (max_purchases_per_user !== undefined)
        payload.max_purchases_per_user = max_purchases_per_user;

      const result = await apiClient.post(
        `/projects/${project_id}/stores/${store_id}/listings`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Inventory ───────────────────────────────────────────────────────

  server.tool(
    'amba_grant_item',
    "Grant a catalog item directly to a user's inventory. Bypasses the purchase flow.",
    {
      project_id: z.string().describe('The project ID'),
      app_user_id: z.string().describe('The user to grant the item to'),
      catalog_item_id: z.string().describe('The catalog item ID to grant'),
      quantity: z.number().optional().describe('Quantity to grant (default 1)'),
    },
    async ({ project_id, app_user_id, catalog_item_id, quantity }) => {
      const payload: Record<string, unknown> = { app_user_id, catalog_item_id };
      if (quantity !== undefined) payload.quantity = quantity;

      const result = await apiClient.post(`/projects/${project_id}/inventory/grant`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_user_inventory',
    "View a user's inventory including all owned items and quantities.",
    {
      project_id: z.string().describe('The project ID'),
      app_user_id: z.string().describe('The user ID to look up'),
    },
    async ({ project_id, app_user_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/inventory/${app_user_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Referrals ───────────────────────────────────────────────────────

  server.tool(
    'amba_create_referral_program',
    'Create a referral/promo code with configurable rewards for both referrer and referee. Rewards are granted as virtual currency.',
    {
      project_id: z.string().describe('The project ID'),
      code: z.string().optional().describe('Custom code (auto-generated if not provided)'),
      reward_referrer: z
        .record(z.unknown())
        .optional()
        .describe('Rewards for the referrer (e.g. {"gold": 100, "gems": 5})'),
      reward_referee: z
        .record(z.unknown())
        .optional()
        .describe('Rewards for the referee (e.g. {"gold": 50})'),
      max_uses: z.number().optional().describe('Maximum number of times this code can be used'),
    },
    async ({ project_id, code, reward_referrer, reward_referee, max_uses }) => {
      const payload: Record<string, unknown> = {};
      if (code !== undefined) payload.code = code;
      if (reward_referrer !== undefined) payload.reward_referrer = reward_referrer;
      if (reward_referee !== undefined) payload.reward_referee = reward_referee;
      if (max_uses !== undefined) payload.max_uses = max_uses;

      const result = await apiClient.post(`/projects/${project_id}/referrals`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_referral_stats',
    'Get stats for a specific referral code including total claims and claim history.',
    {
      project_id: z.string().describe('The project ID'),
      referral_code_id: z.string().describe('The referral code ID'),
    },
    async ({ project_id, referral_code_id }) => {
      const result = await apiClient.get(
        `/projects/${project_id}/referrals/${referral_code_id}/stats`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_referrals_list',
    'List all referral/promo codes for a project, newest first.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/referrals`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_referrals_patch',
    'Update a referral code. Only the supplied fields are changed; omitted fields are left untouched.',
    {
      project_id: z.string().describe('The project ID'),
      referral_code_id: z.string().describe('The referral code ID'),
      reward_referrer: z.record(z.unknown()).optional().describe('New rewards for the referrer'),
      reward_referee: z.record(z.unknown()).optional().describe('New rewards for the referee'),
      max_uses: z.number().optional().describe('New max usage cap'),
      is_active: z.boolean().optional().describe('Toggle whether the code is active'),
    },
    async ({
      project_id,
      referral_code_id,
      reward_referrer,
      reward_referee,
      max_uses,
      is_active,
    }) => {
      const payload: Record<string, unknown> = {};
      if (reward_referrer !== undefined) payload.reward_referrer = reward_referrer;
      if (reward_referee !== undefined) payload.reward_referee = reward_referee;
      if (max_uses !== undefined) payload.max_uses = max_uses;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(
        `/projects/${project_id}/referrals/${referral_code_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_referrals_delete',
    'Delete a referral code. Existing claim rows are preserved; the code can no longer be redeemed.',
    {
      project_id: z.string().describe('The project ID'),
      referral_code_id: z.string().describe('The referral code ID'),
    },
    async ({ project_id, referral_code_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/referrals/${referral_code_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Stores completion ──────────────────────────────────────────────

  server.tool(
    'amba_stores_list',
    'List all stores for a project, ordered by name.',
    {
      project_id: z.string().describe('The project ID'),
    },
    async ({ project_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/stores`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_stores_patch',
    'Update a store. Only the supplied fields are changed.',
    {
      project_id: z.string().describe('The project ID'),
      store_id: z.string().describe('The store ID'),
      name: z.string().optional().describe('New store name'),
      description: z.string().optional().describe('New store description'),
      is_active: z.boolean().optional().describe('Toggle store visibility'),
      segment_id: z
        .string()
        .optional()
        .describe('Target segment ID (only users in this segment see the store)'),
    },
    async ({ project_id, store_id, name, description, is_active, segment_id }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (is_active !== undefined) payload.is_active = is_active;
      if (segment_id !== undefined) payload.segment_id = segment_id;

      const result = await apiClient.patch(`/projects/${project_id}/stores/${store_id}`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_stores_delete',
    'Delete a store. Its listings are deleted as well; historical purchases are preserved.',
    {
      project_id: z.string().describe('The project ID'),
      store_id: z.string().describe('The store ID'),
    },
    async ({ project_id, store_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/stores/${store_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_stores_list_listings',
    'List all listings in a store, including the underlying catalog item details, ordered by sort_order.',
    {
      project_id: z.string().describe('The project ID'),
      store_id: z.string().describe('The store ID'),
    },
    async ({ project_id, store_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/stores/${store_id}/listings`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_stores_patch_listing',
    'Update a store listing (price overrides, sort order, availability window, purchase caps).',
    {
      project_id: z.string().describe('The project ID'),
      store_id: z.string().describe('The store ID'),
      listing_id: z.string().describe('The store listing ID'),
      override_prices: z
        .record(z.number())
        .optional()
        .describe('Price overrides by currency code (e.g. {"gold": 50})'),
      sort_order: z.number().optional().describe('New sort order'),
      available_from: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the listing becomes available'),
      available_until: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the listing expires'),
      max_purchases_per_user: z
        .number()
        .optional()
        .describe('Maximum number of times each user can purchase this listing'),
    },
    async ({
      project_id,
      store_id,
      listing_id,
      override_prices,
      sort_order,
      available_from,
      available_until,
      max_purchases_per_user,
    }) => {
      const payload: Record<string, unknown> = {};
      if (override_prices !== undefined) payload.override_prices = override_prices;
      if (sort_order !== undefined) payload.sort_order = sort_order;
      if (available_from !== undefined) payload.available_from = available_from;
      if (available_until !== undefined) payload.available_until = available_until;
      if (max_purchases_per_user !== undefined)
        payload.max_purchases_per_user = max_purchases_per_user;

      const result = await apiClient.patch(
        `/projects/${project_id}/stores/${store_id}/listings/${listing_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_stores_delete_listing',
    'Remove a listing from a store. The underlying catalog item is unaffected.',
    {
      project_id: z.string().describe('The project ID'),
      store_id: z.string().describe('The store ID'),
      listing_id: z.string().describe('The listing ID'),
    },
    async ({ project_id, store_id, listing_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/stores/${store_id}/listings/${listing_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Catalog single-item CRUD + bundle/price management ───────────────

  server.tool(
    'amba_get_catalog_item',
    'Fetch a single catalog item by ID, including its prices and any bundled content.',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The catalog item ID'),
    },
    async ({ project_id, item_id }) => {
      const result = await apiClient.get(`/projects/${project_id}/catalog/${item_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_update_catalog_item',
    'Partially update a catalog item. Only the supplied fields are touched.',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The catalog item ID'),
      name: z.string().optional().describe('Display name'),
      description: z.string().optional().describe('Item description'),
      icon_url: z.string().optional().describe('Item icon URL'),
      type: z
        .enum(['consumable', 'durable', 'currency_pack', 'bundle'])
        .optional()
        .describe('Item type'),
      metadata: z.record(z.unknown()).optional().describe('Custom metadata payload'),
      is_active: z.boolean().optional().describe('Whether the item is active'),
    },
    async ({ project_id, item_id, name, description, icon_url, type, metadata, is_active }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (icon_url !== undefined) payload.icon_url = icon_url;
      if (type !== undefined) payload.type = type;
      if (metadata !== undefined) payload.metadata = metadata;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(`/projects/${project_id}/catalog/${item_id}`, payload);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_catalog_item',
    'Delete a catalog item. Removes its prices and any bundle membership in the same transaction.',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The catalog item ID'),
    },
    async ({ project_id, item_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/catalog/${item_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_catalog_price',
    'Remove a single currency price from a catalog item. Other prices on the item remain.',
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The catalog item ID'),
      currency_code: z.string().describe('The currency code (e.g. "USD", "GEMS")'),
    },
    async ({ project_id, item_id, currency_code }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/catalog/${item_id}/prices/${encodeURIComponent(currency_code)}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_add_catalog_bundle_item',
    "Add a content item to a catalog item's bundle. The catalog item must be of type `bundle`.",
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The catalog item ID (must be a bundle)'),
      content_item_id: z.string().describe('The content item ID to bundle in'),
      quantity: z
        .number()
        .optional()
        .describe('How many of this content item the bundle grants (default 1)'),
    },
    async ({ project_id, item_id, content_item_id, quantity }) => {
      const payload: Record<string, unknown> = { content_item_id };
      if (quantity !== undefined) payload.quantity = quantity;

      const result = await apiClient.post(
        `/projects/${project_id}/catalog/${item_id}/bundle`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_remove_catalog_bundle_item',
    "Remove a content item from a catalog item's bundle.",
    {
      project_id: z.string().describe('The project ID'),
      item_id: z.string().describe('The catalog item ID (must be a bundle)'),
      content_item_id: z.string().describe('The content item ID to remove from the bundle'),
    },
    async ({ project_id, item_id, content_item_id }) => {
      const result = await apiClient.delete(
        `/projects/${project_id}/catalog/${item_id}/bundle/${content_item_id}`,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ─── Currency CRUD + transactions ─────────────────────────────────────

  server.tool(
    'amba_update_currency',
    'Partially update a virtual currency definition.',
    {
      project_id: z.string().describe('The project ID'),
      currency_id: z.string().describe('The currency ID'),
      name: z.string().optional().describe('Display name'),
      icon_url: z.string().optional().describe('Currency icon URL'),
      starting_balance: z
        .number()
        .optional()
        .describe('Starting balance granted on first user encounter'),
      max_balance: z.number().optional().describe('Maximum balance a user can hold'),
      is_active: z.boolean().optional().describe('Whether this currency is active'),
    },
    async ({
      project_id,
      currency_id,
      name,
      icon_url,
      starting_balance,
      max_balance,
      is_active,
    }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (icon_url !== undefined) payload.icon_url = icon_url;
      if (starting_balance !== undefined) payload.starting_balance = starting_balance;
      if (max_balance !== undefined) payload.max_balance = max_balance;
      if (is_active !== undefined) payload.is_active = is_active;

      const result = await apiClient.patch(
        `/projects/${project_id}/currencies/${currency_id}`,
        payload,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_delete_currency',
    'Delete a virtual currency definition. User balances and transaction history are NOT auto-cleaned — handle that explicitly if needed.',
    {
      project_id: z.string().describe('The project ID'),
      currency_id: z.string().describe('The currency ID'),
    },
    async ({ project_id, currency_id }) => {
      const result = await apiClient.delete(`/projects/${project_id}/currencies/${currency_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'amba_get_currency_transactions',
    "List currency transactions for a single user, newest first. Useful for inspecting a user's grant/spend history when investigating support requests or fraud.",
    {
      project_id: z.string().describe('The project ID'),
      user_id: z.string().describe('The app user ID'),
      currency_id: z.string().optional().describe('Filter to one currency'),
      limit: z.number().optional().describe('Page size'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
    async ({ project_id, user_id, currency_id, limit, offset }) => {
      const query: Record<string, string> = {};
      if (currency_id !== undefined) query.currency_id = currency_id;
      if (limit !== undefined) query.limit = String(limit);
      if (offset !== undefined) query.offset = String(offset);

      const result = await apiClient.get(
        `/projects/${project_id}/currencies/transactions/${user_id}`,
        query,
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
