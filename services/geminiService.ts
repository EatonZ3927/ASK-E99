
import { GoogleGenAI } from "@google/genai";
import { SearchResult, GroundingChunk } from "../types";

// Search for gaming news using Gemini API with Google Search grounding
export const searchGamingNews = async (query: string): Promise<SearchResult> => {
  // Initialize AI client using the direct process.env.API_KEY as per guidelines
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

    // Access the generated text content directly via the .text property
    const text = response.text || "抱歉，我暂时无法获取相关资讯。";
    
    // Safely extract grounding chunks and cast to GroundingChunk[] to avoid 'unknown' type errors
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const chunks = rawChunks as GroundingChunk[];
    
    // Process chunks to extract source titles and URLs with a type guard to filter only valid web results
    const sources: { title: string; url: string }[] = chunks
      .filter((chunk): chunk is { web: { title: string; uri: string } } => 
        Boolean(chunk.web && chunk.web.title && chunk.web.uri)
      )
      .map(chunk => ({
        title: chunk.web.title,
        url: chunk.web.uri
      }));

    // Deduplicate sources by URL to ensure the final list contains unique entries
    const uniqueSources = Array.from(new Map(sources.map(item => [item.url, item])).values());

    return {
      text,
      sources: uniqueSources
    };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};
