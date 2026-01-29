# ASK-E99 API 服务器使用说明

## 概述

本项目提供了后端 API 服务器，用于为微信小程序云函数提供 HTTP 接口。云函数可以通过这些接口调用 Gemini AI 服务。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# Gemini API Key（必填）
# 从 https://aistudio.google.com/apikey 获取
API_KEY=your_gemini_api_key_here

# 服务器端口（可选，默认 3001）
PORT=3001
```

### 3. 启动服务器

```bash
# 开发模式（自动重启）
npm run server:dev

# 生产模式
npm run server
```

服务器默认运行在 `http://localhost:3001`

## API 接口

### 1. 健康检查

**GET** `/health`

返回服务器状态。

**响应示例：**
```json
{
  "ok": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. 游戏资讯搜索

**POST** `/api/news/search`

搜索游戏资讯。

**请求体：**
```json
{
  "query": "黑神话：悟空"
}
```

**响应示例：**
```json
{
  "text": "已为您整理 10 条相关情报：",
  "items": [
    {
      "title": "标题",
      "description": "描述内容"
    }
  ],
  "sources": [
    {
      "title": "来源标题",
      "url": "https://example.com"
    }
  ]
}
```

**错误响应：**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "query 不能为空"
  }
}
```

### 3. 深度追问

**POST** `/api/chat/followup`

基于历史对话进行深度追问。

**请求体：**
```json
{
  "query": "这个游戏的发售日期是什么时候？",
  "history": [
    {
      "role": "user",
      "text": "黑神话：悟空"
    },
    {
      "role": "model",
      "text": "已为您整理 10 条相关情报：",
      "items": [...],
      "sources": [...]
    }
  ]
}
```

**响应示例：**
```json
{
  "role": "model",
  "text": "深度分析内容...",
  "items": [
    {
      "title": "要点标题",
      "description": "要点描述"
    }
  ],
  "sources": [
    {
      "title": "来源标题",
      "url": "https://example.com"
    }
  ]
}
```

## 云函数配置

在微信小程序云开发控制台中，为云函数配置环境变量：

- **newsSearch** 云函数：
  - `BACKEND_BASE_URL` = `https://你的-ASK-E99-后端域名`
  
- **chatFollowup** 云函数：
  - `BACKEND_BASE_URL` = `https://你的-ASK-E99-后端域名`

## 部署建议

### 本地开发

1. 使用内网穿透工具（如 ngrok、frp）将本地服务暴露到公网
2. 在云函数中配置 `BACKEND_BASE_URL` 为穿透后的地址

### 生产环境

1. 将服务器部署到云服务器（如阿里云、腾讯云、AWS 等）
2. 配置域名和 HTTPS 证书
3. 在云函数中配置 `BACKEND_BASE_URL` 为生产环境地址

### 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.ts --interpreter tsx

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

## 注意事项

1. **API Key 安全**：不要将 `.env` 文件提交到版本控制系统
2. **CORS 配置**：当前已启用 CORS，允许所有来源。生产环境建议限制来源
3. **错误处理**：所有接口都包含错误处理，返回统一的错误格式
4. **超时设置**：Gemini API 调用可能有延迟，建议云函数超时时间设置为 60 秒以上

## 故障排查

1. **服务器无法启动**
   - 检查端口是否被占用
   - 检查 `API_KEY` 是否已配置

2. **API 调用失败**
   - 检查 `API_KEY` 是否有效
   - 查看服务器日志获取详细错误信息

3. **云函数调用失败**
   - 检查 `BACKEND_BASE_URL` 配置是否正确
   - 确认服务器可以公网访问
   - 检查服务器防火墙设置
