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
2. Set `VITE_DASHSCOPE_API_KEY` in `.env.local` to your Alibaba Cloud Model Studio (DashScope) API key:
   `VITE_DASHSCOPE_API_KEY=your_bailian_dashscope_api_key_here`
3. Run the app:
   `npm run dev`

## GitHub Pages deploy note

The app now calls Alibaba Cloud Model Studio through the OpenAI-compatible DashScope API. Set the key before building, then redeploy:

`VITE_DASHSCOPE_API_KEY=your_bailian_dashscope_api_key_here npm run deploy`

Optional environment variables:

- `VITE_DASHSCOPE_BASE_URL`: defaults to `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `VITE_DASHSCOPE_TEXT_MODEL`: defaults to `qwen-plus`
- `VITE_DASHSCOPE_VISION_MODEL`: defaults to `qwen-vl-max`

Because this is a static frontend app, any key used directly by the browser will still be visible in the built JavaScript. For production, use a small server-side proxy or serverless function to keep the DashScope key private.
