import path from "path";
import os from "os";
import { spawn } from "child_process";

type ProgressFn = (progress: number, message: string) => void;

export function installOpenClaw(sendProgress: ProgressFn): Promise<{ ok: boolean }> {
  return new Promise((resolve, reject) => {
    sendProgress(0, "正在安装 OpenClaw...");

    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const userPrefix =
      process.platform === "win32"
        ? path.join(os.homedir(), "AppData", "Roaming", "npm")
        : path.join(os.homedir(), ".local");
    const userBin =
      process.platform === "win32" ? userPrefix : path.join(userPrefix, "bin");
    const args =
      process.platform === "win32"
        ? ["install", "-g", "openclaw@latest"]
        : ["install", "-g", "--prefix", userPrefix, "openclaw@latest"];

    const proc = spawn(npm, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        CI: "1",
        PATH: `${userBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    let lastProgress = 0;
    let stderrOutput = "";
    const parseNpmOutput = (data: Buffer) => {
      const str = data.toString();
      if (str.includes("fetch") || str.includes("extract") || str.includes("reify")) {
        lastProgress = Math.min(95, lastProgress + 10);
        sendProgress(lastProgress, str.trim().slice(0, 50) || "安装中...");
      }
    };

    proc.stdout?.on("data", parseNpmOutput);
    proc.stderr?.on("data", (data) => {
      stderrOutput += data.toString();
      parseNpmOutput(data);
    });

    proc.on("close", (code) => {
      if (code === 0) {
        sendProgress(100, "OpenClaw 安装完成");
        resolve({ ok: true });
      } else {
        const isPermission = stderrOutput.includes("EACCES") || stderrOutput.includes("permission");
        const hint = isPermission
          ? "权限不足，请使用「在终端运行」手动安装"
          : stderrOutput.trim().split("\n").pop()?.slice(0, 80) || "";
        reject(new Error(`npm 安装失败${hint ? `: ${hint}` : `，退出码 ${code}`}`));
      }
    });
    proc.on("error", (err) => reject(err));
  });
}

export function installOpenClawWithSudo(sendProgress: ProgressFn): Promise<{ ok: boolean }> {
  return new Promise((resolve, reject) => {
    sendProgress(0, "即将弹出授权窗口，请输入密码...");

    if (process.platform === "darwin") {
      const cmd = 'do shell script "npm install -g openclaw@latest" with administrator privileges';
      const proc = spawn("osascript", ["-e", cmd], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";
      proc.stderr?.on("data", (d) => { stderr += d.toString(); });

      proc.on("close", (code) => {
        if (code === 0) {
          sendProgress(100, "OpenClaw 安装完成");
          resolve({ ok: true });
        } else {
          reject(new Error(stderr || `安装失败，退出码: ${code}`));
        }
      });
      proc.on("error", reject);
    } else if (process.platform === "linux") {
      const proc = spawn("pkexec", ["npm", "install", "-g", "openclaw@latest"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      sendProgress(20, "等待授权...");

      let stderr = "";
      proc.stderr?.on("data", (d) => { stderr += d.toString(); });

      proc.on("close", (code) => {
        if (code === 0) {
          sendProgress(100, "OpenClaw 安装完成");
          resolve({ ok: true });
        } else {
          reject(new Error(stderr || `安装失败，退出码: ${code}`));
        }
      });
      proc.on("error", () => {
        reject(new Error("pkexec 不可用，请使用「在终端运行」手动执行 sudo npm install -g openclaw@latest"));
      });
    } else {
      reject(new Error("Windows 无需管理员权限，请使用一键安装"));
    }
  });
}
