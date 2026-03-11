import path from "path";
import os from "os";
import fs from "fs";
import JSON5 from "json5";
import { inferAuthFromConfig } from "./fetchCurrentConfigAuth";
import { inferChannelsFromConfig } from "./fetchCurrentConfigChannels";

export interface CurrentConfig {
  authChoice?: string;
  authFieldValues?: Record<string, string>;
  selectedChannels?: string[];
  channelFieldValues?: Record<string, Record<string, string | boolean>>;
  selectedSkills?: string[];
  skillFieldValues?: Record<string, string | boolean>;
  installDaemon?: boolean;
  daemonFieldValues?: Record<string, string | boolean>;
}

export function fetchCurrentConfig(): CurrentConfig {
  const configPath = path.join(os.homedir(), ".openclaw", "openclaw.json");
  const workspace = path.join(os.homedir(), ".openclaw", "workspace");
  const skillsDir = path.join(workspace, "skills");

  let config: Record<string, unknown> = {};
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    config = JSON5.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }

  const result: Record<string, unknown> = {};
  inferAuthFromConfig(config, result);
  inferChannelsFromConfig(config, result);

  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const installed = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (installed.length > 0) result.selectedSkills = installed;
  } catch {
    // skills 目录不存在
  }

  const wizard = config.wizard as Record<string, unknown>;
  if (wizard?.lastRunMode) result.installDaemon = true;

  return result as CurrentConfig;
}
