import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  base: './',
  plugins: [react()],
  server: { port: 5175, strictPort: true },
  build: {
    outDir: path.resolve(__dirname, 'renderer'),
    emptyOutDir: true,
  },
});


