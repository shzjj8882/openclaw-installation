/**
 * 解析 openclaw onboard --help 输出，根据 CLI 命令动态生成配置 schema
 * 表单字段完全由后台命令决定，不写死逻辑
 */

export interface FieldSpec {
  flag: string;
  label: string;
  type: "password" | "text" | "url" | "boolean";
  required: boolean;
  envKey?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface AuthOption {
  value: string;
  label: string;
  fields: FieldSpec[];
}

export interface DaemonOption {
  /** 是否安装后台服务 */
  fields: FieldSpec[];
}

export interface OnboardSchema {
  authOptions: AuthOption[];
  hasInstallDaemon: boolean;
  daemonOptions: DaemonOption;
}

/** 解析 help 中所有 --flag <placeholder> 描述 格式的行 */
function parseAllFlags(helpText: string): Map<string, { label: string; hasKey: boolean }> {
  const map = new Map<string, { label: string; hasKey: boolean }>();
  const lines = helpText.split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*--([a-z0-9-]+)\s+<[^>]+>\s+(.+)/);
    if (m) {
      const flag = m[1];
      const desc = m[2].trim();
      const hasKey = /api-key|password|token/i.test(flag) || /key|token|password/i.test(desc);
      map.set(flag, { label: desc, hasKey });
    }
  }
  return map;
}

/** 根据 auth-choice 推断需要哪些 flags */
function getFlagsForAuthChoice(
  choice: string,
  allFlags: Map<string, { label: string; hasKey: boolean }>
): FieldSpec[] {
  const fields: FieldSpec[] = [];

  if (choice === "skip") return [];

  // custom-api-key: 需要 custom-base-url, custom-model-id, custom-api-key, custom-compatibility
  if (choice === "custom-api-key") {
    const customFlags = [
      { flag: "custom-base-url", required: true, placeholder: "http://127.0.0.1:11434/v1" },
      { flag: "custom-model-id", required: true },
      { flag: "custom-api-key", required: false, envKey: "CUSTOM_API_KEY" },
      { flag: "custom-compatibility", required: false, options: ["openai", "anthropic"] },
    ];
    for (const { flag, required, envKey, options, placeholder } of customFlags) {
      const info = allFlags.get(flag);
      if (info || options) {
        fields.push({
          flag,
          label: info?.label ?? (flag === "custom-compatibility" ? "API 兼容模式" : flag),
          type: flag.includes("api-key") ? "password" : flag.includes("url") ? "url" : "text",
          required: !!required,
          envKey,
          placeholder,
          options: options?.map((v) => ({ value: v, label: v })),
        });
      }
    }
    return fields;
  }

  // cloudflare-ai-gateway-api-key: 需要 account-id, gateway-id, api-key
  if (choice === "cloudflare-ai-gateway-api-key") {
    const cfFlags = [
      { flag: "cloudflare-ai-gateway-account-id", required: true },
      { flag: "cloudflare-ai-gateway-gateway-id", required: true },
      { flag: "cloudflare-ai-gateway-api-key", required: true, envKey: "CLOUDFLARE_AI_GATEWAY_API_KEY" },
    ];
    for (const { flag, required, envKey } of cfFlags) {
      const info = allFlags.get(flag);
      if (info) {
        fields.push({
          flag,
          label: info.label,
          type: flag.includes("api-key") ? "password" : "text",
          required: !!required,
          envKey,
        });
      }
    }
    return fields;
  }

  // 通用匹配：依次尝试 choice、choice-api-key、choice.replace(/-api-key$/, '')+'-api-key'、首段+'-api-key'、最小别名
  const aliases: Record<string, string> = { apiKey: "anthropic-api-key", "opencode-zen": "opencode-zen-api-key" };
  const possibleFlags = [
    choice,
    `${choice}-api-key`,
    choice.replace(/-api-key$/, "") + "-api-key",
    choice.split("-")[0] + "-api-key",
    aliases[choice],
  ].filter(Boolean) as string[];

  for (const flag of possibleFlags) {
    const info = allFlags.get(flag);
    if (info) {
      const envKey = flag.replace(/-/g, "_").toUpperCase();
      fields.push({
        flag,
        label: info.label,
        type: info.hasKey ? "password" : "text",
        required: true,
        envKey: info.hasKey ? envKey : undefined,
      });
      return fields;
    }
  }

  return fields;
}

function valueToLabel(value: string): string {
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function parseOnboardHelp(helpText: string): OnboardSchema {
  const lines = helpText.split("\n");
  const allFlags = parseAllFlags(helpText);
  let hasInstallDaemon = false;

  for (const line of lines) {
    if (line.includes("--install-daemon") || line.includes("Install gateway")) {
      hasInstallDaemon = true;
      break;
    }
  }

  const authChoiceLine = lines.find((l) => l.includes("--auth-choice"));
  let authChoices: string[] = [];
  if (authChoiceLine) {
    const authPart = authChoiceLine.split("Auth:")[1];
    if (authPart) {
      authChoices = [...new Set(authPart.split("|").map((p) => p.trim()).filter(Boolean))];
    }
  }

  const authOptions: AuthOption[] = [];
  const seen = new Set<string>();

  for (const choice of authChoices) {
    if (seen.has(choice)) continue;
    seen.add(choice);

    const fields = getFlagsForAuthChoice(choice, allFlags);
    const label =
      (choice.endsWith("-api-key") && allFlags.get(choice)?.label) ||
      (choice === "custom-api-key" && "自定义 API (OpenAI/Anthropic 兼容)") ||
      (choice === "skip" && "暂不配置") ||
      valueToLabel(choice);

    authOptions.push({
      value: choice,
      label,
      fields,
    });
  }

  if (authOptions.length === 0) {
    authOptions.push({ value: "skip", label: "暂不配置", fields: [] });
  }

  const daemonOptions: DaemonOption = {
    fields: [
      {
        flag: "install-daemon",
        label: "安装后台服务（Gateway 开机自启）",
        type: "boolean",
        required: false,
      },
      {
        flag: "daemon-runtime",
        label: "Daemon 运行时",
        type: "text",
        required: false,
        options: [
          { value: "node", label: "Node (推荐)" },
          { value: "bun", label: "Bun" },
        ],
      },
    ],
  };
  const daemonRuntimeLine = lines.find((l) => l.includes("daemon-runtime"));
  if (daemonRuntimeLine) {
    const m = daemonRuntimeLine.match(/\(([^)]+)\)/);
    if (m) {
      daemonOptions.fields[1].options = m[1].split("|").map((o) => ({
        value: o.trim().toLowerCase(),
        label: o.trim(),
      }));
    }
  }

  return {
    authOptions,
    hasInstallDaemon: hasInstallDaemon || true,
    daemonOptions,
  };
}
