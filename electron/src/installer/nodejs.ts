import path from "path";
import os from "os";
import fs from "fs";
import { spawn } from "child_process";
import { downloadFile } from "./download";

const NODE_VERSION = "v22.22.1";
const NODE_BASE = `https://nodejs.org/dist/${NODE_VERSION}`;

type ProgressFn = (progress: number, message: string) => void;

function getNodeInstallerUrl(): string | null {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin") {
    const pkg =
      arch === "arm64"
        ? `node-${NODE_VERSION}-darwin-arm64.pkg`
        : `node-${NODE_VERSION}-darwin-x64.pkg`;
    return `${NODE_BASE}/${pkg}`;
  }
  if (platform === "win32") {
    const archSuffix = arch === "x64" ? "x64" : arch === "arm64" ? "arm64" : "x86";
    return `${NODE_BASE}/node-${NODE_VERSION}-${archSuffix}.msi`;
  }
  return null;
}

function runInstaller(
  installerPath: string,
  platform: string,
  onProgress?: ProgressFn
): Promise<void> {
  return new Promise((resolve, reject) => {
    onProgress?.(50, "正在安装...");

    if (platform === "darwin") {
      const proc = spawn("open", [installerPath], { stdio: "ignore" });
      proc.on("close", () => {
        fs.unlink(installerPath, () => {});
        onProgress?.(90, "安装程序已打开，请在弹出的窗口中完成安装");
        resolve();
      });
      proc.on("error", reject);
    } else if (platform === "win32") {
      const proc = spawn("msiexec", ["/i", installerPath, "/qn", "/norestart"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let progress = 50;
      const interval = setInterval(() => {
        progress = Math.min(95, progress + 5);
        onProgress?.(progress, "正在安装 Node.js...");
      }, 500);
      proc.on("close", (code) => {
        clearInterval(interval);
        fs.unlink(installerPath, () => {});
        if (code === 0 || code === 3010) {
          onProgress?.(100, "安装完成");
          resolve();
        } else {
          reject(new Error(`安装失败，退出码: ${code}`));
        }
      });
      proc.on("error", reject);
    } else {
      reject(new Error("当前平台暂不支持自动安装 Node.js"));
    }
  });
}

export async function installNodejs(sendProgress: ProgressFn): Promise<{ ok: boolean }> {
  const url = getNodeInstallerUrl();
  if (!url) {
    throw new Error("当前平台暂不支持自动安装 Node.js，请手动安装");
  }

  const tmpDir = os.tmpdir();
  const filename = path.basename(url);
  const destPath = path.join(tmpDir, `openclaw-${filename}`);

  sendProgress(0, "准备下载 Node.js...");
  await downloadFile(url, destPath, (pct, msg) => {
    sendProgress(Math.floor(pct * 0.4), msg);
  });

  sendProgress(40, "下载完成，开始安装...");
  await runInstaller(destPath, process.platform, (pct, msg) => {
    sendProgress(40 + Math.floor(pct * 0.6), msg);
  });

  return { ok: true };
}
