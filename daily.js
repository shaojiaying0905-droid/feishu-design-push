import { createHmac } from "node:crypto";

const FEEDS = [
  {
    name: "X/Twitter builders",
    url: "https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json"
  },
  {
    name: "AI podcasts",
    url: "https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json"
  },
  {
    name: "Official AI blogs",
    url: "https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json"
  }
];

const DESIGN_KEYWORDS = [
  "design",
  "designer",
  "figma",
  "ux",
  "ui",
  "user experience",
  "interface",
  "interaction",
  "prototype",
  "product",
  "workflow",
  "creative",
  "canvas",
  "multimodal",
  "agent",
  "voice",
  "claude",
  "openai",
  "anthropic",
  "生成式",
  "设计",
  "产品",
  "体验",
  "交互",
  "界面",
  "多模态",
  "智能体"
];

const IMPORTANT_KEYWORDS = [
  "figma",
  "design",
  "designer",
  "ux",
  "ui",
  "user experience",
  "interface",
  "interaction",
  "prototype",
  "product",
  "workflow",
  "creative",
  "canvas",
  "multimodal",
  "agent",
  "voice",
  "生成式",
  "设计",
  "产品",
  "体验",
  "交互",
  "界面",
  "多模态",
  "智能体",
  "工作流"
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function shanghaiDate() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  }).format(new Date());
}

async function fetchJson(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "User-Agent": "ai-design-news-feishu/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${feed.name}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function includesDesignSignal(text) {
  const lower = text.toLowerCase();
  return DESIGN_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function trimText(text, maxLength) {
  if (!text) return "";
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

function keywordScore(item) {
  const text = `${item.title} ${item.text}`.toLowerCase();
  return IMPORTANT_KEYWORDS.reduce((score, keyword) => {
    return text.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
}

function flattenFeeds(feeds) {
  const items = [];
  const [xFeed, podcastFeed, blogFeed] = feeds;

  for (const builder of xFeed.x || []) {
    for (const tweet of builder.tweets || []) {
      items.push({
        source: "X/Twitter",
        author: `${builder.name} (@${builder.handle})`,
        title: trimText(tweet.text, 120),
        text: trimText(tweet.text, 900),
        publishedAt: tweet.createdAt,
        url: tweet.url,
        score: Number(tweet.likes || 0) + Number(tweet.retweets || 0) * 3 + Number(tweet.replies || 0)
      });
    }
  }

  for (const podcast of podcastFeed.podcasts || []) {
    items.push({
      source: "Podcast",
      author: podcast.name,
      title: podcast.title,
      text: trimText(podcast.transcript, 2400),
      publishedAt: podcast.publishedAt,
      url: podcast.url,
      score: 0
    });
  }

  for (const blog of blogFeed.blogs || []) {
    items.push({
      source: "Blog",
      author: blog.sourceName || blog.name || "Official AI blog",
      title: blog.title,
      text: trimText(blog.content || blog.summary || blog.description, 1800),
      publishedAt: blog.publishedAt || blog.date,
      url: blog.url,
      score: 0
    });
  }

  const signaled = items.filter((item) => includesDesignSignal(`${item.title} ${item.text}`));
  const candidates = signaled.length >= 6 ? signaled : items;

  return candidates
    .sort((a, b) => {
      const keywordDelta = keywordScore(b) - keywordScore(a);
      if (keywordDelta !== 0) return keywordDelta;
      const dateDelta = new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
      if (dateDelta !== 0) return dateDelta;
      return b.score - a.score;
    })
    .slice(0, 35);
}

function whyForDesigner(item) {
  const text = `${item.title} ${item.text}`.toLowerCase();

  if (text.includes("figma") || text.includes("prototype") || text.includes("design")) {
    return "和设计工具、原型或设计流程相关，适合关注 AI 如何进入设计生产链路。";
  }

  if (text.includes("agent") || text.includes("智能体")) {
    return "和 Agent 产品体验相关，值得观察任务编排、人机协作和自动化界面的变化。";
  }

  if (text.includes("multimodal") || text.includes("voice") || text.includes("多模态")) {
    return "和多模态交互相关，可能影响未来 AI 产品的信息输入、反馈和可用性设计。";
  }

  if (text.includes("product") || text.includes("workflow") || text.includes("产品") || text.includes("工作流")) {
    return "和 AI 产品形态或工作流变化相关，适合产品与体验设计团队跟进。";
  }

  return "来自 AI builders 的近期动态，可作为观察 AI 产品和设计趋势的线索。";
}

function formatItemDate(value) {
  if (!value) return "时间未提供";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未提供";

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function buildFreeDigest(items) {
  const selected = items.slice(0, 6);
  const lines = [
    `AI设计资讯日报｜${shanghaiDate()}｜AI UIUX日报`,
    "",
    "今天使用免费规则版自动筛选 follow-builders 内容源：不调用付费大模型，只推送最可能和 AI 产品设计、UX/UI、多模态、Agent 体验相关的线索。",
    ""
  ];

  selected.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title || "未命名内容"}`);
    lines.push(`来源：${item.source}｜${item.author || "未知"}｜${formatItemDate(item.publishedAt)}`);
    lines.push(`为什么值得设计师关注：${whyForDesigner(item)}`);
    lines.push(`原文链接：${item.url || "未提供"}`);
    lines.push("");
  });

  lines.push("今日趋势观察：这是免费规则筛选版，优点是不花 OpenAI 额度、能稳定定时推送；缺点是摘要质量不如大模型，会更像资讯线索清单。以后想升级成更像编辑写的日报，再打开 OpenAI 模式即可。");

  return lines.join("\n");
}

async function buildDigest(items) {
  if (process.env.MOCK_DIGEST === "1") {
    return [
      `AI设计资讯日报｜${shanghaiDate()}｜AI UIUX日报`,
      "",
      "这是一条测试消息：飞书机器人已经可以收到项目推送。",
      "",
      "标题：AI 设计资讯推送链路测试",
      "为什么值得设计师关注：这说明抓取、摘要和飞书推送的自动化链路已经准备好接入正式内容。",
      "原文链接：https://github.com/zarazhangrui/follow-builders",
      "",
      "今日趋势观察：先把推送链路跑通，再逐步调优内容质量，是最稳的自动化搭建方式。"
    ].join("\n");
  }

  if (process.env.USE_OPENAI !== "1") {
    return buildFreeDigest(items);
  }

  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const today = shanghaiDate();

  const prompt = [
    "你是一位资深 AI 产品设计资讯编辑。请从候选内容中筛选最适合设计师、产品经理、AI 产品从业者阅读的信息，写成适合飞书群推送的中文日报。",
    "",
    "硬性要求：",
    `- 第一行必须包含：AI设计资讯日报｜${today}｜AI UIUX日报`,
    "- 只选 3 到 6 条，不要硬凑。",
    "- 每条必须包含：标题、为什么值得设计师关注、原文链接。",
    "- 优先关注：AI 产品设计、UX/UI、交互体验、生成式 UI、多模态体验、Agent 产品体验、Figma、设计工具、创意工具、AI 编程工具中的体验变化。",
    "- 忽略纯融资、纯算力、纯 API 或模型参数、和产品体验无关的技术细节。",
    "- 不要编造链接。候选内容没有链接时写：原文链接：未提供。",
    "- 最后用 2 到 4 句话写“今日趋势观察”。",
    "- 文风简洁、具体，不标题党。",
    "",
    "候选内容 JSON：",
    JSON.stringify(items, null, 2)
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4
    })
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(body)}`);
  }

  return body.choices?.[0]?.message?.content?.trim() || "";
}

function feishuSignature(timestamp, secret) {
  const stringToSign = `${timestamp}\n${secret}`;
  return createHmac("sha256", stringToSign).update("").digest("base64");
}

async function sendFeishuText(text) {
  if (process.env.DRY_RUN === "1") {
    console.log("[DRY_RUN] Feishu message preview:");
    console.log(text);
    return;
  }

  const webhook = requiredEnv("FEISHU_WEBHOOK");
  const secret = process.env.FEISHU_SECRET;
  const payload = {
    msg_type: "text",
    content: {
      text
    }
  };

  if (secret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    payload.timestamp = timestamp;
    payload.sign = feishuSignature(timestamp, secret);
  }

  const response = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const resultText = await response.text();

  if (!response.ok) {
    throw new Error(`Feishu webhook error: ${response.status} ${resultText}`);
  }

  let result;
  try {
    result = JSON.parse(resultText);
  } catch {
    result = { raw: resultText };
  }

  if (result.code && result.code !== 0) {
    throw new Error(`Feishu webhook rejected the message: ${JSON.stringify(result)}`);
  }

  console.log("Feishu message sent.");
}

async function main() {
  let items = [];

  if (process.env.MOCK_DIGEST !== "1") {
    console.log("Fetching follow-builders feeds...");
    const feeds = await Promise.all(FEEDS.map(fetchJson));
    items = flattenFeeds(feeds);

    if (items.length === 0) {
      throw new Error("No feed items found.");
    }

    console.log(`Found ${items.length} candidate items. Building digest...`);
  } else {
    console.log("Using mock digest for Feishu delivery test...");
  }

  const digest = await buildDigest(items);

  if (!digest) {
    throw new Error("Digest is empty.");
  }

  console.log("Digest generated.");
  await sendFeishuText(digest);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
