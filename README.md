# OpenClaw 安装助手

图形化引导安装 OpenClaw，降低小白用户的使用门槛。

## 功能

- **安装流程**：引导安装 Node.js、Homebrew（macOS/Linux）、OpenClaw
- **配置流程**：模型选择、API Key 配置、Channels、Skills，与 `openclaw onboard` 对齐
- **内置终端**：支持启动/重启 Gateway、执行 `openclaw onboard` 等命令

---

## Electron 技术栈

| 层级 | 技术 |
|------|------|
| **运行时** | Electron 33 |
| **构建** | electron-vite、Vite 5 |
| **渲染** | React 19、TypeScript |
| **样式** | TailwindCSS、shadcn/ui（Radix UI） |
| **终端** | xterm.js、node-pty |
| **打包** | electron-builder |
| **包管理** | pnpm workspace |

---

## 架构

```
electron/
├── src/
│   ├── main/           # 主进程
│   │   ├── index.ts    # 入口、IPC 注册
│   │   ├── window.ts   # 窗口创建、开发/生产加载逻辑
│   │   ├── pty.ts      # node-pty 管理、终端 IPC
│   │   ├── fetchSchema.ts / onboardSchema.ts   # 从 openclaw CLI 解析 schema
│   │   ├── fetchCurrentConfig*.ts              # 读取现有配置
│   │   ├── applyConfig*.ts                     # 执行 openclaw onboard 配置
│   │   └── ipcHandlers*.ts                    # 环境检测、脚本生成等 IPC
│   ├── preload/        # 预加载脚本，暴露 contextBridge API
│   ├── renderer/       # React 渲染进程
│   │   ├── components/ # InstallFlow、PostInstallView、TerminalView、ConfigureFlow 等
│   │   └── contexts/   # AppContext、EnvContext、FooterContext
│   └── installer/     # 安装逻辑
│       ├── nodejs.ts   # Node.js 安装
│       ├── homebrew.ts # Homebrew 安装
│       ├── openclaw.ts # OpenClaw 安装
│       └── download.ts # 下载/脚本生成
├── build/              # 打包资源（icon.png 由 generate-icon 生成）
└── electron.vite.config.ts
```

- **主进程**：窗口、IPC、PTY、配置读写、schema 解析
- **预加载**：`contextBridge` 暴露 `openclaw onboard` 相关 API 给渲染进程
- **渲染进程**：React + TailwindCSS，安装流程、配置表单、终端视图

---

## 打包

打包前会执行 `generate-icon` 生成 `build/icon.png`，再执行 `electron-vite build` 与 `electron-builder`。

| 平台 | 命令 | 产物 |
|------|------|------|
| macOS | `pnpm package:mac` | DMG、ZIP |
| Windows | `pnpm package:win` | NSIS 安装程序、Portable |
| Linux | `pnpm package:linux` | AppImage、deb |

### CI 自动发布

推送 `v*` 标签（如 `v0.1.0`）后，GitHub Actions 会自动构建三平台安装包并发布到 [Releases](https://github.com/shzjj8882/openclaw-installation/releases)：

```bash
git tag v0.1.0
git push origin v0.1.0
```

---

## 安装环境要求

| 项目 | 说明 |
|------|------|
| **Node.js** | 开发 ≥ 20，打包需本机安装 |
| **pnpm** | 推荐 9.x |
| **macOS 打包** | 需 macOS 系统，可选 Xcode 命令行工具 |
| **Windows 打包** | 需 Windows 系统 |
| **Linux 打包** | 需 Linux 系统，部分依赖见 `electron-builder` 文档 |

---

## 开发

```bash
pnpm install
pnpm dev:electron    # 启动 Electron 开发（renderer 端口 5173）
```

文档：`docs/` 为 VitePress 项目，`pnpm docs:dev` 可本地预览。
