import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './',
  publicDir: mode === 'android' ? '.android-local/web-public' : 'public',
  define: { __NATIVE_OFFLINE__: JSON.stringify(mode === 'android') },
}));
