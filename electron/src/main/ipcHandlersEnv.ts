import path from "path";
import fs from "fs";
import { ipcMain, shell, app } from "electron";
import { spawn } from "child_process";
import { execSync } from "child_process";
import { getOpenClawPathEnv, getEnvCheckPath } from "./openclawPaths";

const ENV_CHECK_CACHE_MS = 5000;
let envCheckCache: { result: { openclaw: boolean; nodejs: boolean; homebrew: boolean; versions: Record<string, string> }; ts: number } | null = null;

function envCheckLog(msg: string, data?: unknown): void {
  try {
    const dir = app.isPackaged ? app.getPath("userData") : path.join(process.cwd(), ".env-check-log");
    fs.mkdirSync(dir, { recursive: true });
    const logPath = path.join(dir, "env-check-debug.log");
    const line = `[${new Date().toISOString()}] ${msg}${data !== undefined ? " " + JSON.stringify(data, null, 2) : ""}\n`;
    fs.appendFileSync(logPath, line);
  } catch {
    /* ignore */
  }
}

export function registerEnvHandlers(): void {
  ipcMain.handle("check-env", async () => {
    const now = Date.now();
    if (envCheckCache && now - envCheckCache.ts < ENV_CHECK_CACHE_MS) return envCheckCache.result;

    const result = { openclaw: false, nodejs: false, homebrew: false, versions: {} as Record<string, string> };
    const pathUsed = getEnvCheckPath();
    const envForCheck = { ...process.env, PATH: pathUsed } as NodeJS.ProcessEnv;
    envCheckLog("check-env start", {
      processEnvPath: process.env.PATH?.slice(0, 200),
      pathUsed: pathUsed.slice(0, 500),
      pathParts: pathUsed.split(process.platform === "win32" ? ";" : ":").slice(0, 15),
    });
    try {
      const nodeVersion = execSync("node -v", { encoding: "utf8", env: envForCheck }).trim();
      result.nodejs = !!nodeVersion;
      result.versions.node = nodeVersion.replace(/^v/, "");
      envCheckLog("node check ok", { nodeVersion });
    } catch (e) {
      result.nodejs = false;
      envCheckLog("node check failed", { err: String(e), message: (e as Error)?.message });
      try {
        const whichNode = execSync("which node", { encoding: "utf8", env: envForCheck }).trim();
        envCheckLog("which node (after fail)", { whichNode });
      } catch {
        envCheckLog("which node also failed");
      }
      if (process.platform === "darwin" || process.platform === "linux") {
        for (const nodePath of ["/usr/local/bin/node", "/opt/homebrew/bin/node"]) {
          try {
            const v = execSync(`"${nodePath}" -v`, { encoding: "utf8" }).trim();
            result.nodejs = true;
            result.versions.node = v.replace(/^v/, "");
            envCheckLog("node found via direct path", { nodePath, v });
            break;
          } catch {
            /* try next */
          }
        }
      }
    }
    try {
      const openclawVersion = execSync("openclaw --version", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], env: envForCheck }).trim();
      result.openclaw = !!openclawVersion;
      result.versions.openclaw = openclawVersion || "installed";
    } catch {
      try {
        const cmd = process.platform === "win32" ? "where openclaw" : "which openclaw";
        execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], env: envForCheck });
        result.openclaw = true;
        result.versions.openclaw = "installed";
      } catch {
        result.openclaw = false;
      }
    }
    if (process.platform === "darwin" || process.platform === "linux") {
      try {
        execSync("which brew", { encoding: "utf8", env: envForCheck });
        result.homebrew = true;
      } catch {
        result.homebrew = false;
      }
    } else {
      result.homebrew = true;
    }
    envCheckCache = { result, ts: Date.now() };
    envCheckLog("check-env result", result);
    return result;
  });

  ipcMain.handle("open-external", (_, url: string) => shell.openExternal(url));

  ipcMain.handle("run-in-terminal", (_, cmd: string) => {
    const platform = process.platform;
    if (platform === "darwin") spawn("osascript", ["-e", `tell application "Terminal" to do script "${cmd.replace(/"/g, '\\"')}"`]);
    else if (platform === "win32") spawn("cmd", ["/c", "start", "cmd", "/k", cmd]);
    else spawn("x-terminal-emulator", ["-e", cmd], { detached: true });
  });

  ipcMain.handle("run-openclaw-and-exit", async () => {
    const cmd = "openclaw dashboard";
    const platform = process.platform;
    if (platform === "darwin") spawn("osascript", ["-e", `tell application "Terminal" to do script "${cmd.replace(/"/g, '\\"')}"`]);
    else if (platform === "win32") spawn("cmd", ["/c", "start", "cmd", "/k", cmd]);
    else spawn("x-terminal-emulator", ["-e", cmd], { detached: true });
    app.quit();
    return { ok: true };
  });

  ipcMain.handle("check-gateway-status", async () => {
    const env = { ...process.env, PATH: getOpenClawPathEnv() } as NodeJS.ProcessEnv;
    try {
      const out = execSync("openclaw gateway status --json", { encoding: "utf8", env, timeout: 5000 });
      const data = JSON.parse(out.trim()) as { running?: boolean; state?: string; service?: { runtime?: { status?: string; state?: string } } };
      const running = data.running === true || data.state === "running" ||
        data.service?.runtime?.status === "running" || data.service?.runtime?.state === "active";
      return { running };
    } catch {
      return { running: false };
    }
  });

  ipcMain.handle("launch-openclaw", async (_, background: boolean, restart = false) => {
    const env = { ...process.env, PATH: getOpenClawPathEnv() } as NodeJS.ProcessEnv;
    if (background) {
      const args = restart ? ["gateway", "restart"] : ["gateway", "start"];
      const proc = spawn("openclaw", args, { env, detached: true, stdio: "ignore" });
      proc.unref();
      return { ok: true };
    }
    const cmd = restart ? "openclaw gateway restart" : "openclaw gateway";
    const platform = process.platform;
    if (platform === "darwin") spawn("osascript", ["-e", `tell application "Terminal" to do script "${cmd.replace(/"/g, '\\"')}"`]);
    else if (platform === "win32") spawn("cmd", ["/c", "start", "cmd", "/k", cmd]);
    else spawn("x-terminal-emulator", ["-e", cmd], { detached: true });
    return { ok: true };
  });
}
