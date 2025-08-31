import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,         // equivale a 0.0.0.0 (expone en LAN)
    port: 5173,         // o el que prefieras
    // strictPort: true, // opcional: falla si el puerto está ocupado
  },
  preview: {
    host: true,
    port: 4173,
  },
});
