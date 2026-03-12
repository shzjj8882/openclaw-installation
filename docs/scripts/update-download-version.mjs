#!/usr/bin/env node
/**
 * 根据版本号生成 docs/guide/download.md
 * 用法: node update-download-version.mjs <tag>
 * 例: node update-download-version.mjs v0.1.0
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tag = process.argv[2] || "v0.1.0";
const version = tag.replace(/^v/, "");
const base = "https://github.com/shzjj8882/openclaw-installation/releases";
const dl = (file) => `${base}/download/${tag}/${encodeURIComponent(file)}`;

const content = `# 下载

选择与您设备匹配的版本下载 OpenClaw 安装助手。

## 最新版本 (${tag})

### macOS

| 设备类型 | 格式 | 下载 |
|----------|------|------|
| Apple Silicon (M1/M2/M3) | DMG 安装包 | [下载](${dl(`OpenClaw 安装助手-${version}-arm64.dmg`)}) |

::: tip 如何选择
- **Apple Silicon**：2020 年及之后购买的 Mac（M1/M2/M3 等）
- **Intel**：当前 CI 仅构建 Apple Silicon 版本，Intel 用户请前往 [Releases](${base}) 查看
:::

### Windows

| 设备类型 | 格式 | 下载 |
|----------|------|------|
| x64 (64 位) | NSIS 安装包 | [下载](${dl(`OpenClaw 安装助手 Setup ${version}.exe`)}) |

::: tip 如何选择
- **x64**：绝大多数 Windows 电脑
- **ARM64**：当前 CI 仅构建 x64 版本，ARM64 用户请前往 [Releases](${base}) 查看
:::

### Linux

| 设备类型 | 格式 | 下载 |
|----------|------|------|
| x64 (amd64) | deb 包 (Debian/Ubuntu) | [下载](${dl(`openclaw-installation-assistant-electron_${version}_amd64.deb`)}) |

---

## 历史版本

前往 [GitHub Releases](${base}) 查看所有历史版本并下载。
`;

const outPath = join(__dirname, "..", "guide", "download.md");
writeFileSync(outPath, content, "utf8");
console.log("Updated:", outPath, "with version", tag);
