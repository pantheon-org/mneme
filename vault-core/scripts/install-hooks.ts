#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const CLAUDE_SETTINGS = join(homedir(), ".claude", "settings.json");
const _OPENCODE_CONFIG = join(homedir(), ".config", "opencode", "opencode.json");
const OPENCODE_PLUGIN_DIR = join(homedir(), ".config", "opencode", "plugins", "vault-core");

const SRC_DIR = resolve(import.meta.dir, "..", "packages", "hook-claude-code", "src");

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

// ── 1. Patch ~/.claude/settings.json ──────────────────────────────────────
interface ClaudeHookEntry {
  type: string;
  command: string;
}
interface ClaudeHookMatcher {
  matcher?: string;
  hooks: ClaudeHookEntry[];
}
interface ClaudeSettings {
  hooks?: {
    PostToolUse?: ClaudeHookMatcher[];
    Stop?: ClaudeHookEntry[];
  };
  [key: string]: unknown;
}

const claudeSettings = readJson<ClaudeSettings>(CLAUDE_SETTINGS, {});
if (!claudeSettings.hooks) claudeSettings.hooks = {};

console.log("Installing Claude Code hooks...");

const postToolCmd = `bun ${join(SRC_DIR, "post-tool.ts")}`;
const stopCmd = `bun ${join(SRC_DIR, "session-stop.ts")}`;

if (!claudeSettings.hooks.PostToolUse) claudeSettings.hooks.PostToolUse = [];
const postToolHooks = claudeSettings.hooks.PostToolUse;
const existingMatcher = postToolHooks.find((m) => m.matcher === "*");
if (existingMatcher) {
  const already = existingMatcher.hooks.some((h) => h.command === postToolCmd);
  if (!already) existingMatcher.hooks.push({ type: "command", command: postToolCmd });
} else {
  postToolHooks.push({ matcher: "*", hooks: [{ type: "command", command: postToolCmd }] });
}

if (!claudeSettings.hooks.Stop) claudeSettings.hooks.Stop = [];
const stopHooks = claudeSettings.hooks.Stop;
if (!stopHooks.some((h) => h.command === stopCmd)) {
  stopHooks.push({ type: "command", command: stopCmd });
}

writeJson(CLAUDE_SETTINGS, claudeSettings);
console.log(`  registered hooks → ${SRC_DIR}`);
console.log(`  patched ${CLAUDE_SETTINGS}`);

// ── 3. Install OpenCode plugin symlink ─────────────────────────────────────
console.log("Installing OpenCode plugin...");
const pluginSrc = resolve(import.meta.dir, "..", "packages", "plugin-opencode");
mkdirSync(dirname(OPENCODE_PLUGIN_DIR), { recursive: true });

if (!existsSync(OPENCODE_PLUGIN_DIR)) {
  const { symlinkSync } = await import("node:fs");
  symlinkSync(pluginSrc, OPENCODE_PLUGIN_DIR, "dir");
  console.log(`  linked ${pluginSrc} → ${OPENCODE_PLUGIN_DIR}`);
} else {
  console.log(`  plugin already installed at ${OPENCODE_PLUGIN_DIR}`);
}

console.log("Done.");
