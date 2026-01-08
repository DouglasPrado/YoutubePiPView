import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron";

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
        },
      },
      {
        entry: "../preload/preload.cjs",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: "../../dist-electron/preload",
            copyPublicDir: false,
            rollupOptions: {
              external: ["electron"],
              output: {
                format: "cjs",
                entryFileNames: "preload.cjs",
                preserveModules: false,
              },
            },
            commonjsOptions: {
              transformMixedEsModules: false,
            },
          },
          resolve: {
            alias: {
              "@": resolve(__dirname, "./src"),
            },
          },
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
