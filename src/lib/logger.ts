import pino from "pino";

declare const __APP_VERSION__: string;
export const APP_VERSION: string = __APP_VERSION__;

// process.env read directly — cannot import env.ts here without creating a circular dependency
// (env.ts imports logger.ts for fatal-level boot errors)
const level = process.env.NODE_ENV === "test" ? "silent" : "info";

export const logger = pino(
  { level, base: { version: APP_VERSION } },
  process.env.NODE_ENV === "development" // same exception as above
    ? pino.transport({ target: "pino-pretty", options: { colorize: true } })
    : undefined,
);
