
import { GoogleGenAI } from "@google/genai";
import { SearchResult, GroundingChunk, ChatMessage, SearchSource } from "../types";

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
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你是一个专业的游戏资讯专家 E99。请针对以下问题提供最新、最准确的游戏新闻总结：${query}`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const text = response.text || "抱歉，我暂时无法获取相关资讯。";
    const uniqueSources = extractSources(response.candidates);

    return {
      text,
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
  
  // Format history for the chat API
  // Note: The first message in history is the initial model response.
  // We need to provide the context correctly.
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: '你是一个专业的游戏资讯专家 E99。现在请基于之前的讨论，对用户的新问题进行更深度的分析和回答。如果需要，请使用搜索工具获取最新信息。',
      tools: [{ googleSearch: {} }],
    },
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }))
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
