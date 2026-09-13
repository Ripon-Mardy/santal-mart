// Next.js has built-in bundler support for the `server-only` sentinel
// package (it doesn't need to be installed — see next/types/global.d.ts for
// the ambient TypeScript declaration). Vitest has no such special-casing,
// so this no-op shim stands in for it during tests via vitest.config.ts's
// resolve.alias.
export {};
