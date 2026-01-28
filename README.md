<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1TC46x6OocX_q0rm2gJqVigfJEVkl0i2D

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## API 服务（小程序 / Cloud Run）

本项目提供 HTTP API，供微信小程序云函数代理调用：

| 接口 | 方法 | Body | 说明 |
|------|------|------|------|
| `/api/news/search` | POST | `{ "query": "搜索关键词" }` | 游戏资讯搜索，返回 `{ text, items, sources }` |
| `/api/chat/followup` | POST | `{ "query": "追问内容", "history": [] }` | 深度追问，返回 `{ role, text, items, sources }` |

**本地启动 API 服务：**

1. `npm install`
2. 设置环境变量 `GEMINI_API_KEY` 或 `API_KEY`
3. 构建前端：`npm run build`
4. 启动服务：`npm start`（默认端口 3000，可通过 `PORT` 修改）

**Cloud Run 部署：** 构建阶段执行 `npm run build`，启动命令为 `npm start`；在 Cloud Run 中配置环境变量 `GEMINI_API_KEY`。
