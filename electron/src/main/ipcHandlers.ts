import { ipcMain } from "electron";
import { spawn } from "child_process";
import { installNodejs, installOpenClaw, installOpenClawWithSudo, installHomebrew } from "../installer";
import { getPty, spawnPty, killPty } from "./pty";
import { getMainWindow, pushOnboardSchema } from "./window";
import { registerApplyConfigHandler } from "./applyConfig";
import { registerEnvHandlers } from "./ipcHandlersEnv";

function sendProgress(progress: number, message: string): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) win.webContents.send("install-progress", { progress, message });
}

export function registerIpcHandlers(): void {
  registerApplyConfigHandler(sendProgress);
  registerEnvHandlers();

  ipcMain.handle("refresh-onboard-schema", () => {
    pushOnboardSchema();
    return true;
  });

  ipcMain.handle("pty-spawn", (_, id: string) => {
    const win = getMainWindow();
    spawnPty(id, win, (i, d) => {
      if (win && !win.isDestroyed()) win.webContents.send("pty-data", i, d);
    }, (i, code) => {
      if (win && !win.isDestroyed()) win.webContents.send("pty-exit", i, code);
    });
  });

  ipcMain.handle("pty-write", (_, id: string, data: string) => getPty(id)?.write(data));
  ipcMain.handle("pty-resize", (_, id: string, cols: number, rows: number) => getPty(id)?.resize(cols, rows));
  ipcMain.handle("pty-kill", (_, id: string) => killPty(id));

  ipcMain.handle("install-nodejs", () => installNodejs(sendProgress));
  ipcMain.handle("install-openclaw", () => installOpenClaw(sendProgress));
  ipcMain.handle("install-openclaw-with-sudo", () => installOpenClawWithSudo(sendProgress));
  ipcMain.handle("install-homebrew", () => installHomebrew(sendProgress));

  ipcMain.handle("run-openclaw-install", async (_, method: string) => {
    const cmd = method === "curl" ? "curl -fsSL https://openclaw.ai/install.sh | bash" : "npm install -g openclaw@latest";
    const platform = process.platform;
    if (platform === "darwin") spawn("osascript", ["-e", `tell application "Terminal" to do script "${cmd.replace(/"/g, '\\"')}"`]);
    else if (platform === "win32") spawn("cmd", ["/c", "start", "cmd", "/k", cmd]);
    else spawn("x-terminal-emulator", ["-e", cmd], { detached: true });
    return { ok: true };
  });

  ipcMain.handle("run-openclaw-onboard", async () => {
    const cmd = "openclaw onboard --flow quickstart --install-daemon";
    const platform = process.platform;
    if (platform === "darwin") spawn("osascript", ["-e", `tell application "Terminal" to do script "${cmd.replace(/"/g, '\\"')}"`]);
    else if (platform === "win32") spawn("cmd", ["/c", "start", "cmd", "/k", cmd]);
    else spawn("x-terminal-emulator", ["-e", cmd], { detached: true });
    return { ok: true };
  });
}
