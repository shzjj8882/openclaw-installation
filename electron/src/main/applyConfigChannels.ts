import path from "path";
import os from "os";
import fs from "fs";
import JSON5 from "json5";
import { spawn } from "child_process";
import { getOpenClawPathEnv } from "./openclawPaths";
import {
  CHANNELS_NEED_PLUGIN,
  POLICY_KEYS,
  MENTION_CHANNELS,
  setupChannelPlugin,
  configureChannel,
} from "./applyConfigChannelHandlers";

const NPM_PNPM_ONLY_KEYS = [
  "npm_config_shamefully_hoist",
  "npm_config_recursive",
  "NPM_CONFIG_SHAMEFULLY_HOIST",
  "NPM_CONFIG_RECURSIVE",
];

type ChannelConfig = { id: string; fieldValues?: Record<string, string | boolean> };
type ProgressFn = (progress: number, message: string) => void;

export async function configureChannels(
  channels: ChannelConfig[],
  sendProgress: ProgressFn
): Promise<void> {
  if (channels.length === 0) return;
  sendProgress(50, "正在配置频道…");

  const baseEnv = { ...process.env, PATH: getOpenClawPathEnv() } as NodeJS.ProcessEnv;
  const openclawPluginCache = path.join(os.homedir(), ".openclaw", ".plugin-npm-cache");
  try {
    fs.mkdirSync(openclawPluginCache, { recursive: true });
  } catch {
    // ignore
  }
  const pluginInstallEnv: NodeJS.ProcessEnv = {
    ...baseEnv,
    npm_config_cache: openclawPluginCache,
    NPM_CONFIG_CACHE: openclawPluginCache,
  };
  NPM_PNPM_ONLY_KEYS.forEach((k) => delete pluginInstallEnv[k]);

  const runOpenClaw = (subargs: string[], envOverride?: NodeJS.ProcessEnv) =>
    new Promise<number>((res) => {
      const env = envOverride ? { ...baseEnv, ...envOverride } : baseEnv;
      const c = spawn("openclaw", subargs, { env, stdio: ["ignore", "pipe", "pipe"] });
      c.on("close", (code) => res(code ?? 0));
    });
  const configSet = (p: string, value: string) => runOpenClaw(["config", "set", p, value, "--strict-json"]);

  const channelsToMerge: Record<string, Record<string, unknown>> = {};
  for (const ch of channels) {
    const fv = ch.fieldValues ?? {};
    await setupChannelPlugin(ch, runOpenClaw, pluginInstallEnv, sendProgress);
    const base = `channels.${ch.id}`;

    channelsToMerge[ch.id] = await configureChannel(ch, base, runOpenClaw, configSet, sendProgress);

    const dmPolicy = fv.dmPolicy;
    let groupPolicy = fv.groupPolicy;
    if (ch.id === "feishu" && (!groupPolicy || groupPolicy === "allowlist")) groupPolicy = "open";
    const requireMention = fv.requireMention;
    if (dmPolicy) await configSet(`${base}.dmPolicy`, JSON.stringify(dmPolicy));
    if (groupPolicy) await configSet(`${base}.groupPolicy`, JSON.stringify(groupPolicy));
    if (requireMention !== undefined && MENTION_CHANNELS.includes(ch.id)) {
      await configSet(`${base}.groups`, JSON.stringify({ "*": { requireMention: !!requireMention } }));
    }
    const merged = channelsToMerge[ch.id] ?? {};
    if (dmPolicy) merged.dmPolicy = dmPolicy;
    if (groupPolicy) merged.groupPolicy = groupPolicy;
    if (requireMention !== undefined && MENTION_CHANNELS.includes(ch.id)) merged.groups = { "*": { requireMention: !!requireMention } };
    channelsToMerge[ch.id] = merged;
  }

  const configPath = path.join(os.homedir(), ".openclaw", "openclaw.json");
  try {
    let cfg: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) cfg = JSON5.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
    const existing = (cfg.channels as Record<string, unknown>) ?? {};
    cfg.channels = { ...existing, ...channelsToMerge };
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
  } catch {
    // ignore
  }
}
