import path from "path";
import os from "os";
import { ipcMain, shell, app } from "electron";
import { spawn } from "child_process";
import { execSync } from "child_process";
import { getOpenClawPathEnv } from "./openclawPaths";

const ENV_CHECK_CACHE_MS = 5000;
let envCheckCache: { result: { openclaw: boolean; nodejs: boolean; homebrew: boolean; versions: Record<string, string> }; ts: number } | null = null;

export function registerEnvHandlers(): void {
  ipcMain.handle("check-env", async () => {
    const now = Date.now();
    if (envCheckCache && now - envCheckCache.ts < ENV_CHECK_CACHE_MS) return envCheckCache.result;

    const result = { openclaw: false, nodejs: false, homebrew: false, versions: {} as Record<string, string> };
    try {
      const nodeVersion = execSync("node -v", { encoding: "utf8" }).trim();
      result.nodejs = !!nodeVersion;
      result.versions.node = nodeVersion.replace(/^v/, "");
    } catch {
      result.nodejs = false;
    }
    try {
      const localBin = path.join(os.homedir(), ".local", "bin");
      const envWithLocal = { ...process.env, PATH: `${localBin}:${process.env.PATH || ""}` };
      const openclawVersion = execSync("openclaw --version", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], env: envWithLocal }).trim();
      result.openclaw = !!openclawVersion;
      result.versions.openclaw = openclawVersion || "installed";
    } catch {
      try {
        const cmd = process.platform === "win32" ? "where openclaw" : "which openclaw";
        execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
        result.openclaw = true;
        result.versions.openclaw = "installed";
      } catch {
        result.openclaw = false;
      }
    }
    if (process.platform === "darwin" || process.platform === "linux") {
      try {
        execSync("which brew", { encoding: "utf8" });
        result.homebrew = true;
      } catch {
        result.homebrew = false;
      }
    } else {
      result.homebrew = true;
    }
    envCheckCache = { result, ts: Date.now() };
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
