import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // 正确加载项目根目录的环境文件
    const env = loadEnv(mode, process.cwd(), '');
    const apiKey =
      env.VITE_DASHSCOPE_API_KEY ||
      env.DASHSCOPE_API_KEY ||
      env.VITE_BAILIAN_API_KEY ||
      env.VITE_QWEN_API_KEY ||
      '';
    const baseUrl =
      env.VITE_DASHSCOPE_BASE_URL ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const textModel = env.VITE_DASHSCOPE_TEXT_MODEL || 'qwen-plus';
    const visionModel = env.VITE_DASHSCOPE_VISION_MODEL || 'qwen-vl-max';
    
    console.log('[Vite Config] Loading env from:', process.cwd());
    console.log('[Vite Config] DASHSCOPE_API_KEY:', apiKey ? '已设置' : '未设置');
    
    return {
      base: '/ASK-E99/',
      server: {
        port: 3001,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'import.meta.env.VITE_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.VITE_DASHSCOPE_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.VITE_BAILIAN_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.VITE_QWEN_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.VITE_DASHSCOPE_BASE_URL': JSON.stringify(baseUrl),
        'import.meta.env.VITE_DASHSCOPE_TEXT_MODEL': JSON.stringify(textModel),
        'import.meta.env.VITE_DASHSCOPE_VISION_MODEL': JSON.stringify(visionModel),
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.DASHSCOPE_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
