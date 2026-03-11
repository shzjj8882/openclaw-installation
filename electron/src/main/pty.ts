import path from "path";
import os from "os";
import { execSync } from "child_process";
import * as pty from "node-pty";
import type { BrowserWindow } from "electron";
import { getOpenClawPathEnv } from "./openclawPaths";

const NPM_PNPM_ONLY_KEYS = [
  "npm_config_shamefully_hoist",
  "npm_config_recursive",
  "NPM_CONFIG_SHAMEFULLY_HOIST",
  "NPM_CONFIG_RECURSIVE",
];

const ptyMap = new Map<string, pty.IPty>();

export function getPty(id: string): pty.IPty | undefined {
  return ptyMap.get(id);
}

export function spawnPty(
  id: string,
  mainWindow: BrowserWindow | null,
  onData: (id: string, data: string) => void,
  onExit: (id: string, exitCode: number) => void
): void {
  if (ptyMap.has(id)) return;

  const env = { ...process.env, PATH: getOpenClawPathEnv() } as NodeJS.ProcessEnv;
  NPM_PNPM_ONLY_KEYS.forEach((k) => delete env[k]);
  let p: pty.IPty;

  if (id === "openclaw-config-terminal") {
    const shell = process.platform === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/zsh");
    const shellCmd = process.platform === "win32" ? "openclaw onboard" : `openclaw onboard; exec "${shell}" -i`;
    if (process.platform !== "win32") env.ZDOTDIR = "/var/empty";
    p = pty.spawn(shell, process.platform === "win32" ? [] : ["-i", "-c", shellCmd], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      env,
    });
  } else if (id === "openclaw-logs") {
    let openclawBin = "openclaw";
    try {
      const out =
        process.platform === "win32"
          ? execSync("cmd /c where openclaw", { encoding: "utf8", env }).trim()
          : execSync("which openclaw", { encoding: "utf8", env }).trim();
      const first = out.split(/\r?\n/)[0]?.trim();
      if (first) openclawBin = first;
    } catch {
      // fallback
    }
    const logCmd = `"${openclawBin.replace(/"/g, '\\"')}" logs --follow --limit 500`;
    if (process.platform === "win32") {
      p = pty.spawn("powershell.exe", ["-NoLogo", "-Command", logCmd], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        env,
      });
    } else {
      const shell = process.env.SHELL || "/bin/zsh";
      if (!env.ZDOTDIR) env.ZDOTDIR = "/var/empty";
      p = pty.spawn(shell, ["-c", logCmd], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        env,
      });
    }
  } else {
    const shell = process.platform === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/zsh");
    p = pty.spawn(shell, [], { name: "xterm-256color", cols: 80, rows: 24, env });
  }

  ptyMap.set(id, p);
  p.onData((d) => onData(id, d));
  p.onExit(({ exitCode }) => {
    ptyMap.delete(id);
    onExit(id, exitCode);
  });
}

export function killPty(id: string): void {
  const p = ptyMap.get(id);
  if (p) {
    p.kill();
    ptyMap.delete(id);
  }
}
