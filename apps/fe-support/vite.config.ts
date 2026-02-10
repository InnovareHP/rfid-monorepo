import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import path from "path";
import { env } from "process";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],

  server: {
    host: true,
    port: 3001,

    proxy: {
      "/api": {
        target: env.VITE_API_URL,
        changeOrigin: true,
      },
    },
  },

  optimizeDeps: {
    exclude: ["@dashboard/ui"],
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
