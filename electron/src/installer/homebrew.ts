import path from "path";
import os from "os";
import fs from "fs";
import https from "https";
import { spawn } from "child_process";

type ProgressFn = (progress: number, message: string) => void;

export function installHomebrew(sendProgress: ProgressFn): Promise<{ ok: boolean }> {
  return new Promise((resolve, reject) => {
    if (process.platform !== "darwin" && process.platform !== "linux") {
      resolve({ ok: true });
      return;
    }

    sendProgress(0, "正在安装 Homebrew...");

    const scriptUrl = "https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh";
    const scriptPath = path.join(os.tmpdir(), "brew-install.sh");

    https
      .get(scriptUrl, (res) => {
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
      })
      .on("error", reject);
  });
}
