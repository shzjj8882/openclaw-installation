# IconPark 图标与文档部署说明

## IconPark 图标库

### 下载与资源地址

| 资源 | 地址 |
|------|------|
| **官网（在线浏览/下载）** | https://iconpark.oceanengine.com/ |
| **GitHub 仓库** | https://github.com/bytedance/IconPark |
| **NPM 包** | [@icon-park/svg](https://www.npmjs.com/package/@icon-park/svg) / [@icon-park/vue-next](https://www.npmjs.com/package/@icon-park/vue-next) |

### 使用方式

- **官网**：访问后搜索图标，可在线编辑（线宽、颜色、主题），支持导出 SVG、PNG
- **NPM**：`pnpm add @icon-park/svg @icon-park/vue-next`（VitePress 使用 Vue 3，选 vue-next）
- **主题**：outline / filled / two-tone / multi-color

### 本项目中

- 图标配置：`docs/.vitepress/iconpark.ts`
- 在 `config.ts` 的 `socialLinks` 中通过 `icon: { svg: iconParkIcons.github }` 使用

---

## GitHub 自动编译部署

### 工作流说明

项目已配置 `.github/workflows/deploy-docs.yml`，实现：

- **触发**：`push` 到 `main` 分支 或 手动 `workflow_dispatch`
- **构建**：`pnpm install` → `pnpm --filter openclaw-installation-assistant-docs run build`
- **部署**：构建产物上传到 GitHub Pages

### 启用步骤

1. 打开仓库 **Settings** → **Pages**
2. 在 **Build and deployment** 中选择 **GitHub Actions** 作为源
3. 推送代码到 `main` 后，Actions 会自动构建并部署到 GitHub Pages

### 访问地址

部署成功后访问：`https://<org>.github.io/openclaw-installation-assistant/`
