export {};

declare global {
  interface Window {
    electron?: {
      onOnboardSchema: (cb: (schema: { authOptions: { value: string; label: string; envKey?: string }[]; hasInstallDaemon: boolean }) => void) => () => void;
      checkEnv: (force?: boolean) => Promise<{
        openclaw: boolean;
        nodejs: boolean;
        homebrew: boolean;
        versions: Record<string, string>;
      }>;
      refreshOnboardSchema: () => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      runInTerminal: (cmd: string) => Promise<void>;
      runOpenClawInstall: (method: string) => Promise<{ ok: boolean }>;
      runOpenClawOnboard: () => Promise<{ ok: boolean }>;
      applyOpenClawConfig: (config: {
        authChoice: string;
        fieldValues?: Record<string, string>;
        channels?: { id: string; fieldValues?: Record<string, string | boolean> }[];
        skills?: string[];
        installDaemon: boolean;
      }) => Promise<{ ok: boolean; error?: string }>;
      installNodejs: () => Promise<{ ok: boolean }>;
      installOpenClaw: () => Promise<{ ok: boolean }>;
      installOpenClawWithSudo: () => Promise<{ ok: boolean }>;
      installHomebrew: () => Promise<{ ok: boolean }>;
      onInstallProgress: (
        callback: (data: { progress: number; message: string }) => void
      ) => () => void;
      checkGatewayStatus: () => Promise<{ running: boolean }>;
      launchOpenClaw: (background: boolean, restart?: boolean) => Promise<{ ok: boolean }>;
      ptySpawn: (id: string) => Promise<void>;
      ptyWrite: (id: string, data: string) => Promise<void>;
      ptyResize: (id: string, cols: number, rows: number) => Promise<void>;
      ptyKill: (id: string) => Promise<void>;
      onPtyData: (callback: (id: string, data: string) => void) => () => void;
      onPtyExit: (callback: (id: string, exitCode: number) => void) => () => void;
    };
  }
}
