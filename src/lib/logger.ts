import { createRequire } from "node:module";
import pino from "pino";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };
export const APP_VERSION: string = pkg.version;

// process.env read directly — cannot import env.ts here without creating a circular dependency
// (env.ts imports logger.ts for fatal-level boot errors)
const level = process.env.NODE_ENV === "test" ? "silent" : "info";

export const logger = pino(
  { level, base: { version: APP_VERSION } },
  process.env.NODE_ENV === "development" // same exception as above
    ? pino.transport({ target: "pino-pretty", options: { colorize: true } })
    : undefined,
);
