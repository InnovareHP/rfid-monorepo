import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      viteReact(),
      tailwindcss(),
    ],

    server: {
      host: true,
      allowedHosts: ["api.refidly.com", "portal.refidly.com"],
      port: 3000,
      proxy: {
        "/api": {
          target: env.VITE_API_URL,
          changeOrigin: true,
        },
        // BoardGateway serves the socket at /ws, not /socket.io. The client
        // connects to VITE_API_URL directly so this only matters when it is
        // left relative, but a proxy entry naming the wrong path is worse than
        // none: it looks like the socket is covered.
        "/ws": {
          target: env.VITE_API_URL,
          changeOrigin: true,
          ws: true,
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
  };
});
