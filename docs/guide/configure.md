# 配置流程

配置流程与 `openclaw onboard` 保持一致，从 OpenClaw CLI 动态获取步骤与选项。

## 配置步骤

### 1. 模型与认证

- **选项来源**：`onboard-schema` 中的 `authOptions`
- **可选模型**：Ollama、OpenAI、自定义 API 等
- **动态表单**：根据所选模型展示对应配置项（API Key、Base URL 等）
- **默认值**：如自定义模型默认 `http://127.0.0.1:11434/v1`（Ollama）

### 2. 频道配置

- **选项来源**：`onboard-schema` 中的 `channels`
- **支持频道**：飞书、钉钉、Slack 等
- **按需配置**：选择频道后展示该频道的配置项
- **文档链接**：每个频道提供对应文档 URL（`docs.openclaw.ai/zh-CN/channels/{id}`）

**常见配置项**：

- `appId`、`appSecret`：应用凭证
- `dmPolicy`：私聊策略（pairing / allowlist 等）
- `groupPolicy`：群聊策略
- `requireMention`：是否需 @ 提及

### 3. Skills 配置

- **选项来源**：`onboard-schema` 中的 `skills` 与 `skillsOptions`
- **选择安装**：勾选要安装的 Skills，通过 clawhub 安装
- **手动添加**：支持输入 Skill 名称（如 `weather`）手动添加
- **全局选项**：部分 Skills 有全局配置项（如 CLAWHUB_WORKDIR）

### 4. 完成配置

- **预览**：展示将应用的模型、频道、Skills 摘要
- **应用配置**：调用 `apply-openclaw-config` IPC，执行 openclaw 配置写入
- **进度反馈**：显示「正在准备…」「正在安装依赖…」等
- **完成**：配置成功后提供「启动 OpenClaw」按钮

## 配置恢复

当用户再次进入配置流程时，会从 `currentConfig` 恢复已保存的：

- 模型选择与字段值
- 已选频道及字段值
- 已选 Skills 及字段值

## 插件依赖

部分频道（如飞书）需要额外 npm 依赖（如 `@larksuiteoapi/node-sdk`）。应用在应用配置时会自动在扩展目录或 openclaw 根目录执行 `npm install` 安装这些依赖。
