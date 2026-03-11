import https from "https";
import http from "http";
import fs from "fs";

export function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (pct: number, msg: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath);

    protocol
      .get(url, { redirect: true }, (res) => {
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let downloaded = 0;

        res.on("data", (chunk) => {
          downloaded += chunk.length;
          const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          onProgress?.(pct, `下载中 ${Math.round((downloaded / 1024 / 1024) * 10) / 10} MB`);
        });

        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(destPath);
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
}
