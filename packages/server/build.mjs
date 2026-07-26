import { build } from "esbuild";
import { readFileSync, rmSync } from "node:fs";

// Bundling collapses several previously-separate tsc output files (e.g.
// ws/handler.js) into the entry points that now inline them — clean first so
// stale files from the old per-file tsc build don't linger in dist/.
rmSync(new URL("./dist", import.meta.url), { recursive: true, force: true });

// @graph-pi/shared only resolves via a workspace symlink in this monorepo —
// a real `npm install -g graph-pi` from the registry has no such symlink and
// @graph-pi/shared is never itself published, so a plain `tsc` build (which
// leaves bare imports untouched) produces a package that crashes at runtime
// for every real end user. Bundling inlines that one workspace-local
// dependency; everything else (express, ws, @earendil-works/*, ...) stays
// external since those ARE real, independently-installable npm packages.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));
const external = Object.keys(pkg.dependencies ?? {});

await build({
  entryPoints: [
    "src/index.ts",
    "src/db/graph-store.ts",
    "src/agent/context-builder.ts",
    "src/agent/agent-service.ts",
  ],
  outdir: "dist",
  outbase: "src",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  external,
  logLevel: "info",
});
