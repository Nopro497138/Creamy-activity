import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(__dirname, "client"),
  publicDir: resolve(__dirname, "client", "assets"),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "client", "index.html"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api":       { target: "http://localhost:3000", changeOrigin: true },
      "/.proxy/api":{ target: "http://localhost:3000/api", changeOrigin: true, rewrite: p => p.replace(/^\/.proxy/, "") },
    },
  },
});
