import path from "path";
import os from "os";
import { spawn, execSync } from "child_process";
import { getEnvCheckPath } from "../main/openclawPaths";

type ProgressFn = (progress: number, message: string) => void;

/** 解析 npm 的完整路径（sudo/pkexec 环境 PATH 受限，需用绝对路径） */
function resolveNpmPath(): string | null {
  const env = { ...process.env, PATH: getEnvCheckPath() } as NodeJS.ProcessEnv;
  try {
    const out = execSync("command -v npm || which npm", { encoding: "utf8", env }).trim();
    return out || null;
  } catch {
    return null;
  }
}

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

    const npmPath = resolveNpmPath();
    if (!npmPath) {
      reject(new Error("未找到 npm，请先安装 Node.js 或使用「在终端运行」手动安装"));
      return;
    }

    const pathEnv = getEnvCheckPath();
    const sshAuthSock = process.env.SSH_AUTH_SOCK;
    const escForAppleScript = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const startHeartbeat = () => {
      let p = 5;
      const id = setInterval(() => {
        if (p < 95) {
          sendProgress(p, "安装中，请稍候…");
          p += 10;
        }
      }, 2000);
      return () => clearInterval(id);
    };

    if (process.platform === "darwin") {
      const stopHeartbeat = startHeartbeat();
      const pathEsc = escForAppleScript(pathEnv);
      const npmEsc = escForAppleScript(npmPath);
      const sockEsc = sshAuthSock ? escForAppleScript(sshAuthSock) : "";
      const sshPart = sockEsc
        ? '"export SSH_AUTH_SOCK=" & quoted form of "' + sockEsc + '" & "; " & '
        : "";
      const cmd =
        'do shell script "export PATH=" & quoted form of "' +
        pathEsc +
        '" & "; " & ' +
        sshPart +
        'quoted form of "' +
        npmEsc +
        '" & " install -g openclaw@latest" with administrator privileges';
      const proc = spawn("osascript", ["-e", cmd], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";
      proc.stderr?.on("data", (d) => { stderr += d.toString(); });

      proc.on("close", (code) => {
        stopHeartbeat();
        if (code === 0) {
          sendProgress(100, "OpenClaw 安装完成");
          resolve({ ok: true });
        } else {
          const msg = stderr || `安装失败，退出码: ${code}`;
          const hint = /Permission denied \(publickey\)|Could not read from remote repository/.test(msg)
            ? "依赖需要 Git SSH 认证，请使用「在终端运行」在终端中手动安装"
            : "";
          reject(new Error(hint || msg));
        }
      });
      proc.on("error", (err) => {
        stopHeartbeat();
        reject(err);
      });
    } else if (process.platform === "linux") {
      const stopHeartbeat = startHeartbeat();
      const pathSafe = pathEnv.replace(/\n/g, ":");
      const envArgs = ["env", `PATH=${pathSafe}`];
      if (sshAuthSock) envArgs.push(`SSH_AUTH_SOCK=${sshAuthSock}`);
      const proc = spawn("pkexec", [...envArgs, npmPath, "install", "-g", "openclaw@latest"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      sendProgress(20, "等待授权...");

      let stderr = "";
      proc.stderr?.on("data", (d) => { stderr += d.toString(); });

      proc.on("close", (code) => {
        stopHeartbeat();
        if (code === 0) {
          sendProgress(100, "OpenClaw 安装完成");
          resolve({ ok: true });
        } else {
          const msg = stderr || `安装失败，退出码: ${code}`;
          const hint = /Permission denied \(publickey\)|Could not read from remote repository/.test(msg)
            ? "依赖需要 Git SSH 认证，请使用「在终端运行」在终端中手动安装"
            : "";
          reject(new Error(hint || msg));
        }
      });
      proc.on("error", () => {
        stopHeartbeat();
        reject(new Error("pkexec 不可用，请使用「在终端运行」手动执行 sudo npm install -g openclaw@latest"));
      });
    } else {
      reject(new Error("Windows 无需管理员权限，请使用一键安装"));
    }
  });
}
