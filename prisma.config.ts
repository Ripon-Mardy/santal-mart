import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Makes Node's module resolver pick the `react-server` export condition,
// same as Next's bundler does — required because src/services/* files
// `import "server-only"`, whose real npm package throws unless that
// condition is active. `prisma db seed` spawns its command directly
// (no shell), so this has to be set on process.env for the child to
// inherit rather than inlined as `NODE_OPTIONS=... tsx ...`.
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --conditions=react-server`.trim();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
