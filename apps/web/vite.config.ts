import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  envDir: "../../packages/database",
  server: { host: true },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
