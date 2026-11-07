import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { revenueApi } from "./server/plugin.js";
export default defineConfig({
  plugins: [react(), tailwindcss(), revenueApi()],
  server: { host: "127.0.0.1" },
});
