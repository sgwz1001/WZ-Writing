import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Tauri 在开发期通过固定端口连接前端，端口冲突会直接导致白屏，因此关闭自动切换端口
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // Tauri 期望一个固定端口，且失败要显式报错而不是悄悄换端口
  clearScreen: false,
  server: {
    port: 5273,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 5274 } : undefined,
    watch: {
      // Rust 侧的变更由 cargo 自己监听，前端不要重复扫描，否则大量文件会拖慢 HMR
      ignored: ['**/src-tauri/**'],
    },
  },

  // 产物面向 WebView2（Chromium），可以放心用现代语法
  build: {
    target: 'chrome110',
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 1500,
  },

  css: {
    devSourcemap: true,
  },
})
