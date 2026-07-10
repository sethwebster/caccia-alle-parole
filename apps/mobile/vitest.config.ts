import { defineConfig } from 'vitest/config';

const srcAlias = new URL('./src/', import.meta.url).pathname;
const assetsAlias = new URL('./assets/', import.meta.url).pathname;

export default defineConfig({
  define: {
    __DEV__: 'false',
  },
  resolve: {
    alias: [
      { find: /^@\/assets\//, replacement: assetsAlias },
      { find: /^@\//, replacement: srcAlias },
    ],
  },
  test: {
    environment: 'node',
  },
});
