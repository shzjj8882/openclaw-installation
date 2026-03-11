import path from "path";
import os from "os";
import fs from "fs";
import { spawn } from "child_process";
import { ipcMain } from "electron";
import { getOpenClawPathEnv } from "./openclawPaths";
import { configureChannels } from "./applyConfigChannels";

const NPM_PNPM_ONLY_KEYS = [
  "npm_config_shamefully_hoist",
  "npm_config_recursive",
  "NPM_CONFIG_SHAMEFULLY_HOIST",
  "NPM_CONFIG_RECURSIVE",
];

function flagUsesEnv(flag: string): boolean {
  return /-api-key$|-password$|-token$/i.test(flag);
}

function flagToEnvKey(flag: string): string {
  return flag.replace(/-/g, "_").toUpperCase();
}

export function registerApplyConfigHandler(sendProgress: (progress: number, message: string) => void): void {
  ipcMain.handle("apply-openclaw-config", async (_, config) => {
    const { authChoice, fieldValues = {}, channels = [], skills = [], installDaemon } = config as {
      authChoice: string;
      fieldValues?: Record<string, string>;
      channels?: { id: string; fieldValues?: Record<string, string | boolean> }[];
      skills?: string[];
      installDaemon: boolean;
    };

    const baseEnv = { ...process.env, PATH: getOpenClawPathEnv() };
    const env: Record<string, string> = { ...baseEnv };
    const args = ["onboard", "--non-interactive", "--auth-choice", authChoice, "--accept-risk", "--skip-health", "--skip-skills", "--skip-channels", "--skip-ui"];

    for (const [flag, value] of Object.entries(fieldValues)) {
      const v = (value ?? "").trim();
      if (!v) continue;
      if (flagUsesEnv(flag)) env[flagToEnvKey(flag)] = v;
      else args.push(`--${flag}`, v);
    }
    args.push("--install-daemon");

    return new Promise<{ ok: boolean; error?: string }>(async (resolve) => {
      sendProgress(10, "正在执行 onboard…");
      const child = spawn("openclaw", args, { env: { ...env } as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      child.stderr?.on("data", (chunk) => { stderr += String(chunk); });

      child.on("close", async (code) => {
        if (code !== 0) {
          resolve({ ok: false, error: stderr.trim() || `退出码 ${code}` });
          return;
        }
        if (installDaemon) {
          sendProgress(40, "正在配置后台服务…");
          const run = (subargs: string[]) =>
            new Promise<number>((res) => {
              const c = spawn("openclaw", subargs, {
                env: { ...process.env, PATH: getOpenClawPathEnv() } as NodeJS.ProcessEnv,
                stdio: ["ignore", "pipe", "pipe"],
              });
              c.on("close", (code) => res(code ?? 0));
            });
          await run(["doctor", "--repair", "--non-interactive"]);
          await run(["gateway", "install", "--force"]);
          await run(["gateway", "start"]);
        }
        await configureChannels(channels, sendProgress);

        const openclawWorkspace = path.join(os.homedir(), ".openclaw", "workspace");
        const skillsDir = path.join(openclawWorkspace, "skills");
        try {
          fs.mkdirSync(skillsDir, { recursive: true });
        } catch {
          // ignore
        }
        const toInstall = skills.filter((s) => {
          const name = s?.trim();
          if (!name) return false;
          try {
            return !fs.statSync(path.join(skillsDir, name)).isDirectory();
          } catch {
            return true;
          }
        });
        if (toInstall.length > 0) {
          sendProgress(70, "正在安装 Skills…");
          const clawhubCache = path.join(os.homedir(), ".openclaw", ".clawhub-cache");
          try {
            fs.mkdirSync(clawhubCache, { recursive: true });
          } catch {
            // ignore
          }
          const skillEnv = { ...process.env, PATH: getOpenClawPathEnv(), COREPACK_ENABLE_DOWNLOAD_PROMPT: "0", CLAWHUB_WORKDIR: openclawWorkspace, npm_config_cache: clawhubCache, NPM_CONFIG_CACHE: clawhubCache } as NodeJS.ProcessEnv;
          NPM_PNPM_ONLY_KEYS.forEach((k) => delete skillEnv[k]);
          let skillError: string | undefined;
          for (const skill of toInstall) {
            const { code, stderr: err } = await new Promise<{ code: number; stderr: string }>((res) => {
              let err = "";
              const c = spawn("npx", ["clawhub", "install", "--no-input", skill.trim()], {
                env: skillEnv,
                cwd: openclawWorkspace,
                stdio: ["ignore", "pipe", "pipe"],
              });
              c.stderr?.on("data", (chunk) => { err += String(chunk); });
              c.on("close", (code) => res({ code: code ?? 0, stderr: err }));
            });
            if (code !== 0) {
              skillError = skillError ? `${skillError}; ` : "";
              skillError += `${skill}: ${err.trim() || `退出码 ${code}`}`;
            }
          }
          if (skillError) {
            resolve({ ok: false, error: `Skills 安装失败: ${skillError}` });
            return;
          }
        }
        if (Object.keys(fieldValues).length > 0) {
          try {
            fs.mkdirSync(path.join(os.homedir(), ".openclaw"), { recursive: true });
            fs.writeFileSync(path.join(os.homedir(), ".openclaw", ".installer-auth-cache.json"), JSON.stringify({ authChoice, fieldValues }, null, 0), "utf8");
          } catch {
            // ignore
          }
        }
        resolve({ ok: true });
      });

      child.on("error", (err) => resolve({ ok: false, error: err.message }));
    });
  });
}
