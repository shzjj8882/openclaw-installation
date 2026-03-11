import { spawn } from "child_process";
import { installExtensionDeps } from "./extensionDeps";

const CHANNEL_PLUGIN_PACKAGES: Record<string, string> = {
  feishu: "@openclaw/feishu",
  line: "@openclaw/line",
  msteams: "@openclaw/msteams",
  mattermost: "@openclaw/mattermost",
  matrix: "@openclaw/matrix",
  nostr: "@openclaw/nostr",
  zalo: "@openclaw/zalo",
  zalouser: "@openclaw/zalouser",
};

type ChannelConfig = { id: string; fieldValues?: Record<string, string | boolean> };
type ProgressFn = (progress: number, message: string) => void;
type RunFn = (args: string[], env?: NodeJS.ProcessEnv) => Promise<number>;
type ConfigSetFn = (p: string, v: string) => Promise<number>;

export const CHANNELS_NEED_PLUGIN = ["discord", "whatsapp", "slack", "feishu", "line", "msteams", "mattermost", "matrix", "signal", "imessage", "irc", "googlechat", "nostr", "bluebubbles", "zalo", "zalouser", "synology-chat", "tlon", "nextcloud-talk"];
export const POLICY_KEYS = ["dmPolicy", "groupPolicy", "requireMention"];
export const MENTION_CHANNELS = ["telegram", "whatsapp", "feishu", "line", "msteams", "mattermost"];

export function getChannelPluginPackage(id: string): string | undefined {
  return CHANNEL_PLUGIN_PACKAGES[id];
}

export async function setupChannelPlugin(
  ch: ChannelConfig,
  runOpenClaw: RunFn,
  pluginInstallEnv: NodeJS.ProcessEnv,
  sendProgress: ProgressFn
): Promise<void> {
  if (!CHANNELS_NEED_PLUGIN.includes(ch.id)) return;
  const pkg = getChannelPluginPackage(ch.id);
  if (pkg) {
    sendProgress(50, `正在安装 ${ch.id} 插件…`);
    await runOpenClaw(["plugins", "install", pkg], pluginInstallEnv);
  }
  if (ch.id === "feishu") {
    sendProgress(50, "正在安装飞书插件依赖…");
    await installExtensionDeps("feishu");
  }
  await runOpenClaw(["plugins", "enable", ch.id]);
}

export async function configureChannel(
  ch: ChannelConfig,
  base: string,
  runOpenClaw: RunFn,
  configSet: ConfigSetFn,
  sendProgress: ProgressFn
): Promise<Record<string, unknown>> {
  const fv = ch.fieldValues ?? {};
  if (ch.id === "feishu") {
    const appId = String(fv["app-id"] ?? "").trim();
    const appSecret = String(fv["app-secret"] ?? "").trim();
    const feishuEnv: NodeJS.ProcessEnv = {};
    if (appId) feishuEnv.FEISHU_APP_ID = appId;
    if (appSecret) feishuEnv.FEISHU_APP_SECRET = appSecret;
    await runOpenClaw(["channels", "add", "--channel", "feishu"], feishuEnv);
    if (appId && appSecret) {
      await configSet(`${base}.appId`, JSON.stringify(appId));
      await configSet(`${base}.appSecret`, JSON.stringify(appSecret));
    }
    await configSet(`${base}.groupPolicy`, JSON.stringify("open"));
    return { enabled: true, ...(appId && appSecret ? { appId, appSecret } : {}), connectionMode: "websocket", domain: "feishu", groupPolicy: "open" };
  }
  if (ch.id === "line") {
    const token = String(fv["channel-access-token"] ?? "").trim();
    const secret = String(fv["channel-secret"] ?? "").trim();
    if (token && secret) {
      await configSet(`${base}.channelAccessToken`, JSON.stringify(token));
      await configSet(`${base}.channelSecret`, JSON.stringify(secret));
    }
    return token && secret ? { enabled: true, channelAccessToken: token, channelSecret: secret } : { enabled: true };
  }
  if (ch.id === "msteams") {
    const appId = String(fv["app-id"] ?? "").trim();
    const appPassword = String(fv["app-password"] ?? "").trim();
    const tenantId = String(fv["tenant-id"] ?? "").trim();
    if (appId && appPassword && tenantId) {
      await configSet(`${base}.appId`, JSON.stringify(appId));
      await configSet(`${base}.appPassword`, JSON.stringify(appPassword));
      await configSet(`${base}.tenantId`, JSON.stringify(tenantId));
    }
    return appId && appPassword && tenantId ? { enabled: true, appId, appPassword, tenantId } : { enabled: true };
  }
  if (ch.id === "mattermost") {
    const botToken = String(fv["bot-token"] ?? "").trim();
    const baseUrl = String(fv["base-url"] ?? "").trim();
    if (botToken && baseUrl) {
      await configSet(`${base}.botToken`, JSON.stringify(botToken));
      await configSet(`${base}.baseUrl`, JSON.stringify(baseUrl));
    }
    return botToken && baseUrl ? { enabled: true, botToken, baseUrl } : { enabled: true };
  }
  const addArgs = ["channels", "add", "--channel", ch.id];
  for (const [k, v] of Object.entries(fv)) {
    if (POLICY_KEYS.includes(k)) continue;
    if (typeof v === "string" && v.trim()) addArgs.push(`--${k}`, v.trim());
    else if (typeof v === "boolean" && v) addArgs.push(`--${k}`);
  }
  await runOpenClaw(addArgs);
  return { enabled: true };
}
