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

function escapeLarkMarkdown(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/`/g, "\\`")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
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

function topicLabel(item) {
  const text = `${item.title} ${item.text}`.toLowerCase();

  if (text.includes("figma") || text.includes("prototype") || text.includes("design")) {
    return "设计工具";
  }

  if (text.includes("agent") || text.includes("智能体")) {
    return "Agent 体验";
  }

  if (text.includes("multimodal") || text.includes("voice") || text.includes("多模态")) {
    return "多模态交互";
  }

  if (text.includes("product") || text.includes("workflow") || text.includes("产品") || text.includes("工作流")) {
    return "产品工作流";
  }

  return "AI 产品观察";
}

function authorName(item) {
  return String(item.author || "AI builder")
    .replace(/\s*\(@[^)]+\)\s*$/, "")
    .trim();
}

function displayTitle(item, index) {
  const topic = topicLabel(item);
  const author = authorName(item);

  if (item.source === "Podcast") {
    return `${topic}｜${author} 新一期值得扫一眼`;
  }

  if (item.source === "Blog") {
    return `${topic}｜${author} 官方更新`;
  }

  const titleTemplates = [
    `${topic}｜${author} 的一条近期观察`,
    `${topic}｜来自 ${author} 的产品信号`,
    `${topic}｜${author} 提到的新变化`,
    `${topic}｜今天值得留意的一条动态`,
    `${topic}｜${author} 的实践线索`,
    `${topic}｜可能影响体验设计的信号`
  ];

  return titleTemplates[index % titleTemplates.length];
}

function excerptForItem(item) {
  const excerpt = item.title || item.text || "";
  return trimText(excerpt, 110);
}

function whyForDesigner(item, index) {
  const text = `${item.title} ${item.text}`.toLowerCase();
  const source = item.source || "来源";
  const author = item.author || "AI builder";

  if (text.includes("figma")) {
    return `${authorName(item)} 提到 Figma/设计工具相关变化，适合作为团队评估 AI 进入设计生产链路的观察点。`;
  }

  if (text.includes("prototype") || text.includes("design")) {
    return `${source} 里出现设计、原型或界面语境，值得看它是否会改变从想法到可交互方案的路径。`;
  }

  if (text.includes("agent") || text.includes("智能体")) {
    const agentReasons = [
      `这条和 Agent 有关，重点不只是技术能力，而是任务如何被拆解、确认、交接和反馈。`,
      `它适合从体验设计角度看：Agent 是在替人执行任务，还是在增加新的确认和管理成本。`,
      `可以拿它观察 Agent 产品的关键问题：用户怎么交代目标、怎么纠错、怎么信任结果。`
    ];
    return agentReasons[index % agentReasons.length];
  }

  if (text.includes("multimodal") || text.includes("voice") || text.includes("多模态")) {
    const multimodalReasons = [
      `多模态会改变输入和反馈方式，适合关注语音、图像、文本混合场景下的交互边界。`,
      `这类变化会影响用户如何表达意图，也会影响设计师定义状态、反馈和错误恢复。`
    ];
    return multimodalReasons[index % multimodalReasons.length];
  }

  if (text.includes("workflow") || text.includes("工作流")) {
    return `它指向工作流变化，适合思考哪些重复设计/产品动作会被 AI 接管，哪些仍要人来判断。`;
  }

  if (text.includes("product") || text.includes("产品")) {
    return `这条更偏产品形态观察，可以帮助判断 AI 功能是独立工具，还是会嵌入现有使用路径。`;
  }

  const fallbackReasons = [
    `来自 ${author} 的近期动态，可作为今天观察 AI 产品方向的线索。`,
    `这条信息不一定直接是 UI 话题，但能帮助判断 AI 产品叙事正在往哪里走。`,
    `适合快速扫一眼，看看是否会影响设计团队接下来要关注的能力边界。`
  ];

  return fallbackReasons[index % fallbackReasons.length];
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
  const elements = [
    {
      tag: "div",
      text: {
        tag: "lark_md",
        content: "AI UIUX日报\n\n今天自动筛选 follow-builders 内容源，优先推送和 **AI 产品设计、UX/UI、多模态、Agent 体验** 相关的线索。"
      }
    },
    {
      tag: "hr"
    }
  ];

  selected.forEach((item, index) => {
    const title = escapeLarkMarkdown(displayTitle(item, index));
    const excerpt = escapeLarkMarkdown(excerptForItem(item));
    const source = escapeLarkMarkdown(item.source || "来源未知");
    const author = escapeLarkMarkdown(item.author || "作者未知");
    const date = escapeLarkMarkdown(formatItemDate(item.publishedAt));
    const topic = escapeLarkMarkdown(topicLabel(item));
    const reason = escapeLarkMarkdown(whyForDesigner(item, index));
    const linkLine = item.url ? `[点击查看](${item.url})` : "原文链接：未提供";

    elements.push({
      tag: "div",
      text: {
        tag: "lark_md",
        content: `**${index + 1}. ${title}**\n\n${reason}\n\n原文摘录：${excerpt}\n\n${linkLine}\n\n${source} · ${author} · ${date} · ${topic}`
      }
    });

    if (index < selected.length - 1) {
      elements.push({
        tag: "hr"
      });
    }
  });

  elements.push({
    tag: "hr"
  });
  elements.push({
    tag: "div",
    text: {
      tag: "lark_md",
      content: "**今日趋势观察**\n\n免费规则版会更像线索卡片：先帮你稳定发现值得看的 AI UIUX 动态；之后如果接入大模型，再升级成更像人工编辑写的深度摘要。"
    }
  });

  return {
    msg_type: "interactive",
    card: {
      config: {
        wide_screen_mode: true
      },
      header: {
        template: "blue",
        title: {
          tag: "plain_text",
          content: `AI UIUX日报｜${shanghaiDate()}`
        }
      },
      elements
    }
  };
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

async function sendFeishuDigest(digest) {
  if (process.env.DRY_RUN === "1") {
    console.log("[DRY_RUN] Feishu message preview:");
    console.log(typeof digest === "string" ? digest : JSON.stringify(digest, null, 2));
    return;
  }

  const webhook = requiredEnv("FEISHU_WEBHOOK");
  const secret = process.env.FEISHU_SECRET;
  const payload = typeof digest === "string"
    ? {
        msg_type: "text",
        content: {
          text: digest
        }
      }
    : digest;

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
  await sendFeishuDigest(digest);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
