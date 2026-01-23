
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

export const searchGamingNews = async (query: string, dateRangeText?: string): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const currentTime = new Date().toLocaleString();
  
  // Determine time constraint based on user input
  const timeInstruction = dateRangeText 
    ? `**核心时间限制**：请严格筛选并搜索发布于 **${dateRangeText}** 期间的帖子和新闻。忽略此时间范围之外的内容。`
    : `**核心时间限制**：仅搜索和总结 **过去 24 小时内** 发布的帖子。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你是一个专注于 Reddit 社区 r/GamingLeaksAndRumours 的情报分析专家 E99。
      
      当前时间：${currentTime}
      
      核心任务：
      1. 请 **深入挖掘** Reddit 的 r/GamingLeaksAndRumours 版块。
      2. ${timeInstruction}
      3. **内容提炼精华**：
         - 提取该时间段内的游戏爆料、谣言或泄露内容。
         - **必须包含评论区精华**：总结高赞评论的观点、验证信息的真伪、社区的反应（如 "False" 标记、辟谣或补充证据）。
      4. 格式要求：
         - 将回答拆分为多个独立的资讯条目。
         - 每个条目包含标题（需吸睛）和详细描述（包含爆料内容及社区反馈）。
      
      用户关注话题（若为空则总结该时间段内的热门）：${query}`,
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
    const uniqueSources = extractSources(response.candidates);
    
    // Create a text fallback for history context
    const textFallback = items.map(i => `### ${i.title}\n${i.description}`).join('\n\n');

    return {
      text: textFallback,
      items: items,
      sources: uniqueSources
    };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

export const continueDeepThinking = async (
  history: ChatMessage[], 
  newQuery: string
): Promise<ChatMessage> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const currentTime = new Date().toLocaleString();
  
  // Format history for the chat API
  // Convert structured items back to text for context if needed
  const historyForModel = history.map(msg => {
    let textContent = msg.text || "";
    if (msg.items && msg.items.length > 0 && !textContent) {
        textContent = msg.items.map(i => `Title: ${i.title}\nContent: ${i.description}`).join('\n\n');
    }
    // Ensure text is not empty
    if (!textContent.trim()) textContent = " ";

    return {
      role: msg.role,
      parts: [{ text: textContent }]
    };
  });

  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `你是一个 r/GamingLeaksAndRumours 的资深分析师 E99。当前时间：${currentTime}。
      请基于用户之前的搜索结果，对用户的新问题进行更深度的追踪分析。
      请特别关注评论区中是否有新的证据更新、Mod 标记的变化或开发者的回应。`,
      tools: [{ googleSearch: {} }],
    },
    history: historyForModel
  });

  try {
    const response = await chat.sendMessage({ message: newQuery });
    const text = response.text || "深度思考中遇到了点小问题。";
    const uniqueSources = extractSources(response.candidates);

    return {
      role: 'model',
      text,
      sources: uniqueSources
    };
  } catch (error) {
    console.error("Deep Thinking Error:", error);
    throw error;
  }
};
