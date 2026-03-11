/**
 * OpenClaw 官方文档 URL
 * 参考：https://docs.openclaw.ai/zh-CN/
 */
const DOC_BASE = "https://docs.openclaw.ai/zh-CN";
const CHANNELS_BASE = `${DOC_BASE}/channels`;

/** 完成配置 / Gateway 配置文档 */
export const CONFIG_COMPLETE_DOC_URL = `${DOC_BASE}/gateway/configuration`;

/** 频道 ID -> 文档路径（部分频道文档路径可能与 id 不同） */
const CHANNEL_DOC_PATHS: Record<string, string> = {
  feishu: "feishu",
  telegram: "telegram",
  discord: "discord",
  whatsapp: "whatsapp",
  slack: "slack",
  line: "line",
  msteams: "msteams",
  mattermost: "mattermost",
  signal: "signal",
  imessage: "imessage",
  googlechat: "googlechat",
  irc: "irc",
  nostr: "nostr",
  matrix: "matrix",
  zalo: "zalo",
  "nextcloud-talk": "nextcloud-talk",
  bluebubbles: "bluebubbles",
  "synology-chat": "synology-chat",
  tlon: "tlon",
  zalouser: "zalouser",
};

/**
 * 获取指定频道的官方文档 URL，若无映射则按 id 拼接
 */
export function getChannelDocUrl(channelId: string): string {
  const path = CHANNEL_DOC_PATHS[channelId] ?? channelId;
  return `${CHANNELS_BASE}/${path}`;
}
