#!/usr/bin/env node
/**
 * Build script for the Умные заметки Electron desktop app.
 *
 * Steps:
 *  1. Build the React frontend → dist/renderer/
 *  2. Copy sql.js WASM binary  → dist/sql-wasm.wasm
 *  3. Bundle Electron main + server → dist/main.js
 */

import { execSync } from "child_process";
import { cpSync, copyFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const desktopDir = __dirname;

console.log("🧹  Cleaning dist/...");
rmSync(path.join(desktopDir, "dist"), { recursive: true, force: true });
mkdirSync(path.join(desktopDir, "dist"), { recursive: true });

// ── Step 1: Build the React frontend ──────────────────────────────────────────
console.log("\n🎨  Building React frontend...");
execSync("pnpm --filter @workspace/smart-notes run build", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: "3000", BASE_PATH: "/" },
});

const frontendSrc = path.join(root, "artifacts/smart-notes/dist/public");
const frontendDst = path.join(desktopDir, "dist/renderer");
console.log("📁  Copying renderer assets...");
cpSync(frontendSrc, frontendDst, { recursive: true });

// ── Step 2: Copy sql.js WASM binary ───────────────────────────────────────────
console.log("\n📦  Copying sql.js WASM...");
const wasmSrc = require.resolve("sql.js/dist/sql-wasm.wasm");
copyFileSync(wasmSrc, path.join(desktopDir, "dist/sql-wasm.wasm"));

// ── Step 3: Bundle Electron main + server ─────────────────────────────────────
console.log("\n⚡  Bundling Electron main process...");
await build({
  entryPoints: [path.join(desktopDir, "src/main.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: path.join(desktopDir, "dist/main.js"),
  external: ["electron"],
  sourcemap: true,
  minify: false,
});

console.log("\n✅  Build complete → artifacts/desktop/dist/");
console.log("   Next: pnpm --filter @workspace/desktop make:win");
