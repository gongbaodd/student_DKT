# DKT Frontend ONNX — Reference

## ortSetup.ts

```ts
import * as ort from "onnxruntime-web/wasm";
import wasmMjs from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import wasmBinary from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

export function configureOrtWasm(): void {
  ort.env.wasm.wasmPaths = { mjs: wasmMjs, wasm: wasmBinary };
}
export { ort };
```

## predictNext

```ts
async predictNext(history: EncodedVector[], skillId: number) {
  const { numSkills } = this.metadata;
  const seqLen = history.length + 1;
  const flat = new Float32Array(seqLen * numSkills * 2);
  for (let step = 0; step < history.length; step++) {
    flat.set(history[step], step * numSkills * 2);
  }
  const tensor = new ort.Tensor("float32", flat, [1, seqLen, numSkills * 2]);
  const output = await this.session.run({ interactions: tensor });
  const preds = output.predictions.data as Float32Array;
  const t = seqLen - 1;
  const allSkills = Array.from({ length: numSkills }, (_, s) =>
    preds[t * numSkills + s]
  );
  return { currentSkill: allSkills[skillId], allSkills };
}
```

## ModelMetadata

```ts
export interface ModelMetadata {
  numSkills: number;
  inputDim: number;
  hiddenDim: number;
  skills: string[];
  opset: number;
}
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| WASM 404 | Copy `ortSetup.ts` exactly; use `onnxruntime-web/wasm` |
| Vite pre-bundle error | `optimizeDeps.exclude: ["onnxruntime-web"]` |
| ~50% predictions always | Cold start with empty history — expected |
| Nonsense values | Encoding mismatch with Python — check index formula |
