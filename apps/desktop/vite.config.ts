import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig, type Plugin } from "vite";
import electron from "vite-plugin-electron";
import { copyFileSync, mkdirSync } from "fs";

// Plugin that copies preload.cjs as-is (no transformation) to dist-electron
function copyPreloadPlugin(): Plugin {
  const src = resolve(__dirname, "src/preload/preload.cjs");
  const destDir = resolve(__dirname, "dist-electron/preload");
  const dest = resolve(destDir, "preload.cjs");

  return {
    name: "copy-preload",
    writeBundle() {
      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, dest);
    },
  };
}

export default defineConfig({
  root: "src/renderer",
  plugins: [
    react(),
    electron([
      {
        entry: "../main/main.ts",
        vite: {
          build: {
            outDir: "../../dist-electron/main",
            minify: false,
            rollupOptions: {
              external: [
                "electron",
                "electron-store",
                "nswindow-napi",
                "path",
                "fs",
                "http",
                "url",
                "crypto",
              ],
              output: {
                format: "es",
                entryFileNames: "main.js",
              },
            },
          },
          resolve: {
            alias: {
              "@": resolve(__dirname, "./src"),
            },
          },
          plugins: [copyPreloadPlugin()],
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
});
