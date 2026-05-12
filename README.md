# @layers/amba-mcp

Reusable Model Context Protocol (MCP) tool registry for [Amba](https://amba.dev) — the agent-native backend-as-a-service for mobile apps.

This package exposes ~178 MCP tools across ~17 groups (projects, push, segments, config, content, users, achievements, challenges, economy, leaderboards, platform, social, xp, events, auth, and more) that an AI agent can call against the Amba admin API.

It is the same registry consumed by the hosted MCP server at `mcp.amba.dev`.

## Install

```bash
npm install @layers/amba-mcp
```

## Usage

`@layers/amba-mcp` is a tool registry. It registers tools against an injected `McpServer` and `ApiClient`. It does NOT bootstrap a transport — your code does.

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools, createApiClient } from '@layers/amba-mcp';

const server = new McpServer({
  name: 'amba-mcp',
  version: '0.1.0',
});

const apiClient = createApiClient({
  baseUrl: 'https://api.amba.dev/v1/admin',
  token: process.env.AMBA_DEVELOPER_TOKEN,
});

registerAllTools(server, apiClient);

// Mount `server` behind any MCP transport (stdio, Streamable HTTP, SSE, ...).
```

### Authenticating

Every tool except the public auth tools (`amba_developer_signup`, `_login`, `_refresh`) requires a developer Bearer token. Pass it explicitly via `createApiClient({ token })`, or omit `token` to fall back to the CLI credential file at `~/.amba/credentials.json`.

For agent flows the recommended bootstrap is:

1. Call `amba_developer_signup` with no Authorization header to create an account. The response includes a long-lived Personal Access Token (`pat`) and a freshly provisioned project.
2. Pass the `pat` as the inbound Bearer on every subsequent MCP call.
3. Poll `amba_get_provisioning_status` until the project flips to `status='active'` (~10s) before issuing client-plane traffic.

## License

Apache-2.0
