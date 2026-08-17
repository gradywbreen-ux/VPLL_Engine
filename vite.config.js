import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Forwards Press Box's /api calls to the local proxy (server/index.mjs)
    // during `npm run dev` — same-origin from the browser's point of view,
    // so no CORS setup needed for the normal dev workflow. Run the proxy
    // alongside this with `npm run server` (or `npm run dev:all` for both
    // at once). Note: `vite preview` does NOT apply this config — it's
    // dev-server only.
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
