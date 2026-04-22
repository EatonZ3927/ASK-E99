import { GoogleGenAI } from "@google/genai";
import { SearchResult, GroundingChunk, ChatMessage, SearchSource, NewsItem } from "../types";

const API_KEY = 'AIzaSyCyTfLKnB1N_qD7VTvpQmKnt0qcOjBux-w';

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

// 文件转Base64
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 识别图片中的游戏
export const identifyGameFromImage = async (imageFile: File): Promise<{ gameName: string; description: string }> => {
  console.log('[DEBUG] identifyGameFromImage 开始');
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const currentTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  
  // 获取文件类型
  const mimeType = imageFile.type || 'image/jpeg';
  const base64Image = await fileToBase64(imageFile);
  
  try {
    console.log('[DEBUG] 调用 Gemini Vision API...');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            },
            {
              text: `请仔细分析这张图片，识别这是哪个游戏的截图或画面。

当前时间：${currentTime}

请从以下方面进行分析：
1. 游戏名称（如果能确定具体游戏）
2. 游戏类型（动作、RPG、射击、策略等）
3. 画面特征（UI元素、角色、场景、风格等）
4. 如果无法确定具体游戏，请给出最可能的几个候选游戏

请以JSON格式返回：
{
  "gameName": "游戏名称（如果确定）或"未知游戏"",
  "description": "详细描述图片内容和你识别依据"
}`
            }
          ]
        }
      ],
      config: {
        temperature: 0.3,
      },
    });

    console.log('[DEBUG] Vision API 响应:', response.text);
    
    // 解析响应
    let result = { gameName: '未知游戏', description: '' };
    try {
      const jsonMatch = response.text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result.description = response.text || '无法识别图片内容';
      }
    } catch (parseError) {
      console.error('[DEBUG] JSON 解析失败:', parseError);
      result.description = response.text || '无法识别图片内容';
    }

    return result;
  } catch (error: any) {
    console.error("[DEBUG] Vision API 错误:", error);
    throw new Error(`图片识别失败: ${error?.message || '未知错误'}`);
  }
};

// 根据识别的游戏搜索最新资讯
export const searchGameNewsByIdentifiedGame = async (gameName: string): Promise<SearchResult> => {
  console.log('[DEBUG] searchGameNewsByIdentifiedGame 开始, gameName:', gameName);
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const currentTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
  
  // 计算时间范围
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    console.log('[DEBUG] 搜索游戏资讯...');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `你是一名专业游戏资讯助手。用户上传了一张"${gameName}"的游戏截图，请搜索该游戏的最新动态和资讯。

**严格时间要求**：
- 当前日期：${today}
- 搜索范围：${oneWeekAgo} 至 ${today}（最近一周内的资讯优先）
- 如果一周内资讯不足，可扩展至 ${oneMonthAgo} 至 ${today}（最近一个月）
- 每条资讯必须标注具体日期，拒绝返回超过一个月的旧资讯

**搜索重点**：
1. 游戏更新、补丁、版本变动
2. 新内容发布（DLC、活动、赛季等）
3. 社区热点讨论
4. 官方公告和新闻
5. 玩家评价和反馈

请返回5-10条最新资讯，每条包含标题和描述（描述中包含日期信息）。JSON格式：
[{"title": "标题", "description": "描述（含日期）"}]`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.5,
      },
    });

    console.log('[DEBUG] 搜索响应:', response.text);
    
    // 解析响应
    let items: NewsItem[] = [];
    let responseText = response.text || '';
    
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]) as NewsItem[];
      } else if (responseText.trim()) {
        items = [{ title: `"${gameName}"相关资讯`, description: responseText }];
      }
    } catch (parseError) {
      console.error('[DEBUG] JSON 解析失败:', parseError);
      if (responseText.trim()) {
        items = [{ title: `"${gameName}"相关资讯`, description: responseText }];
      }
    }

    const text = items.length > 0 
      ? `已识别游戏：**${gameName}**，为您整理 ${items.length} 条最新动态：` 
      : `已识别游戏：**${gameName}**，但未找到近期相关资讯。`;
    
    const uniqueSources = extractSources(response.candidates);

    return {
      text: text,
      items: items,
      sources: uniqueSources
    };
  } catch (error: any) {
    console.error("[DEBUG] 搜索错误:", error);
    throw new Error(`资讯搜索失败: ${error?.message || '未知错误'}`);
  }
};

// 组合功能：识别图片并搜索资讯
export const analyzeImageAndSearchNews = async (imageFile: File): Promise<SearchResult> => {
  console.log('[DEBUG] analyzeImageAndSearchNews 开始');

  // 第一步：识别游戏
  const identification = await identifyGameFromImage(imageFile);
  console.log('[DEBUG] 识别结果:', identification);

  // 如果识别失败或不确定
  if (!identification.gameName || identification.gameName === '未知游戏') {
    return {
      text: `无法确定具体游戏。\n\n${identification.description}`,
      items: [],
      sources: []
    };
  }

  // 第二步：搜索该游戏的最新资讯
  const searchResult = await searchGameNewsByIdentifiedGame(identification.gameName);

  // 精简的识别说明
  return {
    ...searchResult,
    text: searchResult.text
  };
};

export const searchGamingNews = async (query: string): Promise<SearchResult> => {
  console.log('[DEBUG] searchGamingNews 开始, query:', query);
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const currentTime = new Date().toLocaleString();

  try {
    console.log('[DEBUG] 调用 Gemini API...');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `你是一名智能游戏资讯助手。请搜索关于"${query}"的最新游戏资讯。

当前时间：${currentTime}

请搜索相关新闻并返回5-10条资讯，每条包含标题和描述。以JSON数组格式返回：
[{"title": "标题", "description": "描述"}]`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    console.log('[DEBUG] API 响应成功');
    console.log('[DEBUG] response.text:', response.text);
    
    // 解析响应
    let items: NewsItem[] = [];
    let responseText = response.text || '';
    
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]) as NewsItem[];
      } else if (responseText.trim()) {
        items = [{ title: `关于"${query}"的资讯`, description: responseText }];
      }
    } catch (parseError) {
      console.error('[DEBUG] JSON 解析失败:', parseError);
      if (responseText.trim()) {
        items = [{ title: `关于"${query}"的资讯`, description: responseText }];
      }
    }

    const text = items.length > 0 
      ? `已为您整理 ${items.length} 条相关情报：` 
      : "未能检索到相关情报，请尝试其他关键词。";
    
    const uniqueSources = extractSources(response.candidates);
    console.log('[DEBUG] 提取的来源数量:', uniqueSources.length);

    return {
      text: text,
      items: items,
      sources: uniqueSources
    };
  } catch (error: any) {
    console.error("[DEBUG] Gemini API 错误:", error);
    console.error("[DEBUG] 错误消息:", error?.message);
    console.error("[DEBUG] 错误详情:", JSON.stringify(error, null, 2));
    throw new Error(`API 调用失败: ${error?.message || '未知错误'}`);
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
  console.log('[DEBUG] continueDeepThinking 开始');
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const historyForModel = history.map(msg => {
    let textContent = msg.text || "";
    if (msg.items && msg.items.length > 0) {
      textContent += "\n" + msg.items.map(i => `Title: ${i.title}\nContent: ${i.description}`).join('\n\n');
    }
    if (!textContent.trim()) textContent = " ";
    return { role: msg.role, parts: [{ text: textContent }] };
  });

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        tools: [{ googleSearch: {} }],
      },
      history: historyForModel
    });

    const response = await chat.sendMessage({ message: newQuery });
    
    return {
      role: 'model',
      text: response.text || "深度分析完成。",
      items: [],
      sources: extractSources(response.candidates)
    };
  } catch (error: any) {
    console.error("[DEBUG] Deep Thinking 错误:", error);
    throw new Error(`深度思考失败: ${error?.message || '未知错误'}`);
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
  console.log('[E99 Bridge] Ready');
}