import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  build: {
    rollupOptions: { input: Object.fromEntries(['index', 'laser-cutting-pune', 'sheet-metal-bending-pune', 'sheet-metal-shearing-pune', 'capabilities', 'process-film', 'sheet-metal-guide', 'cad', 'cad-guide', 'privacy', '404'].map(p => [p, resolve(import.meta.dirname, `${p}.html`)])) }
  }
});
