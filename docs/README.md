# OpenClaw 安装助手文档

基于 VitePress 构建，用于 GitHub Pages 部署。

## 本地开发

```bash
pnpm docs:dev
```

## 构建

```bash
pnpm docs:build
```

## GitHub Pages 部署

1. 在仓库 **Settings → Pages** 中，将 **Source** 设为 **GitHub Actions**
2. 推送代码到 `main` 分支后，`Deploy Docs` workflow 会自动构建并部署
3. 文档将发布至 `https://<owner>.github.io/openclaw-installation-assistant/`

::: tip 修改 base 路径
若仓库名不是 `openclaw-installation-assistant`，请修改 `.vitepress/config.ts` 中的 `base` 为 `/<你的仓库名>/`。
:::
