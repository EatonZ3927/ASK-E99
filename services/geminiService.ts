
import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, GroundingChunk, ChatMessage, SearchSource, NewsItem } from "../types";

const extractSources = (candidates: any[] | undefined): SearchSource[] => {
  const rawChunks = candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const chunks = rawChunks as GroundingChunk[];
  
  const sources = chunks
    .filter((chunk): chunk is { web: { title: string; uri: string } } => 
      Boolean(chunk.web && chunk.web.title && chunk.web.uri)
    )
    .map(chunk => ({
      title: chunk.web.title,
      url: chunk.web.uri
    }));

  return Array.from(new Map(sources.map(item => [item.url, item])).values());
};

export const searchGamingNews = async (query: string): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const currentTime = new Date().toLocaleString();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你是一名智能游戏资讯助手。你的任务是为用户提供经过清洗、验证且易于理解的最新情报。

      当前时间：${currentTime}

      **核心情报源指令（最高优先级）**：
      本次任务 **必须** 深度挖掘 **Reddit (reddit.com)** 上的讨论。
      请重点关注 **r/GamingLeaksAndRumours**、**r/Games** 等核心板块的 **最新高热度帖子 (Hot/Top Posts)**。
      回答的内容应主要基于 Reddit 社区的真实讨论和泄露源。

      **数量要求**：
      请尽可能搜集并整理 **10条** 最具价值的最新情报。如果情报不足，请列出所有找到的高质量情报。

      **搜索与时间跨度策略（必须严格遵守）**：
      
      1. **场景一：泛一般性传闻查询**
         - 当用户输入如“最新游戏传闻”、“今天有什么瓜”、“最新爆料”、“News”等不针对特定游戏的宽泛请求时：
         - **时间跨度**：严格限定为 **过去 24 小时**。
         - **搜索建议**：主动搜索 "reddit gaming leaks today", "r/GamingLeaksAndRumours new 24h" 等。

      2. **场景二：特定游戏/主题查询**
         - 当用户询问具体游戏（如“Switch 2”、“GTA 6”、“怪物猎人”）的传闻时：
         - **时间跨度**：放宽至 **过去 3 个月**。
         - **搜索建议**：主动搜索 "reddit [游戏名] leak rumor" 等。

      **内容处理与表达优化协议**：
      - **客观陈述**：去除所有“特工点评”、“E99看法”等主观评论。只呈现经过梳理的事实。
      - **自适应表达**：
        - 对于 **复杂情报**（如硬件详细参数、长篇剧情泄露、收购案细节），请进行 **详细概括**，确保用户能理解来龙去脉。
        - 对于 **简单情报**（如单一发售日、商标注册、简单的传闻），请 **简练表达**，一针见血。
      - **易读性**：语言风格需通俗易懂，符合中文阅读习惯，避免生硬的翻译腔。
      - **去源头化**：虽然信息源来自 Reddit，但在正文中尽量直接陈述情报内容，不要频繁出现 "Reddit用户XXX说" 这种赘述，除非是必要的信源引用。

      **输出格式**：必须返回 **JSON 数组**。
        - title: 简练、吸睛的标题（不含Emoji）。
        - description: 经过优化的情报内容主体。

      本次任务目标（若为空则搜集今日全网最重磅的泄露）：${query}`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "description"]
          }
        }
      },
    });

    const items = JSON.parse(response.text || "[]") as NewsItem[];
    // Fallback text if items are empty, or a summary intro
    const text = items.length > 0 ? `已为您整理 ${items.length} 条相关情报：` : "未能检索到相关情报，请尝试其他关键词。";
    const uniqueSources = extractSources(response.candidates);

    return {
      text: text,
      items: items,
      sources: uniqueSources
    };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

interface DeepThinkResponse {
  analysis: string;
  points: NewsItem[];
}

export const continueDeepThinking = async (
  history: ChatMessage[], 
  newQuery: string
): Promise<ChatMessage> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const currentTime = new Date().toLocaleString();
  
  // Format history for the chat API
  const historyForModel = history.map(msg => {
    let textContent = msg.text || "";
    // If message has structured items, convert to text for context
    if (msg.items && msg.items.length > 0) {
        textContent += "\n" + msg.items.map(i => `Title: ${i.title}\nContent: ${i.description}`).join('\n\n');
    }
    if (!textContent.trim()) textContent = " ";

    return {
      role: msg.role,
      parts: [{ text: textContent }]
    };
  });

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `你是一个专业的游戏行业分析助手。当前时间：${currentTime}。
      请基于此前的行业爆料信息（主要来自 Reddit），对用户的新追问进行客观、深度的解析。
      
      请务必以 **JSON** 格式返回结果，包含以下两个字段：
      1. **analysis** (string): 一段完整、深度且客观的分析文本，回答用户的问题。
      2. **points** (array): 将你的分析拆解为若干个关键要点（title, description），就像新闻条目一样，便于用户快速阅读。如果没有特定的要点，可以为空。

      若需要进行额外搜索，请优先参考 Reddit 上的讨论。
      回答请保持分段清晰，语气专业且友善。`,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING, description: "Detailed analysis text." },
          points: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            }
          }
        },
        required: ["analysis", "points"]
      }
    },
    history: historyForModel
  });

  try {
    const response = await chat.sendMessage({ message: newQuery });
    const jsonStr = response.text || "{}";
    const json = JSON.parse(jsonStr) as DeepThinkResponse;
    const uniqueSources = extractSources(response.candidates);

    return {
      role: 'model',
      text: json.analysis || "深度分析完成。",
      items: json.points || [],
      sources: uniqueSources
    };
  } catch (error) {
    console.error("Deep Thinking Error:", error);
    throw error;
  }
};

// --- WeChat Mini Program Bridge Interface ---

interface E99Response<T> {
  code: number;
  data: T | null;
  msg: string;
}

declare global {
  interface Window {
    E99MiniProgramBridge: {
      search: (query: string) => Promise<E99Response<SearchResult>>;
      deepThink: (history: ChatMessage[], newQuery: string) => Promise<E99Response<ChatMessage>>;
    };
  }
}

if (typeof window !== 'undefined') {
  window.E99MiniProgramBridge = {
    search: async (query: string) => {
      try {
        const result = await searchGamingNews(query);
        return { code: 0, data: result, msg: 'success' };
      } catch (e: any) {
        return { code: -1, data: null, msg: e.message || 'Unknown error' };
      }
    },
    deepThink: async (history: ChatMessage[], newQuery: string) => {
      try {
        const result = await continueDeepThinking(history, newQuery);
        return { code: 0, data: result, msg: 'success' };
      } catch (e: any) {
        return { code: -1, data: null, msg: e.message || 'Unknown error' };
      }
    }
  };
  console.log('[E99 Bridge] Ready. Accessible via window.E99MiniProgramBridge');
}
