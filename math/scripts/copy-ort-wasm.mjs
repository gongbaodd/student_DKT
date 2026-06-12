import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "node_modules", "onnxruntime-web", "dist");
const outDir = join(root, "public", "ort");

const artifacts = [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jspi.wasm",
  "ort-wasm-simd-threaded.jspi.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
  "ort-wasm-simd-threaded.asyncify.mjs",
];

if (!existsSync(distDir)) {
  console.error("onnxruntime-web is not installed. Run npm install first.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

for (const file of artifacts) {
  cpSync(join(distDir, file), join(outDir, file));
}

console.log(`Copied ${artifacts.length} ONNX Runtime WASM artifacts to public/ort/`);
