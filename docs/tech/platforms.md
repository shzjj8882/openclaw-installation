# 平台支持

## 支持平台

| 平台 | 安装 | 配置 | 打包 |
|------|------|------|------|
| macOS | ✅ | ✅ | DMG、ZIP |
| Windows | ✅ | ✅ | NSIS、Portable |
| Linux | ✅ | ✅ | AppImage、deb |

## 平台差异

### 环境检测

| 检测项 | macOS | Windows | Linux |
|--------|-------|---------|-------|
| Node.js | `node -v` | `node -v` | `node -v` |
| Homebrew | `which brew` | 跳过（视为已满足） | `which brew` |
| OpenClaw | `which openclaw` | `where openclaw` | `which openclaw` |

### PATH 配置

- **macOS**：`/opt/homebrew/bin`、`/usr/local/bin`、`~/.local/bin`
- **Windows**：`%APPDATA%\npm`
- **Linux**：`~/.local/bin`

### 终端与 Shell

- **配置终端**：
  - macOS/Linux：`zsh -i -c "openclaw onboard; exec zsh -i"`（使用 `ZDOTDIR=/var/empty` 避免 .zshrc 加载问题）
  - Windows：PowerShell
- **日志终端**：直接 spawn `openclaw logs --follow`，或通过 shell 执行

### 外部终端

- **macOS**：`osascript` 调用 Terminal.app
- **Windows**：`cmd /c start cmd /k`
- **Linux**：`x-terminal-emulator -e`

## 打包输出

- **macOS**：`dist/*.dmg`、`dist/*.zip`
- **Windows**：`dist/*.exe`（NSIS 安装包）、`dist/*.exe`（便携版）
- **Linux**：`dist/*.AppImage`、`dist/*.deb`
