# 动态 Schema 设计：从 OpenClaw CLI 拆解逻辑生成表单

## 一、目标

表单完全由 **运行时从 openclaw 命令解析** 生成，不依赖硬编码映射。当 OpenClaw 因市场变动调整 CLI 结构时，安装助手自动适配。

---

## 二、当前 OpenClaw 可提供的运行时数据源

### 2.1 可直接解析的

| 数据源 | 命令 | 可获得内容 |
|--------|------|------------|
| **Auth 选项** | `openclaw onboard --help` | `--auth-choice` 的完整选项列表（如 openai-api-key\|anthropic-api-key\|...） |
| **Auth 字段** | `openclaw onboard --help` | 所有 `--xxx-api-key`、`--custom-base-url` 等 flag 及描述 |
| **频道列表** | `openclaw channels add --help` | `--channel` 的 (telegram\|discord\|...) 列表 |
| **频道 flag** | `openclaw channels add --help` | 所有 `--token`、`--bot-token` 等及描述 |
| **Skills 列表** | `openclaw skills list --json` | `{ skills: [{ name, description, eligible }] }` |
| **Daemon 选项** | `openclaw onboard --help` | `--daemon-runtime (node|bun)`、`--install-daemon` |

### 2.2 当前 CLI 未暴露的

| 缺失内容 | 说明 |
|----------|------|
| **Feishu 凭证** | `channels add --help` 无 `--app-id`、`--app-secret`，交互式向导内部使用 |
| **LINE 凭证** | 无 `--channel-access-token`、`--channel-secret` |
| **MS Teams 凭证** | 无 `--app-id`、`--app-password`、`--tenant-id` |
| **Mattermost 凭证** | 无 `--bot-token`、`--base-url` |
| **auth-choice → flag 映射** | 如 minimax-api 对应 minimax-api-key，help 无此关系 |

### 2.3 可尝试的扩展数据源

| 数据源 | 路径/方式 | 说明 |
|--------|-----------|------|
| **cli-startup-metadata.json** | `openclaw 安装目录/dist/cli-startup-metadata.json` | 含 channelOptions 列表，可解析 openclaw 安装路径后读取 |
| **Config Schema** | config.clawi.sh（HTML）或 openclaw 包内 zod schema | 定义 channels.feishu.accounts.*.appId 等结构，目前无 JSON 接口 |

---

## 三、最大程度动态化的策略

### 3.1 Auth（模型与认证）

**原则**：仅用 help 解析 + 通用约定，不做 per-choice 硬编码。

1. **选项列表**：从 `--auth-choice` 的 `(a|b|c|...)` 解析
2. **字段推断**：对每个 auth-choice，按以下规则尝试匹配 flag：
   - 直接匹配：`allFlags.get(choice)` 
   - 加 `-api-key`：`allFlags.get(choice + "-api-key")` 或 `allFlags.get(choice.replace(/-api-key$/, "") + "-api-key")`
   - 特殊：`custom-api-key` → 解析 custom-base-url, custom-model-id, custom-api-key（若 help 中有）
   - 特殊：`cloudflare-ai-gateway-api-key` → 解析 account-id, gateway-id, api-key（若 help 中有）
3. **显示名**：优先用 `allFlags.get(choice)?.label`，否则用 `choice` 转首字母大写

**无法动态**：若 auth-choice 为 `minimax-api` 而 flag 为 `minimax-api-key`，help 不体现此关系，需约定（如「尝试 choice + '-api-key'」）而非硬编码每个 choice。

### 3.2 频道（Channels）

**原则**：help 解析 + 可选 schema 补充。

1. **频道列表**：从 `--channel (a|b|c|...)` 解析
2. **字段推断**：对每个 flag，从描述推断适用频道：
   - 描述含 "Telegram" → telegram
   - 描述含 "Slack" → slack
   - 描述含 "Discord" → discord
   - 等
3. **help 未覆盖的频道**（如 feishu、line、msteams、mattermost）：
   - **方案 A**：从 config schema 解析（若可获取 JSON）
   - **方案 B**：读取 openclaw 包内 schema（若可定位）
   - **方案 C**：保留最小「fallback」——仅当 channel 在 help 中无任何匹配 flag 时，显示通用「凭证配置」占位，由用户手动填写或后续通过 config 编辑

### 3.3 Skills

**原则**：完全动态。

1. **列表**：`openclaw skills list --json`
2. **字段**：从 `openclaw onboard --help` 解析 `--node-manager (npm|pnpm|bun)`，作为可选 Select

### 3.4 后台服务（Daemon）

**原则**：完全动态。

1. **字段**：从 help 解析 `--install-daemon`、`--daemon-runtime (node|bun)`

---

## 四、实现建议

### 4.1 移除的硬编码

- `CHANNEL_OVERRIDE_FIELDS`（feishu、line、msteams、mattermost）
- `AUTH_LABELS`
- `getFlagsForAuthChoice` 中的 per-choice 分支（minimax、qwen-portal、ai-gateway 等）

### 4.2 保留的通用逻辑

- **Auth**：`auth-choice` 尝试 `choice`、`choice-api-key`、`choice.replace(/-api-key$/, "") + "-api-key"` 的通用匹配
- **Channels**：纯 help 描述解析：`parseChannelsFromDesc(flag, desc)` 按描述关键词匹配
- **Apply**：根据用户实际填写的 field 名称，动态决定用 `channels add --flag` 还是 `config set`（若 flag 不在 channels add help 中，则走 config set）

### 4.3 可选增强

1. **解析 openclaw 安装路径**：`npx openclaw --version` 或 `which openclaw` 推导，读取 `cli-startup-metadata.json` 获取 channelOptions
2. **向 OpenClaw 上游反馈**：建议提供 `--output json` 或 schema 导出，便于第三方工具动态生成表单
3. **config set 通用化**：对任意 channel，若用户填了 `fieldValues`，则按 `channels.<id>.<field>` 写入 config，不区分 channel 类型

---

## 五、结论

- **可完全动态**：Auth 选项、频道列表、Skills 列表、Daemon 选项、以及 help 中明确描述的 flag
- **受限于 CLI**：help 未列出的 channel 凭证（feishu、line、msteams、mattermost）无法从命令拆解，需 schema 或上游支持
- **折中方案**：用通用约定（如 auth-choice + "-api-key"）替代 per-choice 硬编码；对 help 无匹配的 channel 使用通用「凭证」占位或 config set 通用写入
