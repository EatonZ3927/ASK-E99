## E99 小程序 API（对应 `App.tsx`）

### 基础信息

- **Base URL**：`http(s)://<你的域名>`
- **Content-Type**：`application/json`
- **环境变量**：
  - **`API_KEY`**：Google Gemini API Key（必须，放服务端，避免小程序泄露）
  - **`PORT`**：服务端端口（默认 `8787`）
 - **本地配置**：本仓库由于忽略规则无法提交 `.env` 示例，请参考 `server/env.example.txt`，在项目根目录自行创建 `.env`（或在运行环境注入变量）。

### 统一错误格式

当 HTTP 状态码为 4xx/5xx 时：

```json
{
  "error": {
    "code": "BAD_REQUEST | UPSTREAM_ERROR",
    "message": "..."
  }
}
```

---

### 1) 健康检查

**GET** `/api/health`

响应：

```json
{ "ok": true }
```

---

### 2) 开启深度搜索（新闻简报）

对应 `App.tsx`：`searchGamingNews(query)`（首次搜索）

**POST** `/api/news/search`

请求：

```json
{ "query": "PS5 Pro" }
```

响应（结构与 `types.ts` 的 `SearchResult` 对齐）：

```json
{
  "text": "### 标题1\n内容...\n\n### 标题2\n内容...",
  "items": [{ "title": "标题1", "description": "内容..." }],
  "sources": [{ "title": "来源标题", "url": "https://..." }]
}
```

---

### 3) 深度追问（基于历史对话）

对应 `App.tsx`：`continueDeepThinking(history, query)`（追问）

**POST** `/api/chat/followup`

请求（history 与 `types.ts` 的 `ChatMessage[]` 对齐）：

```json
{
  "query": "那它在 Reddit 上争议点是什么？",
  "history": [
    {
      "role": "model",
      "text": "### ...",
      "items": [{ "title": "...", "description": "..." }],
      "sources": [{ "title": "...", "url": "https://..." }]
    },
    { "role": "user", "text": "我想了解 XXX" }
  ]
}
```

响应（结构与 `types.ts` 的 `ChatMessage` 对齐）：

```json
{
  "role": "model",
  "text": "深度分析内容...",
  "sources": [{ "title": "来源标题", "url": "https://..." }]
}
```

---

### uuiapp + vue2 小程序调用示例（伪代码）

> 你只需要把 `baseUrl` 替换成你部署的域名即可。

```js
const baseUrl = 'https://api.example.com'

// 1) 搜索
uni.request({
  url: baseUrl + '/api/news/search',
  method: 'POST',
  header: { 'content-type': 'application/json' },
  data: { query: '黑神话：悟空 最新评价' },
  success: (res) => console.log(res.data),
})

// 2) 追问
uni.request({
  url: baseUrl + '/api/chat/followup',
  method: 'POST',
  header: { 'content-type': 'application/json' },
  data: { query: '再深入讲讲', history: [] },
  success: (res) => console.log(res.data),
})
```

