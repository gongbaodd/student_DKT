import * as ort from "onnxruntime-web/wasm";

import wasmMjs from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import wasmBinary from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

let configured = false;

export function configureOrtWasm(): void {
  if (configured) return;
  ort.env.wasm.wasmPaths = {
    mjs: wasmMjs,
    wasm: wasmBinary,
  };
  configured = true;
}

export { ort };
