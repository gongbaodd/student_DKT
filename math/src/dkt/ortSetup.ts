import * as ort from "onnxruntime-web/wasm";

let configured = false;

export function configureOrtWasm(): void {
  if (configured) return;
  ort.env.wasm.wasmPaths = "/ort/";
  configured = true;
}

export { ort };
