import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    env: {
      // Defesa extra: se algum teste importar lib/supabaseClient.ts sem
      // mockar, falha com um erro claro do próprio Supabase em vez de
      // travar em `process.env.X!` undefined.
      NEXT_PUBLIC_SUPABASE_URL: "https://vitest.invalid",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "vitest-dummy-anon-key",
    },
  },
});
