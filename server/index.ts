import "dotenv/config";
import express from "express";
import cors from "cors";
import { apiContinueDeepThinking, apiSearchGamingNews } from "./e99Gemini";
import type { ChatMessage } from "../types";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// 1) 对应 App.tsx 的“开启深度搜索”
// POST /api/news/search
// body: { query: string }
app.post("/api/news/search", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query : "";
  if (!query.trim()) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "query 不能为空" } });
  }

  try {
    const data = await apiSearchGamingNews(query.trim());
    return res.json(data);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: { code: "UPSTREAM_ERROR", message: "获取资讯失败" } });
  }
});

// 2) 对应 App.tsx 的“针对此答案进行深度追问”
// POST /api/chat/followup
// body: { history: ChatMessage[], query: string }
app.post("/api/chat/followup", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query : "";
  const history = Array.isArray(req.body?.history) ? (req.body.history as ChatMessage[]) : [];

  if (!query.trim()) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "query 不能为空" } });
  }

  try {
    const msg = await apiContinueDeepThinking(history, query.trim());
    return res.json(msg);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: { code: "UPSTREAM_ERROR", message: "深度思考失败" } });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`[E99 API] listening on http://localhost:${port}`);
});

