import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/scripts/migrate.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node22",
  sourcemap: true,
});
