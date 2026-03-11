import path from "path";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";
import { getOpenClawPathEnv } from "./openclawPaths";
import { parseOnboardHelp } from "./onboardSchema";
import { parseChannelsFromHelp, parseSkillsFromJson, getFallbackChannelOptions } from "./configSchema";
import { fetchCurrentConfig } from "./fetchCurrentConfig";
import { installExtensionDeps } from "./extensionDeps";

export function fetchOnboardSchema() {
  const env = { ...process.env, PATH: getOpenClawPathEnv() } as NodeJS.ProcessEnv;
  let authOptions = [{ value: "skip", label: "暂不配置（请先安装 OpenClaw）" }];
  let hasInstallDaemon = true;
  let daemonOptions = {
    fields: [] as { flag: string; label: string; type: string; required: boolean; options?: { value: string; label: string }[] }[],
  };
  let channels: { id: string; name: string; needsToken?: boolean; fields?: unknown[]; hasGroups?: boolean }[] = [];
  let skills: { name: string; description: string; eligible: boolean }[] = [];

  try {
    const helpText = execSync("openclaw onboard --help", {
      encoding: "utf8",
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const onboard = parseOnboardHelp(helpText);
    authOptions = onboard.authOptions;
    hasInstallDaemon = onboard.hasInstallDaemon;
    daemonOptions = onboard.daemonOptions;
  } catch {
    daemonOptions = {
      fields: [
        { flag: "install-daemon", label: "安装后台服务（Gateway 开机自启）", type: "boolean", required: false },
        { flag: "daemon-runtime", label: "Daemon 运行时", type: "text", required: false, options: [{ value: "node", label: "Node (推荐)" }, { value: "bun", label: "Bun" }] },
      ],
    };
  }

  try {
    const channelsHelp = execSync("openclaw channels add --help", {
      encoding: "utf8",
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    channels = parseChannelsFromHelp(channelsHelp);
  } catch {
    channels = [
      { id: "telegram", name: "Telegram (Bot API)", fields: [{ flag: "token", label: "Bot Token", type: "password", required: true }], hasGroups: true },
      { id: "discord", name: "Discord (Bot API)", fields: [{ flag: "token", label: "Bot Token", type: "password", required: true }], hasGroups: true },
      { id: "whatsapp", name: "WhatsApp (QR link)", fields: [], hasGroups: true },
    ];
  }

  const channelIds = new Set(channels.map((c) => c.id));
  for (const fallback of getFallbackChannelOptions()) {
    if (!channelIds.has(fallback.id)) {
      channels.push(fallback);
      channelIds.add(fallback.id);
    }
  }

  try {
    const skillsJson = execSync("openclaw skills list --json", {
      encoding: "utf8",
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    skills = parseSkillsFromJson(skillsJson);
  } catch {
    skills = [];
  }

  const workspace = path.join(os.homedir(), ".openclaw", "workspace");
  const skillsDir = path.join(workspace, "skills");
  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const installed = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const names = new Set(skills.map((s) => s.name));
    for (const name of installed) {
      if (!names.has(name)) {
        skills.push({ name, description: "已安装", eligible: true });
        names.add(name);
      }
    }
  } catch {
    // skills 目录不存在
  }

  const skillsOptions = { fields: [] as { flag: string; label: string; type: string; required: boolean; options?: { value: string; label: string }[] }[] };
  const currentConfig = fetchCurrentConfig();

  if (currentConfig.selectedChannels?.includes("feishu")) {
    void installExtensionDeps("feishu");
  }

  const defaultChannels = [
    { id: "telegram", name: "Telegram (Bot API)", fields: [{ flag: "token", label: "Bot Token", type: "password", required: true }], hasGroups: true },
    { id: "discord", name: "Discord (Bot API)", fields: [{ flag: "token", label: "Bot Token", type: "password", required: true }], hasGroups: true },
    { id: "whatsapp", name: "WhatsApp (QR link)", fields: [], hasGroups: true },
  ];

  return {
    authOptions,
    hasInstallDaemon,
    daemonOptions,
    skillsOptions,
    channels: channels.length ? channels : defaultChannels,
    skills,
    currentConfig,
  };
}
