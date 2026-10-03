import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works on GitHub Pages or any static host subpath
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    // three.js chunk is lazy-loaded after first paint
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("three") || id.includes("@react-three")) return "three";
        },
      },
    },
  },
});
