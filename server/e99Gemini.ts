import { GoogleGenAI, Type } from "@google/genai";
import type { ChatMessage, GroundingChunk, NewsItem, SearchResult, SearchSource } from "../types";

const extractSources = (candidates: any[] | undefined): SearchSource[] => {
  const rawChunks = candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const chunks = rawChunks as GroundingChunk[];

  const sources = chunks
    .filter((chunk): chunk is { web: { title: string; uri: string } } => Boolean(chunk.web && chunk.web.title && chunk.web.uri))
    .map((chunk) => ({
      title: chunk.web.title,
      url: chunk.web.uri,
    }));

  return Array.from(new Map(sources.map((item) => [item.url, item])).values());
};

const getApiKey = () => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("Missing API_KEY in environment.");
  }
  return key;
};

export async function apiSearchGamingNews(query: string): Promise<SearchResult> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `你是一个专业的游戏资讯专家 E99。请针对以下问题提供最新、最准确的游戏新闻总结。

重要要求：
1. 请广泛搜索权威游戏媒体。
2. 必须包含 reddit.com (如 r/Games, r/GamingLeaksAndRumours) 上的玩家热门讨论、爆料或真实反馈。
3. 请将回答拆分为多个独立的资讯条目，每个条目包含标题和详细描述。

用户问题：${query}`,
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
            description: { type: Type.STRING },
          },
          required: ["title", "description"],
        },
      },
    },
  });

  const items = JSON.parse(response.text || "[]") as NewsItem[];
  const sources = extractSources(response.candidates);
  const text = items.map((i) => `### ${i.title}\n${i.description}`).join("\n\n");

  return { text, items, sources };
}

export async function apiContinueDeepThinking(history: ChatMessage[], newQuery: string): Promise<ChatMessage> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const historyForModel = history.map((msg) => {
    let textContent = msg.text || "";
    if (msg.items && msg.items.length > 0 && !textContent) {
      textContent = msg.items.map((i) => `Title: ${i.title}\nContent: ${i.description}`).join("\n\n");
    }
    if (!textContent.trim()) textContent = " ";
    return { role: msg.role, parts: [{ text: textContent }] };
  });

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction:
        "你是一个专业的游戏资讯专家 E99。现在请基于之前的讨论，对用户的新问题进行更深度的分析和回答。请特别关注 reddit.com 上的相关讨论。如果需要，请使用搜索工具获取最新信息。",
      tools: [{ googleSearch: {} }],
    },
    history: historyForModel,
  });

  const response = await chat.sendMessage({ message: newQuery });
  const text = response.text || "深度思考中遇到了点小问题。";
  const sources = extractSources(response.candidates);

  return { role: "model", text, sources };
}

