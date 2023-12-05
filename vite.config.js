import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';
import { resolve } from 'path';

import injectHTML from './plugin-html-inject';

export default defineConfig({
  publicDir: 'public',
  root: 'src',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        contacts: resolve(__dirname, 'src/contacts.html'),
        portfolio: resolve(__dirname, 'src/portfolio.html'),
      },
    },
    outDir: 'dist',
  },
  plugins: [
    injectHTML(),
    eslint({
      cache: false,
      fix: true,
    }),
  ],
});
