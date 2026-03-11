/**
 * Electron 内自动安装：Node.js、OpenClaw、Homebrew
 * 通过 sendProgress 向渲染进程发送进度
 */

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const NODE_VERSION = "v22.22.1";
const NODE_BASE = `https://nodejs.org/dist/${NODE_VERSION}`;

function getNodeInstallerUrl() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin") {
    const pkg = arch === "arm64"
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

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath);

    protocol.get(url, { redirect: true }, (res) => {
      const total = parseInt(res.headers["content-length"] || "0", 10);
      let downloaded = 0;

      res.on("data", (chunk) => {
        downloaded += chunk.length;
        const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
        onProgress?.(pct, `下载中 ${Math.round(downloaded / 1024 / 1024 * 10) / 10} MB`);
      });

      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(destPath);
      });
    }).on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function runInstaller(installerPath, platform, onProgress) {
  return new Promise((resolve, reject) => {
    onProgress?.(50, "正在安装...");

    if (platform === "darwin") {
      // macOS: 使用 open 打开 .pkg，用户通过图形界面完成安装（无需 sudo）
      const proc = spawn("open", [installerPath], { stdio: "ignore" });
      proc.on("close", () => {
        fs.unlink(installerPath, () => {});
        onProgress?.(90, "安装程序已打开，请在弹出的窗口中完成安装");
        // 不等待用户完成，直接 resolve，用户点击刷新检测
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

async function installNodejs(sendProgress) {
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

async function installOpenClaw(sendProgress) {
  return new Promise((resolve, reject) => {
    sendProgress(0, "正在安装 OpenClaw...");

    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const proc = spawn(npm, ["install", "-g", "openclaw@latest"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
    });

    let lastProgress = 0;
    const parseNpmOutput = (data) => {
      const str = data.toString();
      if (str.includes("fetch") || str.includes("extract") || str.includes("reify")) {
        lastProgress = Math.min(95, lastProgress + 10);
        sendProgress(lastProgress, str.trim().slice(0, 50) || "安装中...");
      }
    };

    proc.stdout?.on("data", parseNpmOutput);
    proc.stderr?.on("data", parseNpmOutput);

    proc.on("close", (code) => {
      if (code === 0) {
        sendProgress(100, "OpenClaw 安装完成");
        resolve({ ok: true });
      } else {
        reject(new Error(`npm 安装失败，退出码: ${code}`));
      }
    });
    proc.on("error", (err) => reject(err));
  });
}

async function installHomebrew(sendProgress) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "darwin" && process.platform !== "linux") {
      resolve({ ok: true, skipped: true });
      return;
    }

    sendProgress(0, "正在安装 Homebrew...");

    const scriptUrl = "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh";
    const scriptPath = path.join(os.tmpdir(), "brew-install.sh");

    https.get(scriptUrl, (res) => {
      const file = fs.createWriteStream(scriptPath);
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        sendProgress(30, "下载完成，正在执行安装脚本...");

        const proc = spawn("bash", [scriptPath], {
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, NONINTERACTIVE: "1" },
        });

        let progress = 30;
        const interval = setInterval(() => {
          progress = Math.min(95, progress + 3);
          sendProgress(progress, "Homebrew 安装中...");
        }, 1000);

        proc.stdout?.on("data", (d) => {
          sendProgress(progress, d.toString().trim().slice(0, 40) || "安装中...");
        });

        proc.on("close", (code) => {
          clearInterval(interval);
          fs.unlink(scriptPath, () => {});
          if (code === 0) {
            sendProgress(100, "Homebrew 安装完成");
            resolve({ ok: true });
          } else {
            reject(new Error(`Homebrew 安装失败，退出码: ${code}`));
          }
        });
        proc.on("error", reject);
      });
    }).on("error", reject);
  });
}

module.exports = {
  installNodejs,
  installOpenClaw,
  installHomebrew,
};
