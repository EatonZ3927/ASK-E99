import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { searchGamingNews, continueDeepThinking } from './services/geminiService';
import { ChatMessage } from './types';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// 游戏资讯搜索接口
app.post('/api/news/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'query 不能为空'
        }
      });
    }

    const result = await searchGamingNews(query.trim());
    res.json(result);
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '搜索请求失败'
      }
    });
  }
});

// 深度追问接口
app.post('/api/chat/followup', async (req, res) => {
  try {
    const { query, history } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'query 不能为空'
        }
      });
    }

    // 验证 history 格式
    const validHistory: ChatMessage[] = Array.isArray(history) 
      ? history.filter((msg: any) => 
          msg && 
          typeof msg === 'object' && 
          (msg.role === 'user' || msg.role === 'model')
        )
      : [];

    const result = await continueDeepThinking(validHistory, query.trim());
    res.json(result);
  } catch (error: any) {
    console.error('Followup error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '追问请求失败'
      }
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 ASK-E99 API 服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 健康检查: http://localhost:${PORT}/health`);
  console.log(`🔍 搜索接口: POST http://localhost:${PORT}/api/news/search`);
  console.log(`💬 追问接口: POST http://localhost:${PORT}/api/chat/followup`);
});
