import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true
  },
  server: {
    proxy: {
      '/auth': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/user': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/project': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/healthz': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/mcp': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/logo': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/set-session-cookie': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ws': { target: 'http://127.0.0.1:8000', changeOrigin: true, ws: true }
    }
  },
  plugins: [react(), tsconfigPaths(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // To prevent conflicts with packages in @chainlit/react-client, we need to specify the resolution paths for these dependencies.
      react: path.resolve(__dirname, './node_modules/react'),
      'usehooks-ts': path.resolve(__dirname, './node_modules/usehooks-ts'),
      sonner: path.resolve(__dirname, './node_modules/sonner'),
      lodash: path.resolve(__dirname, './node_modules/lodash'),
      recoil: path.resolve(__dirname, './node_modules/recoil')
    }
  }
});
