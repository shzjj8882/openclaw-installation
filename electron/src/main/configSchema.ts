/**
 * 从 openclaw channels add --help 解析频道配置
 * 每个选项根据描述解析适用的频道，生成 fields，由 schema 驱动 UI 组件
 */

export interface ChannelFieldSpec {
  flag: string;
  label: string;
  type: "password" | "text" | "url" | "boolean";
  required: boolean;
  placeholder?: string;
  /** 选项型（Select 下拉） */
  options?: { value: string; label: string }[];
}

export interface ChannelOption {
  id: string;
  name: string;
  /** 该频道需要的配置项，由 CLI 解析生成 */
  fields: ChannelFieldSpec[];
  /** 是否支持群组（可配置 dmPolicy、groupPolicy、requireMention） */
  hasGroups: boolean;
}

export interface SkillOption {
  name: string;
  description: string;
  eligible: boolean;
}

/** 从选项描述解析适用的频道 ID */
function parseChannelsFromDesc(flag: string, desc: string): string[] {
  const d = desc.toLowerCase();
  if (flag === "token" && /telegram|discord/i.test(d)) return ["telegram", "discord"];
  if ((flag === "bot-token" || flag === "app-token") && /slack/i.test(d)) return ["slack"];
  if (/telegram/i.test(d) && /token|file/i.test(flag)) return ["telegram"];
  if (/discord/i.test(d)) return ["discord"];
  if (/slack/i.test(d)) return ["slack"];
  if (/whatsapp/i.test(d)) return ["whatsapp"];
  if (/google chat|googlechat/i.test(d)) return ["googlechat"];
  if (/matrix/i.test(d)) return ["matrix"];
  if (/bluebubbles|blubbles/i.test(d)) return ["bluebubbles"];
  if (/signal/i.test(d)) return ["signal"];
  if (/imessage|imsg/i.test(d)) return ["imessage"];
  if (/mattermost/i.test(d)) return ["mattermost"];
  if (/msteams|microsoft teams/i.test(d)) return ["msteams"];
  if (/line/i.test(d)) return ["line"];
  if (/feishu|lark/i.test(d)) return ["feishu"];
  if (/irc/i.test(d)) return ["irc"];
  if (/nostr/i.test(d)) return ["nostr"];
  if (/tlon|urbit/i.test(d)) return ["tlon"];
  if (/zalo/i.test(d) && /personal|user/i.test(d)) return ["zalouser"];
  if (/zalo/i.test(d)) return ["zalo"];
  if (/nextcloud/i.test(d)) return ["nextcloud-talk"];
  if (/synology/i.test(d)) return ["synology-chat"];
  return [];
}

/** 解析 channels add help，生成 flag -> { label, type, channelIds, options? } */
function parseChannelOptionsFromHelp(helpText: string): Map<string, { label: string; type: "password" | "text" | "url"; channelIds: string[]; options?: { value: string; label: string }[] }> {
  const result = new Map<string, { label: string; type: "password" | "text" | "url"; channelIds: string[]; options?: { value: string; label: string }[] }>();
  const lines = helpText.split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*--([a-z0-9-]+)\s+<[^>]+>\s+(.+)/);
    if (!m) continue;
    const flag = m[1];
    const desc = m[2].trim();
    const channelIds = parseChannelsFromDesc(flag, desc);
    const isSecret = /token|password|key|secret/i.test(flag) || /token|password|key/i.test(desc);
    let type: "password" | "text" | "url" = isSecret ? "password" : "text";
    if (flag.includes("url") || flag.includes("webhook") || /url|webhook/i.test(desc)) type = "url";
    let options: { value: string; label: string }[] | undefined;
    const optMatch = desc.match(/\(([^)]+)\)/);
    if (optMatch && /[a-z]/i.test(optMatch[1]) && !/telegram|discord|slack|xoxb|xapp/i.test(optMatch[1])) {
      const parts = optMatch[1].split("|");
      if (parts.length >= 2 && parts.every((p) => p.length < 30)) {
        options = parts.map((o) => {
          const v = o.trim().toLowerCase().replace(/\s+/g, "-");
          return { value: v, label: o.trim() };
        });
      }
    }
    result.set(flag, { label: desc.replace(/\s*\([^)]*\)\s*$/, "").trim(), type, channelIds, options });
  }
  return result;
}

/** openclaw onboard 交互式选择的频道友好名称（与 CLI --channel 值对应） */
const CHANNEL_DISPLAY_NAMES: Record<string, string> = {
  telegram: "Telegram (Bot API)",
  whatsapp: "WhatsApp (QR link)",
  discord: "Discord (Bot API)",
  irc: "IRC (Server + Nick)",
  googlechat: "Google Chat (Chat API)",
  slack: "Slack (Socket Mode)",
  signal: "Signal (signal-cli)",
  imessage: "iMessage (imsg)",
  line: "LINE (Messaging API)",
  feishu: "Feishu/Lark (飞书)",
  nostr: "Nostr (NIP-04 DMs)",
  msteams: "Microsoft Teams (Bot Framework)",
  mattermost: "Mattermost (plugin)",
  "nextcloud-talk": "Nextcloud Talk (self-hosted)",
  matrix: "Matrix (plugin)",
  bluebubbles: "BlueBubbles (macOS app)",
  zalo: "Zalo (Bot API)",
  zalouser: "Zalo (Personal Account)",
  "synology-chat": "Synology Chat (Webhook)",
  tlon: "Tlon (Urbit)",
};

const CHANNELS_WITH_GROUPS = new Set([
  "telegram", "discord", "slack", "whatsapp", "mattermost", "msteams", "line", "feishu", "zalo",
]);

/**
 * 频道专用字段覆盖：CLI help 中未列出或描述不包含频道名的选项，
 * 按官方文档维护正确字段（与 openclaw channels add 交互式向导一致）
 * 特别是飞书、LINE、MS Teams、Mattermost 等，需要在 UI 中可填写凭证。
 */
const CHANNEL_OVERRIDE_FIELDS: Partial<Record<string, ChannelFieldSpec[]>> = {
  feishu: [
    {
      flag: "app-id",
      label: "App ID (格式 cli_xxx)",
      type: "text",
      required: true,
      placeholder: "从飞书开放平台 open.feishu.cn 获取",
    },
    {
      flag: "app-secret",
      label: "App Secret",
      type: "password",
      required: true,
      placeholder: "从飞书开放平台获取",
    },
  ],
  line: [
    {
      flag: "channel-access-token",
      label: "Channel Access Token",
      type: "password",
      required: true,
      placeholder: "从 LINE Developers Console 获取",
    },
    {
      flag: "channel-secret",
      label: "Channel Secret",
      type: "password",
      required: true,
      placeholder: "从 LINE Developers Console 获取",
    },
  ],
  msteams: [
    {
      flag: "app-id",
      label: "App ID (Azure Bot)",
      type: "text",
      required: true,
      placeholder: "Azure Bot 应用 ID",
    },
    {
      flag: "app-password",
      label: "App Password (Client Secret)",
      type: "password",
      required: true,
      placeholder: "Azure 客户端密钥",
    },
    {
      flag: "tenant-id",
      label: "Tenant ID",
      type: "text",
      required: true,
      placeholder: "Azure 租户 ID",
    },
  ],
  mattermost: [
    {
      flag: "bot-token",
      label: "Bot Token",
      type: "password",
      required: true,
      placeholder: "Mattermost Bot 令牌",
    },
    {
      flag: "base-url",
      label: "Mattermost 地址",
      type: "url",
      required: true,
      placeholder: "https://chat.example.com",
    },
  ],
};

/** 策略字段（config 写入，非 channels add） */
const POLICY_FIELDS: ChannelFieldSpec[] = [
  { flag: "dmPolicy", label: "私聊策略", type: "text", required: false, options: [
    { value: "pairing", label: "配对码 (pairing)" },
    { value: "allowlist", label: "白名单 (allowlist)" },
    { value: "open", label: "开放 (open)" },
    { value: "disabled", label: "禁用 (disabled)" },
  ]},
  { flag: "groupPolicy", label: "群组策略", type: "text", required: false, options: [
    { value: "allowlist", label: "白名单 (allowlist)" },
    { value: "open", label: "开放 (open)" },
    { value: "disabled", label: "禁用 (disabled)" },
  ]},
  { flag: "requireMention", label: "群组需 @ 提及才回复", type: "boolean", required: false },
];

/** 需安装插件的频道（help 可能不包含，需 fallback 确保用户可选） */
const CHANNELS_NEED_PLUGIN_FALLBACK = ["feishu", "line", "msteams", "mattermost"] as const;

/** 返回需安装插件的频道选项，用于合并到 help 解析结果，确保飞书等始终可见 */
export function getFallbackChannelOptions(): ChannelOption[] {
  return CHANNELS_NEED_PLUGIN_FALLBACK.map((id) => {
    const override = CHANNEL_OVERRIDE_FIELDS[id];
    const fields: ChannelFieldSpec[] = override ? [...override] : [];
    if (CHANNELS_WITH_GROUPS.has(id)) {
      fields.push(...POLICY_FIELDS);
    }
    return {
      id,
      name: CHANNEL_DISPLAY_NAMES[id] ?? id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      fields,
      hasGroups: CHANNELS_WITH_GROUPS.has(id),
    };
  });
}

export function parseChannelsFromHelp(helpText: string): ChannelOption[] {
  const lines = helpText.split("\n");
  const channelIdx = lines.findIndex((l) => l.includes("--channel") && l.includes("Channel"));
  if (channelIdx < 0) return [];

  const block = [lines[channelIdx], lines[channelIdx + 1] ?? ""].join(" ");
  const match = block.match(/\(([^)]+)\)/);
  if (!match) return [];

  const list = match[1].split("|").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const optionsMap = parseChannelOptionsFromHelp(helpText);

  return list.map((id) => {
    const override = CHANNEL_OVERRIDE_FIELDS[id];
    const fields: ChannelFieldSpec[] = override ? [...override] : [];
    if (!override) {
      for (const [flag, opt] of optionsMap) {
        if (opt.channelIds.includes(id)) {
          fields.push({
            flag,
            label: opt.label,
            type: opt.type,
            required: ["token", "bot-token", "app-token"].includes(flag),
            placeholder: opt.label,
            options: opt.options,
          });
        }
      }
    }
    if (CHANNELS_WITH_GROUPS.has(id)) {
      fields.push(...POLICY_FIELDS);
    }
    return {
      id,
      name: CHANNEL_DISPLAY_NAMES[id] ?? id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      fields,
      hasGroups: CHANNELS_WITH_GROUPS.has(id),
    };
  });
}

export function parseSkillsFromJson(jsonStr: string): SkillOption[] {
  try {
    const data = JSON.parse(jsonStr);
    const skills = data?.skills ?? [];
    return skills
      .map((s: { name?: string; description?: string; eligible?: boolean }) => ({
        name: s.name ?? "",
        description: s.description ?? "",
        eligible: s.eligible ?? false,
      }))
      .filter((s: SkillOption) => s.name);
  } catch {
    return [];
  }
}
