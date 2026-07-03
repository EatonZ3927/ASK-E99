import { SearchResult, ChatMessage, SearchSource, NewsItem } from "../types";

const DASHSCOPE_API_KEY =
  import.meta.env.VITE_DASHSCOPE_API_KEY ||
  import.meta.env.VITE_BAILIAN_API_KEY ||
  import.meta.env.VITE_QWEN_API_KEY ||
  import.meta.env.VITE_API_KEY ||
  '';

const DASHSCOPE_BASE_URL = (
  import.meta.env.VITE_DASHSCOPE_BASE_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1'
).replace(/\/$/, '');

const TEXT_MODEL = import.meta.env.VITE_DASHSCOPE_TEXT_MODEL || 'qwen-plus';
const VISION_MODEL = import.meta.env.VITE_DASHSCOPE_VISION_MODEL || 'qwen-vl-max';

type DashScopeRole = 'system' | 'user' | 'assistant';
type DashScopeTextPart = { type: 'text'; text: string };
type DashScopeImagePart = { type: 'image_url'; image_url: { url: string } };
type DashScopeMessage = {
  role: DashScopeRole;
  content: string | Array<DashScopeTextPart | DashScopeImagePart>;
};

interface DashScopeResponse {
  choices?: Array<{
    message?: {
      content?: string | null | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
}

type ParsedNewsItem = NewsItem & {
  sourceTitle?: string;
  sourceUrl?: string;
  url?: string;
};

const createMissingKeyError = () =>
  new Error('缺少阿里百炼 API Key，请在 .env.local 中配置 VITE_DASHSCOPE_API_KEY 后重新构建。');

const getMessageContent = (content: DashScopeResponse['choices'] extends Array<infer T>
  ? T extends { message?: { content?: infer C } }
    ? C
    : never
  : never): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(part => part.text || '').join('');
  }
  return '';
};

const requestDashScopeChat = async ({
  model,
  messages,
  temperature = 0.7,
  enableSearch = false,
}: {
  model: string;
  messages: DashScopeMessage[];
  temperature?: number;
  enableSearch?: boolean;
}): Promise<string> => {
  if (!DASHSCOPE_API_KEY) throw createMissingKeyError();

  const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      ...(enableSearch
        ? {
            enable_search: true,
            search_options: {
              forced_search: true,
              search_strategy: 'turbo',
            },
          }
        : {}),
    }),
  });

  const rawText = await response.text();
  let data: DashScopeResponse | null = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error?.message || rawText || response.statusText;
    throw new Error(`阿里百炼 API 调用失败 (${response.status}): ${message}`);
  }

  const content = getMessageContent(data?.choices?.[0]?.message?.content);
  if (!content.trim()) {
    throw new Error('阿里百炼 API 返回为空。');
  }

  return content;
};

const fileToDataUrl = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const stripCodeFence = (text: string) =>
  text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

const parseJsonArray = <T,>(text: string): T[] | null => {
  const cleaned = stripCodeFence(text);
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]) as T[];
  } catch (error) {
    console.error('[DEBUG] JSON array parse failed:', error);
    return null;
  }
};

const parseJsonObject = <T,>(text: string): T | null => {
  const cleaned = stripCodeFence(text);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]) as T;
  } catch (error) {
    console.error('[DEBUG] JSON object parse failed:', error);
    return null;
  }
};

const normalizeUrl = (url: string) => url.trim().replace(/[)\].,，。；;!?！？]+$/g, '');

const toSource = (title: string | undefined, rawUrl: string | undefined): SearchSource | null => {
  if (!rawUrl) return null;

  const url = normalizeUrl(rawUrl);
  if (!/^https?:\/\//i.test(url)) return null;

  let hostname = url;
  try {
    hostname = new URL(url).hostname;
  } catch {
    // Keep the URL itself as the fallback title when URL parsing is unexpectedly strict.
  }

  return {
    title: title || hostname,
    url,
  };
};

const uniqueSources = (sources: SearchSource[]): SearchSource[] => {
  return Array.from(new Map(sources.filter(s => s.url).map(item => [item.url, item])).values());
};

const extractSourcesFromText = (text: string): SearchSource[] => {
  const sources: SearchSource[] = [];

  for (const match of text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)) {
    const source = toSource(match[1], match[2]);
    if (source) sources.push(source);
  }

  for (const match of text.matchAll(/https?:\/\/[^\s"'<>，。；;]+/g)) {
    const source = toSource(undefined, match[0]);
    if (source) sources.push(source);
  }

  return uniqueSources(sources);
};

const parseNewsResult = (responseText: string, fallbackTitle: string) => {
  const parsed = parseJsonArray<ParsedNewsItem>(responseText);
  if (!parsed || parsed.length === 0) {
    return {
      items: responseText.trim() ? [{ title: fallbackTitle, description: responseText }] : [],
      sources: extractSourcesFromText(responseText),
    };
  }

  const items: NewsItem[] = parsed.map(item => ({
    title: item.title || fallbackTitle,
    description: item.description || '',
  }));

  const jsonSources = parsed
    .map(item => toSource(item.sourceTitle || item.title, item.sourceUrl || item.url))
    .filter((item): item is SearchSource => Boolean(item));

  return {
    items,
    sources: uniqueSources([...jsonSources, ...extractSourcesFromText(responseText)]),
  };
};

const buildNewsPrompt = (topic: string, strictRecent = false) => {
  const currentTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const today = new Date().toISOString().split('T')[0];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return `你是一名专业游戏资讯助手。请联网搜索关于"${topic}"的最新游戏资讯。

当前时间：${currentTime}
${strictRecent ? `优先搜索范围：${oneWeekAgo} 至 ${today}。如一周内资讯不足，可扩展至 ${oneMonthAgo} 至 ${today}。` : ''}

要求：
1. 返回 5-10 条游戏资讯，优先官方公告、权威媒体、Steam/主机商店、社区热点。
2. 每条描述必须包含具体日期或时间线。
3. 避免旧闻冒充新闻，无法确认日期时说明不确定。
4. 只返回 JSON 数组，不要返回 Markdown，不要添加解释。

JSON 格式：
[
  {
    "title": "标题",
    "description": "描述，包含日期和关键信息",
    "sourceTitle": "来源名称",
    "sourceUrl": "https://..."
  }
]`;
};

export const identifyGameFromImage = async (imageFile: File): Promise<{ gameName: string; description: string }> => {
  console.log('[DEBUG] identifyGameFromImage start');

  const imageUrl = await fileToDataUrl(imageFile);
  const currentTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  try {
    const responseText = await requestDashScopeChat({
      model: VISION_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            {
              type: 'text',
              text: `请仔细分析这张图片，识别这是哪个游戏的截图或画面。

当前时间：${currentTime}

请从以下方面分析：
1. 游戏名称，如果能确定具体游戏；
2. 游戏类型；
3. 画面特征，包括 UI、角色、场景、风格；
4. 如果无法确定，请给出最可能的候选游戏。

只返回 JSON：
{
  "gameName": "游戏名称或未知游戏",
  "description": "识别依据和图片内容描述"
}`,
            },
          ],
        },
      ],
    });

    return (
      parseJsonObject<{ gameName: string; description: string }>(responseText) || {
        gameName: '未知游戏',
        description: responseText || '无法识别图片内容',
      }
    );
  } catch (error: any) {
    console.error('[DEBUG] Vision API error:', error);
    throw new Error(`图片识别失败: ${error?.message || '未知错误'}`);
  }
};

export const searchGameNewsByIdentifiedGame = async (
  gameName: string,
  userQuery = ''
): Promise<SearchResult> => {
  console.log('[DEBUG] searchGameNewsByIdentifiedGame start, gameName:', gameName);

  const topic = userQuery.trim() ? `${gameName} ${userQuery.trim()}` : gameName;

  try {
    const responseText = await requestDashScopeChat({
      model: TEXT_MODEL,
      temperature: 0.5,
      enableSearch: true,
      messages: [
        {
          role: 'system',
          content: '你是 ASK E99，一名严谨的中文游戏资讯分析助手。',
        },
        {
          role: 'user',
          content: buildNewsPrompt(topic, true),
        },
      ],
    });

    const { items, sources } = parseNewsResult(responseText, `"${gameName}"相关资讯`);

    return {
      text:
        items.length > 0
          ? `已识别游戏：**${gameName}**，为您整理 ${items.length} 条最新动态：`
          : `已识别游戏：**${gameName}**，但未找到近期相关资讯。`,
      items,
      sources,
    };
  } catch (error: any) {
    console.error('[DEBUG] Search API error:', error);
    throw new Error(`资讯搜索失败: ${error?.message || '未知错误'}`);
  }
};

export const analyzeImageAndSearchNews = async (
  imageFile: File,
  userQuery = ''
): Promise<SearchResult> => {
  console.log('[DEBUG] analyzeImageAndSearchNews start');

  const identification = await identifyGameFromImage(imageFile);
  console.log('[DEBUG] identification:', identification);

  if (!identification.gameName || identification.gameName === '未知游戏') {
    return {
      text: `无法确定具体游戏。\n\n${identification.description}`,
      items: [],
      sources: [],
    };
  }

  return searchGameNewsByIdentifiedGame(identification.gameName, userQuery);
};

export const searchGamingNews = async (query: string): Promise<SearchResult> => {
  console.log('[DEBUG] searchGamingNews start, query:', query);

  try {
    const responseText = await requestDashScopeChat({
      model: TEXT_MODEL,
      temperature: 0.7,
      enableSearch: true,
      messages: [
        {
          role: 'system',
          content: '你是 ASK E99，一名严谨的中文游戏资讯分析助手。',
        },
        {
          role: 'user',
          content: buildNewsPrompt(query),
        },
      ],
    });

    const { items, sources } = parseNewsResult(responseText, `关于"${query}"的资讯`);

    return {
      text:
        items.length > 0
          ? `已为您整理 ${items.length} 条相关情报：`
          : '未能检索到相关情报，请尝试其他关键词。',
      items,
      sources,
    };
  } catch (error: any) {
    console.error('[DEBUG] DashScope API error:', error);
    throw new Error(`API 调用失败: ${error?.message || '未知错误'}`);
  }
};

export const continueDeepThinking = async (
  history: ChatMessage[],
  newQuery: string
): Promise<ChatMessage> => {
  console.log('[DEBUG] continueDeepThinking start');

  const historyForModel: DashScopeMessage[] = history.map(msg => {
    let textContent = msg.text || '';
    if (msg.items && msg.items.length > 0) {
      textContent +=
        '\n' +
        msg.items.map(item => `Title: ${item.title}\nContent: ${item.description}`).join('\n\n');
    }

    return {
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: textContent.trim() || ' ',
    };
  });

  try {
    const responseText = await requestDashScopeChat({
      model: TEXT_MODEL,
      temperature: 0.7,
      enableSearch: true,
      messages: [
        {
          role: 'system',
          content:
            '你是 ASK E99，一名严谨的中文游戏资讯分析助手。回答追问时可以联网搜索，优先补充最新、可验证的信息。',
        },
        ...historyForModel,
        {
          role: 'user',
          content: newQuery,
        },
      ],
    });

    return {
      role: 'model',
      text: responseText || '深度分析完成。',
      items: [],
      sources: extractSourcesFromText(responseText),
    };
  } catch (error: any) {
    console.error('[DEBUG] Deep thinking error:', error);
    throw new Error(`深度思考失败: ${error?.message || '未知错误'}`);
  }
};

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
    },
  };
  console.log('[E99 Bridge] Ready');
}
