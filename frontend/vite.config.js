import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
// Única fuente local. Vite expone exclusivamente VITE_*; nunca cambiar envPrefix a ''.
export default defineConfig({ envDir: fileURLToPath(new URL('..', import.meta.url)), envPrefix: 'VITE_', plugins: [react(), tailwindcss()], server: { host: '127.0.0.1', port: 5173, strictPort: true }, preview: { host: '127.0.0.1', port: 4173 }, test: { environment: 'jsdom', setupFiles: ['./src/test/setup.js'] } });
