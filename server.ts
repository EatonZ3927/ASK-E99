/**
 * ASK-E99 HTTP 服务
 * - POST /api/news/search   body: { query }   → SearchResult
 * - POST /api/chat/followup body: { query, history } → ChatMessage
 * - 静态资源与 SPA 回退：dist/
 *
 * 环境变量：GEMINI_API_KEY 或 API_KEY（Gemini API Key）
 */

if (process.env.GEMINI_API_KEY) process.env.API_KEY = process.env.GEMINI_API_KEY;

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { searchGamingNews, continueDeepThinking } from './services/geminiService';
import type { ChatMessage } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const distDir = path.join(__dirname, 'dist');
const hasDist = existsSync(distDir);

app.use(express.json());
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));

// --- API ---

app.post('/api/news/search', async (req, res) => {
  try {
    const query = req.body?.query;
    if (!query || typeof query !== 'string' || !String(query).trim()) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'query 不能为空' }
      });
      return;
    }
    const result = await searchGamingNews(String(query).trim());
    res.json(result);
  } catch (e: any) {
    console.error('[api/news/search]', e);
    res.status(500).json({
      error: {
        code: 'UPSTREAM_ERROR',
        message: e?.message || '搜索请求失败'
      }
    });
  }
});

app.post('/api/chat/followup', async (req, res) => {
  try {
    const query = req.body?.query;
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!query || typeof query !== 'string' || !String(query).trim()) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'query 不能为空' }
      });
      return;
    }
    const messages: ChatMessage[] = history.map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      text: h.text ?? '',
      items: h.items,
      sources: h.sources
    }));
    const result = await continueDeepThinking(messages, String(query).trim());
    res.json(result);
  } catch (e: any) {
    console.error('[api/chat/followup]', e);
    res.status(500).json({
      error: {
        code: 'UPSTREAM_ERROR',
        message: e?.message || '追问请求失败'
      }
    });
  }
});

// --- 静态与 SPA（仅当已执行 npm run build 时）---

if (hasDist) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('ASK-E99 API 运行中。请先执行 npm run build 后刷新。');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ASK-E99 server listening on http://0.0.0.0:${PORT}`);
});
