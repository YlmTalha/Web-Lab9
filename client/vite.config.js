import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No proxy on purpose: the server sends CORS headers itself
export default defineConfig({
  plugins: [react()],
});
