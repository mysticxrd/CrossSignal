import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({ root: fileURLToPath(new URL('./case-lab', import.meta.url)), plugins: [react()],
  build: { outDir: fileURLToPath(new URL('./dist/case-lab', import.meta.url)), emptyOutDir: true } });
