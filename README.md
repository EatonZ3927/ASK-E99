<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1TC46x6OocX_q0rm2gJqVigfJEVkl0i2D

## Run Locally

**Prerequisites:**  Node.js

### 前端应用

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

### API 服务器（用于云函数调用）

本项目还提供了后端 API 服务器，供微信小程序云函数调用。

1. 创建 `.env` 文件并配置 `API_KEY`：
   ```env
   API_KEY=your_gemini_api_key_here
   PORT=3001
   ```

2. 启动 API 服务器：
   ```bash
   # 开发模式（自动重启）
   npm run server:dev
   
   # 生产模式
   npm run server
   ```

3. 服务器将运行在 `http://localhost:3001`

详细使用说明请参考 [API_README.md](./API_README.md)
