import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import path from "path";

import { dependencies } from "./package.json";

export default ({ mode }: { mode: string }) => {
  Object.assign(process?.env, loadEnv(mode, process?.cwd(), ""));

  const SERVER_URL = process?.env?.SERVER_URL || "http://localhost:5000";
  const isBuild = mode === "production";

  if (isBuild && process?.env?.VITE_USE_MOCK_DATA === "true") {
    throw new Error(
      "\n\nBuild aborted: VITE_USE_MOCK_DATA=true is set in your environment.\n" +
      "Comment it out in .env.local before building for production.\n"
    );
  }

  return defineConfig({
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: SERVER_URL,
          changeOrigin: true,
        },
        "/ws": {
          target: SERVER_URL,
          changeOrigin: true,
          ws: true,
        },
        "/addons": {
          target: SERVER_URL,
          changeOrigin: false,
        },
        "/graphql": {
          target: SERVER_URL,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      // Module Federation is only needed for the production bundle that AYON
      // loads as a remote. In dev mode it interferes with HMR and dynamic
      // imports, so we skip it entirely and let the dev server run as a plain
      // React app via DevWrapper / main.tsx.
      ...(isBuild
        ? [
            federation({
              filename: "remoteEntry.js",
              name: "dashboard",
              exposes: {
                "./ProjectDashboard":
                  "./src/integration/OverviewPanelRemote.tsx",
              },
              remotes: {},
              shared: {
                react: {
                  requiredVersion: dependencies.react,
                  singleton: true,
                },
                "react-dom": {
                  requiredVersion: dependencies["react-dom"],
                  singleton: true,
                },
                "styled-components": {
                  requiredVersion: dependencies["styled-components"],
                  singleton: true,
                },
                "@ynput/ayon-react-components": {
                  requiredVersion: dependencies["@ynput/ayon-react-components"],
                  singleton: true,
                },
              },
            }),
          ]
        : []),
    ],
    build: {
      target: "chrome89",
      outDir: path.resolve(__dirname, "./dist/modules/dashboard"),
      emptyOutDir: true,
      cssCodeSplit: false,
      minify: true,
    },
    base: "",
  });
};
