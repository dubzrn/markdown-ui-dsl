import { posix } from "node:path";
import type { Io } from "./io.js";

export type FailOn = "error" | "warn" | "info" | "none";
export interface Config {
  failOn: FailOn;
  /** Project root for resolving includes/data files, relative to the working directory. */
  root: string;
  rules: Record<string, "off" | "info" | "warn" | "error">;
}

export class ConfigError extends Error {}

const KEYS = ["failOn", "root", "rules"];

export function loadConfig(io: Io, explicit: string | undefined): Config {
  const cfg: Config = { failOn: "error", root: ".", rules: {} };
  const path = posix.resolve(io.cwd, explicit ?? "mdui.config.json");
  const text = io.readFile(path);
  if (text === undefined) {
    if (explicit !== undefined) throw new ConfigError(`config file not found: ${explicit}`);
    return cfg;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ConfigError(`${explicit ?? "mdui.config.json"} is not valid JSON`);
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    throw new ConfigError("config must be a JSON object");
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(o))
    if (!KEYS.includes(k)) throw new ConfigError(`unknown config key "${k}"`);
  if (o["failOn"] !== undefined) {
    if (!["error", "warn", "info", "none"].includes(o["failOn"] as string))
      throw new ConfigError("failOn must be error|warn|info|none");
    cfg.failOn = o["failOn"] as FailOn;
  }
  if (o["root"] !== undefined) {
    if (typeof o["root"] !== "string") throw new ConfigError("root must be a string");
    cfg.root = o["root"];
  }
  if (o["rules"] !== undefined) {
    if (o["rules"] === null || typeof o["rules"] !== "object")
      throw new ConfigError("rules must be an object");
    for (const [id, v] of Object.entries(o["rules"] as Record<string, unknown>)) {
      if (!["off", "info", "warn", "error"].includes(v as string))
        throw new ConfigError(`rule "${id}": expected off|info|warn|error`);
      cfg.rules[id] = v as "off" | "info" | "warn" | "error";
    }
  }
  return cfg;
}
