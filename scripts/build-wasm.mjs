import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cratesDir = path.join(rootDir, "crates");
const outBaseDir = path.join(rootDir, "src", "assets", "wasm");

function resolveWasmPack() {
  const cargoBin = path.join(homedir(), ".cargo", "bin", "wasm-pack");
  if (existsSync(cargoBin)) return cargoBin;
  return "wasm-pack";
}

const wasmPack = resolveWasmPack();
mkdirSync(outBaseDir, { recursive: true });

const crates = readdirSync(cratesDir).filter((entry) =>
  statSync(path.join(cratesDir, entry)).isDirectory()
);

for (const crateName of crates) {
  const cratePath = path.join(cratesDir, crateName);
  const outDir = path.join(outBaseDir, crateName);

  console.log(`\n[wasm] Building ${crateName} -> src/assets/wasm/${crateName}/`);
  execFileSync(
    wasmPack,
    ["build", cratePath, "--target", "web", "--release", "--no-pack", "--out-dir", outDir],
    { stdio: "inherit" }
  );

  // Remove auto-generated .gitignore inside the output dir since parent .gitignore handles it
  const nestedGitignore = path.join(outDir, ".gitignore");
  if (existsSync(nestedGitignore)) {
    rmSync(nestedGitignore);
  }
}

console.log("\n[wasm] All WebAssembly demo bundles built successfully.");
