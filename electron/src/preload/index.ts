import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  checkEnv: () => ipcRenderer.invoke("check-env"),
  refreshOnboardSchema: () => ipcRenderer.invoke("refresh-onboard-schema"),
  onOnboardSchema: (callback: (schema: unknown) => void) => {
    const handler = (_: unknown, schema: unknown) => callback(schema);
    ipcRenderer.on("onboard-schema", handler);
    return () => ipcRenderer.removeListener("onboard-schema", handler);
  },
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  runInTerminal: (cmd: string) => ipcRenderer.invoke("run-in-terminal", cmd),
  runOpenClawAndExit: () => ipcRenderer.invoke("run-openclaw-and-exit"),
  runOpenClawInstall: (method: string) =>
    ipcRenderer.invoke("run-openclaw-install", method),
  runOpenClawOnboard: () => ipcRenderer.invoke("run-openclaw-onboard"),
  applyOpenClawConfig: (config: {
    authChoice: string;
    fieldValues?: Record<string, string>;
    channels?: { id: string; fieldValues?: Record<string, string | boolean> }[];
    skills?: string[];
    skillFieldValues?: Record<string, string | boolean>;
    installDaemon: boolean;
    daemonFieldValues?: Record<string, string | boolean>;
  }) => ipcRenderer.invoke("apply-openclaw-config", config),
  installNodejs: () => ipcRenderer.invoke("install-nodejs"),
  installOpenClaw: () => ipcRenderer.invoke("install-openclaw"),
  installOpenClawWithSudo: () => ipcRenderer.invoke("install-openclaw-with-sudo"),
  installHomebrew: () => ipcRenderer.invoke("install-homebrew"),
  onInstallProgress: (callback: (data: { progress: number; message: string }) => void) => {
    const handler = (_: unknown, data: { progress: number; message: string }) =>
      callback(data);
    ipcRenderer.on("install-progress", handler);
    return () => ipcRenderer.removeListener("install-progress", handler);
  },
  checkGatewayStatus: () => ipcRenderer.invoke("check-gateway-status"),
  launchOpenClaw: (background: boolean, restart?: boolean) =>
    ipcRenderer.invoke("launch-openclaw", background, restart ?? false),
  ptySpawn: (id: string) => ipcRenderer.invoke("pty-spawn", id),
  ptyWrite: (id: string, data: string) => ipcRenderer.invoke("pty-write", id, data),
  ptyResize: (id: string, cols: number, rows: number) => ipcRenderer.invoke("pty-resize", id, cols, rows),
  ptyKill: (id: string) => ipcRenderer.invoke("pty-kill", id),
  onPtyData: (callback: (id: string, data: string) => void) => {
    const handler = (_: unknown, id: string, data: string) => callback(id, data);
    ipcRenderer.on("pty-data", handler);
    return () => ipcRenderer.removeListener("pty-data", handler);
  },
  onPtyExit: (callback: (id: string, exitCode: number) => void) => {
    const handler = (_: unknown, id: string, exitCode: number) => callback(id, exitCode);
    ipcRenderer.on("pty-exit", handler);
    return () => ipcRenderer.removeListener("pty-exit", handler);
  },
});
