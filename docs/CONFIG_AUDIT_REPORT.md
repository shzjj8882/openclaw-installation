# OpenClaw 安装助手 - 配置项完整列举与实现报告

> 本报告列举模型与认证、频道配置、Skills 配置三大模块的所有选项及对应条件，并记录实现状态。

**调研日期**: 2025-03-09  
**CLI 版本**: openclaw 2026.3.7

---

## 一、模型与认证 (auth-choice)

### 1.1 选项来源

`openclaw onboard --help` 的 `--auth-choice` 解析，完整列表（去重后）：

| auth-choice | 所需字段 | 友好显示名 | 实现状态 |
|-------------|----------|----------|----------|
| openai-api-key | openai-api-key | OpenAI API | ✓ 解析 |
| anthropic-api-key | anthropic-api-key | Anthropic (Claude) | ✓ 解析 |
| anthropic-api-key | anthropic-api-key | Anthropic (Claude) | ✓ 解析 |
| mistral-api-key | mistral-api-key | Mistral | ✓ 解析 |
| openrouter-api-key | openrouter-api-key | OpenRouter | ✓ 解析 |
| kilocode-api-key | kilocode-api-key | Kilo Gateway | ✓ 解析 |
| ai-gateway-api-key | ai-gateway-api-key | Vercel AI Gateway | ✓ 已补映射 |
| cloudflare-ai-gateway-api-key | account-id, gateway-id, api-key | Cloudflare AI Gateway | ✓ 解析 |
| moonshot-api-key | moonshot-api-key | 月之暗面 (Moonshot) | ✓ 解析 |
| kimi-code-api-key | kimi-code-api-key | Kimi Coding | ✓ 解析 |
| gemini-api-key | gemini-api-key | Google Gemini | ✓ 解析 |
| zai-api-key | zai-api-key | Z.AI | ✓ 已补映射 |
| xiaomi-api-key | xiaomi-api-key | 小米 | ✓ 已补映射 |
| minimax-api | minimax-api-key | MiniMax | ✓ 已补映射 |
| minimax-api-key-cn | minimax-api-key | MiniMax | ✓ 已补映射 |
| minimax-api-lightning | minimax-api-key | MiniMax | ✓ 已补映射 |
| minimax-cloud | minimax-api-key | MiniMax | ✓ 已补映射 |
| minimax-portal | minimax-api-key | MiniMax | ✓ 已补映射 |
| minimax | minimax-api-key | MiniMax | ✓ 已补映射 |
| synthetic-api-key | synthetic-api-key | Synthetic | ✓ 解析 |
| venice-api-key | venice-api-key | Venice | ✓ 解析 |
| together-api-key | together-api-key | Together AI | ✓ 解析 |
| huggingface-api-key | huggingface-api-key | Hugging Face | ✓ 解析 |
| opencode-zen | opencode-zen-api-key | OpenCode Zen | ✓ 已补映射 |
| xai-api-key | xai-api-key | xAI (Grok) | ✓ 解析 |
| litellm-api-key | litellm-api-key | LiteLLM | ✓ 解析 |
| qianfan-api-key | qianfan-api-key | 千帆 (Qianfan) | ✓ 解析 |
| volcengine-api-key | volcengine-api-key | 火山引擎 | ✓ 解析 |
| byteplus-api-key | byteplus-api-key | BytePlus | ✓ 解析 |
| qwen-portal | qianfan-api-key | 千问/通义 | ✓ 已补映射 |
| custom-api-key | custom-base-url, custom-model-id, custom-api-key, custom-compatibility | 自定义 API | ✓ 已补 custom-compatibility |
| apiKey | anthropic-api-key | Anthropic | ✓ 已补映射 |
| skip | 无 | 暂不配置 | ✓ |

**特殊说明**：cli/codex/oauth 等无需 API key 的选项由 valueToLabel 生成显示名。

### 1.2 实现方式

- 单 flag 模式：auth-choice 对应 `--xxx-api-key`，由 onboard help 解析
- 多 flag 模式：custom-api-key、cloudflare-ai-gateway-api-key 等硬编码映射
- 共用 flag：zai-*、minimax-* 系列映射到同一 key

---

## 二、频道配置 (channels add)

### 2.1 完整列举

| 频道 | 所需凭证字段 | CLI help | 实现方式 | 状态 |
|------|-------------|----------|----------|------|
| telegram | token | ✓ 描述含 Telegram | channels add --token | ✓ |
| discord | token | ✓ 描述含 Discord | channels add --token | ✓ |
| slack | bot-token, app-token | ✓ 描述含 Slack | channels add --bot-token --app-token | ✓ |
| whatsapp | 无（QR 配对） | --auth-dir 可选 | channels add | ✓ |
| feishu | app-id, app-secret | ❌ | config set accounts.main | ✓ 已 override |
| line | channel-access-token, channel-secret | ❌ | config set channelAccessToken, channelSecret | ✓ 已 override |
| msteams | app-id, app-password, tenant-id | ❌ | config set appId, appPassword, tenantId | ✓ 已 override |
| mattermost | bot-token, base-url | ❌ | config set botToken, baseUrl | ✓ 已 override |
| matrix | access-token, homeserver 等 | ✓ | channels add | ✓ |
| googlechat | audience, audience-type | ✓ | channels add | ✓ |
| signal | signal-number, http-* | ✓ | channels add | ✓ |
| imessage | db-path, region, service | ✓ | channels add | ✓ |
| irc | 待查 | ❌ | fallback token | ⚠️ |
| nostr | 待查 | ❌ | fallback token | ⚠️ |
| bluebubbles | webhook-* | ✓ | channels add | ✓ |
| zalo | 待查 | ❌ | fallback token | ⚠️ |
| zalouser | 待查 | ❌ | fallback token | ⚠️ |
| nextcloud-talk | 待查 | ❌ | fallback token | ⚠️ |
| synology-chat | 待查 | ❌ | fallback token | ⚠️ |
| tlon | ship, code, url 等 | ✓ | channels add | ✓ |

### 2.2 策略字段 (dmPolicy, groupPolicy, requireMention)

适用频道：telegram, discord, slack, whatsapp, mattermost, msteams, line, feishu, zalo  
写入：`config set channels.<id>.dmPolicy` 等

---

## 三、Skills 配置

### 3.1 选项来源

`openclaw skills list --json` 返回 `{ skills: [{ name, description, eligible }] }`

### 3.2 配置项

| 字段 | 类型 | 选项 | 说明 | 状态 |
|------|------|------|------|------|
| **多选** | 列表 | skills 数组 | 选择要安装的 skill 名称 | ✓ |
| node-manager | Select | npm, pnpm, bun | Skills 安装包管理器 | ✓ 已实现 |

### 3.3 Apply 逻辑

- `npm`（默认）：`npx clawhub install <skill>`
- `pnpm`：`pnpm exec clawhub install <skill>`
- `bun`：`bunx clawhub install <skill>`

设置 `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` 避免 pnpm/bun 交互式下载提示。

---

## 四、后台服务 (daemon)

| 字段 | 类型 | 选项 | 状态 |
|------|------|------|------|
| install-daemon | boolean | 安装/跳过 | ✓ |
| daemon-runtime | Select | node, bun | ✓ |

---

## 五、实现总结

### 5.1 已修复/新增

- **Auth**: minimax 系列、qwen-portal、ai-gateway-api-key、xiaomi-api-key 映射；custom-compatibility 选项；AUTH_LABELS 友好名
- **Channels**: LINE、MS Teams、Mattermost override + config set 写入
- **Skills**: node-manager (npm/pnpm/bun) 选项 + apply 时使用对应包管理器

### 5.2 待确认

- WhatsApp、Google Chat、IRC、Nostr、Zalo 等频道的 fallback 或专用 override
