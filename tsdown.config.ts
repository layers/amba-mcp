import { defineConfig } from 'tsdown';

// Single library entry — `@layers/amba-mcp` is consumed by the hosted
// MCP server at `mcp.amba.dev`, which exposes the tools over Streamable
// HTTP. There is no stdio binary; the hosted MCP is the only delivery
// vehicle.
//
// `hash: false` so emitted `.d.ts` filenames match the `package.json`
// `types` + `exports` references.
//
// Source maps are disabled so build artifacts don't embed source content.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: false,
  hash: false,
  clean: true,
  sourcemap: false,
});
