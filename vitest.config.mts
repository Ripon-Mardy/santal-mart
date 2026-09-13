import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.mts"],
    testTimeout: 20_000,
    // The DB-integration tests share one physical database and one Prisma
    // connection pool; running test *files* in parallel against a pooled/
    // proxied Postgres (as some hosted providers and Prisma's own local dev
    // proxy use) can surface spurious "prepared statement" errors that have
    // nothing to do with the code under test. Concurrency *within* a single
    // test (e.g. the oversell-prevention test's parallel purchases) is
    // unaffected — this only serializes separate test files.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      "server-only": path.resolve(dirname, "./vitest.server-only-shim.ts"),
    },
  },
});
