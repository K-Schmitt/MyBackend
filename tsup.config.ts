import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

export default defineConfig({
  entry: ["src/index.ts", "src/scripts/migrate.ts", "src/scripts/set-admin.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node22",
  sourcemap: true,
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Keep npm packages external — they're installed at runtime in Docker.
  // Bundling better-auth/better-sqlite3 breaks internal require('../../package.json')
  // calls. The @/ path alias must NOT match so tsup still bundles our own src.
  external: [
    /^[^@./]/, // unscoped packages: hono, zod, better-auth …
    /^@[^/]/, // scoped packages: @hono/node-server … (excludes @/ alias)
  ],
});
