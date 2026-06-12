import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages配信時のみサブパスを使う（dev/previewはルート配信）
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/smart-meter-rf-simulator/" : "/",
  plugins: [react()],
}));
