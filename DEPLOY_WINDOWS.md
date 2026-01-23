# Windows 本地部署指南

本指南将帮助您在 Windows 环境下部署和运行 ASK-E99 服务。

## 📋 前置要求

### 1. 安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS 版本（推荐 18.x 或更高版本）
3. 运行安装程序，按照提示完成安装
4. 验证安装：打开 PowerShell 或命令提示符，运行：
   ```powershell
   node --version
   npm --version
   ```
   如果显示版本号，说明安装成功。

### 2. 获取 Gemini API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录您的 Google 账号
3. 点击 "Get API Key" 创建新的 API Key
4. 复制生成的 API Key（格式类似：`AIza...`）

## 🚀 部署步骤

### 步骤 1: 安装项目依赖

在项目根目录（`D:\wechatProject\server\ASK-E99`）打开 PowerShell 或命令提示符，运行：

```powershell
npm install
```

这将安装所有必需的依赖包（React、Vite、TypeScript 等）。

### 步骤 2: 配置环境变量

1. 在项目根目录创建 `.env.local` 文件（如果不存在）
2. 在文件中添加以下内容：

```env
GEMINI_API_KEY=你的API密钥
```

**示例：**
```env
GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **重要提示：**
- `.env.local` 文件已被 `.gitignore` 忽略，不会提交到版本控制
- 请妥善保管您的 API Key，不要泄露给他人
- 如果 API Key 无效或过期，应用将无法正常工作

### 步骤 3: 启动开发服务器

运行以下命令启动开发服务器：

```powershell
npm run dev
```

服务器启动后，您会看到类似以下输出：

```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

### 步骤 4: 访问应用

在浏览器中打开：**http://localhost:3000**

您应该能看到 ASK-E99 的界面，可以开始使用游戏资讯搜索功能。

## 🔧 常用命令

### 开发模式
```powershell
npm run dev
```
启动开发服务器，支持热重载，代码修改后自动刷新。

### 构建生产版本
```powershell
npm run build
```
构建优化后的生产版本，输出到 `dist` 目录。

### 预览生产构建
```powershell
npm run build
npm run preview
```
先构建，然后预览生产版本的效果。

## 🐛 常见问题排查

### 问题 1: `npm install` 失败

**解决方案：**
- 检查网络连接
- 尝试使用国内镜像：
  ```powershell
  npm config set registry https://registry.npmmirror.com
  npm install
  ```

### 问题 2: 端口 3000 已被占用

**解决方案：**
- 修改 `vite.config.ts` 中的端口号：
  ```typescript
  server: {
    port: 3001,  // 改为其他端口
    host: '0.0.0.0',
  }
  ```

### 问题 3: API 调用失败

**解决方案：**
- 检查 `.env.local` 文件是否存在且格式正确
- 确认 API Key 是否有效（可在 Google AI Studio 中验证）
- 检查网络连接，确保可以访问 Google API
- 查看浏览器控制台（F12）的错误信息

### 问题 4: 模块未找到错误

**解决方案：**
- 删除 `node_modules` 文件夹和 `package-lock.json`
- 重新运行 `npm install`

## 📝 项目结构说明

```
ASK-E99/
├── App.tsx              # 主应用组件
├── index.tsx            # 入口文件
├── vite.config.ts       # Vite 配置
├── package.json         # 项目依赖配置
├── .env.local          # 环境变量（需自行创建）
├── services/
│   └── geminiService.ts # Gemini API 服务
└── components/
    └── Logo.tsx         # Logo 组件
```

## 🔒 安全提示

1. **不要提交 `.env.local` 文件**：该文件包含敏感信息，已在 `.gitignore` 中排除
2. **API Key 限制**：建议在 Google Cloud Console 中为 API Key 设置使用限制
3. **生产环境**：部署到生产环境时，使用环境变量或安全的密钥管理服务

## 📞 获取帮助

如果遇到问题：
1. 检查本文档的"常见问题排查"部分
2. 查看浏览器控制台的错误信息
3. 确认所有依赖已正确安装
4. 验证 API Key 是否有效

---

**祝您使用愉快！** 🎮
