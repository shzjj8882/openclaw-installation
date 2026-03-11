# 安装后操作

环境就绪后，应用提供以下能力。

## 启动与重启

- **启动**：当 Gateway 未运行时，显示「启动」按钮
- **重新启动**：当 Gateway 已运行时，显示「重新启动」按钮
- **状态检测**：通过 `openclaw gateway status --json` 解析 `service.runtime.status` 判断

**启动方式**：

- **后台启动**：勾选「后台启动」后，Gateway 在后台运行，不占用终端
- **前台启动**：不勾选时，在新终端窗口中运行 `openclaw gateway`

## 更改配置

点击「更改配置」进入内置终端：

- 自动执行 `openclaw onboard`
- 完成后进入交互式 shell，可继续运行 `openclaw config` 等命令
- 支持「← 返回」回到主视图

## 查看日志

当 Gateway 运行时，显示「查看日志」按钮：

- 点击后跳转到应用内日志页面
- 使用 `openclaw logs --follow --limit 500` 获取最近日志并实时跟踪
- 只读终端，不可输入
- 支持「← 返回」回到主视图

::: tip 日志说明
若长时间无输出，请确认 Gateway 已启动，且 `openclaw logs --follow` 在系统终端中可正常输出。
:::

## 文档入口

在终端视图与配置完成页提供「文档」按钮，跳转至 [OpenClaw 配置文档](https://docs.openclaw.ai/zh-CN/gateway/configuration)。
