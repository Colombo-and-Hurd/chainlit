/// <reference types="vitest" />
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // Same single-copy resolution as vite.config.ts, so tests share @chainlit/react-client's atoms.
      react: path.resolve(__dirname, './node_modules/react'),
      sonner: path.resolve(__dirname, './node_modules/sonner'),
      recoil: path.resolve(__dirname, './node_modules/recoil'),
      '@chainlit/react-client': path.resolve(
        __dirname,
        '../libs/react-client/dist/index.mjs'
      )
    }
  },
  test: {
    deps: { inline: [/libs\/react-client/] },
    environment: 'jsdom',
    setupFiles: './tests/setup-tests.ts',
    include: ['./**/*.{test,spec}.?(c|m)[jt]s?(x)']
  }
});
