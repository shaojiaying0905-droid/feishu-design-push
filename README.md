# AI 设计资讯飞书日报

这个小项目每天读取 `follow-builders` 的公开 feed，筛选出和 AI 产品设计、UX/UI、交互体验、多模态、Agent 体验、Figma/创意工具相关的内容，然后推送到飞书群机器人。

默认是免费规则筛选版，不需要 OpenAI API Key。以后如果想升级成更像编辑写的高质量中文摘要，再打开 OpenAI 模式。

## 你需要准备

1. 飞书群里的自定义机器人 Webhook。
2. 一个 GitHub 仓库，用 GitHub Actions 每天定时运行。
3. 可选：OpenAI API Key。只有你想用 AI 改写摘要时才需要。

## 飞书机器人设置

在飞书群里添加「自定义机器人」，安全设置建议先用「关键词」：

```text
AI UIUX日报
```

这样本项目生成的日报第一行包含这个关键词，机器人可以正常发送。

如果你选择「签名校验」，还需要把签名密钥保存成 `FEISHU_SECRET`。

## 本地测试

复制 `.env.example` 为 `.env`，填入真实密钥后运行：

```bash
export $(grep -v '^#' .env | xargs)
npm run test:dry-run
```

`DRY_RUN=1` 时只会生成内容并打印，不会发到飞书。

如果想先不消耗 OpenAI 额度，只测试飞书机器人能不能收到消息：

```bash
export $(grep -v '^#' .env | xargs)
npm run test:feishu
```

如果要真的发送到飞书：

```bash
export $(grep -v '^#' .env | xargs)
npm start
```

## GitHub Actions 部署

把这些文件上传到你的 GitHub 仓库后，进入仓库：

1. 打开 `Settings`。
2. 打开 `Secrets and variables` -> `Actions`。
3. 在 `Repository secrets` 添加：

```text
FEISHU_WEBHOOK
FEISHU_SECRET
```

其中 `FEISHU_SECRET` 只有你开启飞书机器人签名校验时才需要。

4. 如果以后想启用 OpenAI 摘要，在 `Repository secrets` 添加：

```text
OPENAI_API_KEY
```

然后在 `Variables` 里添加：

```text
USE_OPENAI=1
```

5. 如果想换模型，在 `Variables` 里添加：

```text
OPENAI_MODEL
```

默认是：

```text
gpt-4.1-mini
```

6. 打开 `Actions`，选择 `Daily AI Design News`，点击 `Run workflow` 手动测试一次。

默认每天北京时间 09:00 自动推送。

## 常见问题

如果运行时报错：

```text
OpenAI API error: 429 ... insufficient_quota
```

说明这个 OpenAI API key 当前没有可用 API 额度，通常需要在 OpenAI Platform 里开通计费或充值。ChatGPT 会员和 API 额度是两套体系，即使有 ChatGPT Plus/Pro，也可能仍然需要单独开通 API billing。

如果已经把 API key 发到聊天、文档或群里，建议在 OpenAI Platform 删除这个 key，重新创建一个新的 key，再放进 GitHub Secrets。
