# 架构设计

## 项目结构

```
openclaw-installation-assistant/
├── electron/                 # Electron 主应用
│   ├── src/
│   │   ├── main/             # 主进程
│   │   │   ├── index.ts      # 入口、IPC、窗口
│   │   │   ├── configSchema.ts
│   │   │   └── onboardSchema.ts
│   │   ├── renderer/         # 渲染进程（React）
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   └── lib/
│   │   └── preload/          # 预加载脚本
│   ├── installer/            # 安装逻辑（Node.js、OpenClaw、Homebrew）
│   └── build/
│       └── icon.png
├── app/                      # Next.js 应用（可选 Web 版）
└── docs/                     # VitePress 文档
```

## 进程架构

### 主进程（Main）

- **职责**：窗口管理、系统调用、子进程启动
- **IPC 通道**：
  - `check-env`：环境检测
  - `install-nodejs`、`install-openclaw`、`install-homebrew`：安装
  - `apply-openclaw-config`：应用配置
  - `check-gateway-status`、`launch-openclaw`：Gateway 控制
  - `pty-spawn`、`pty-write`、`pty-resize`、`pty-kill`：PTY 终端
  - `pty-data`、`pty-exit`：终端数据与退出事件

### 预加载脚本（Preload）

- **职责**：桥接主进程与渲染进程，通过 `contextBridge` 暴露安全 API
- **暴露对象**：`window.electron`（checkEnv、installNodejs、ptySpawn 等）

### 渲染进程（Renderer）

- **职责**：React UI、用户交互
- **状态管理**：AppContext（appState、envCheck、footerContent）
- **流程组件**：InstallFlow、ConfigureFlow、PostInstallView

## 数据流

```
用户操作 → Renderer → IPC (preload) → Main → 系统/子进程
                ↑                           ↓
                └────── 回调 / 事件 ──────────┘
```

## 终端实现

- **node-pty**：创建伪终端，spawn shell 或 openclaw 命令
- **xterm.js**：在浏览器中渲染终端输出
- **PTY ID**：
  - `openclaw-config-terminal`：配置终端（`openclaw onboard` + 交互 shell）
  - `openclaw-logs`：日志终端（`openclaw logs --follow`）

## 配置同步

- **onboard-schema**：主进程通过 `openclaw onboard --help` 等解析获取
- **推送时机**：窗口创建、配置流程进入时
- **currentConfig**：从 openclaw 读取已有配置，用于恢复表单
