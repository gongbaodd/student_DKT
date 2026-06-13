---
name: dkt-frontend-onnx
description: >-
  Run DKT ONNX models in the browser with onnxruntime-web, Vite, and TypeScript
  in student-dkt. Use when integrating dkt.onnx, configuring WASM paths,
  implementing DktModel, or mirroring Python encode_interaction in TypeScript.
---

# DKT Frontend ONNX

Browser-side DKT inference via `onnxruntime-web` WASM. No Python at runtime.

**Inputs**: `public/dkt.onnx` + `model-metadata.json` from [dkt-onnx-export](../dkt-onnx-export/SKILL.md).  
**UI layer**: [dkt-mantine-showcase](../dkt-mantine-showcase/SKILL.md) (optional Mantine).

Reference implementations: `math/src/dkt/`, `museum_web/src/dkt/`.

## Files to copy

| Module | Source | Role |
|--------|--------|------|
| `encoder.ts` | `math/src/dkt/encoder.ts` | Mirror Python one-hot |
| `ortSetup.ts` | `math/src/dkt/ortSetup.ts` | WASM `?url` paths |
| `model.ts` | `math/src/dkt/model.ts` | `DktModel` class |
| `types.ts` | adapt per app | `ModelMetadata`, `EncodedVector` |

## Vite config (required)

```ts
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["onnxruntime-web"] },
  assetsInclude: ["**/*.wasm"],
});
```

## Runtime flow

1. **`configureOrtWasm()`** — once; sets `ort.env.wasm.wasmPaths`
2. **`DktModel.load()`** — parallel:
   - `fetch("/model-metadata.json")`
   - `ort.InferenceSession.create("/dkt.onnx", { executionProviders: ["wasm"] })`
3. **On interaction**: `model.encode(skillId, correct)` → append to `encodedHistory`
4. **`predictNext(history, skillId)`**:
   - Tensor `[1, history.length + 1, 2 * numSkills]`
   - Past steps from history; current step zeros
   - Read **last timestep** → `allSkills[]`, `currentSkill = allSkills[skillId]`

## Encoding (must match Python)

```ts
const index = correct ? skillId : numSkills + skillId;
vector[index] = 1;
```

## package.json

```json
{
  "dependencies": { "onnxruntime-web": "^1.22.0" },
  "scripts": {
    "predev": "test -f public/dkt.onnx || (echo 'Run export script' && exit 1)"
  }
}
```

## Integration checklist

```
- [ ] Copy src/dkt/* from math/
- [ ] Place dkt.onnx + model-metadata.json in public/
- [ ] Configure vite.config.ts (exclude ORT, include .wasm)
- [ ] Load DktModel on app init
- [ ] encode() on each user interaction
- [ ] predictNext() before showing next item
- [ ] Display allSkills[] in dashboard
```

## Pitfall

Repo `.gitignore` ignores `lib/`. Use `src/utils/` not `src/lib/`.

## Related skills

- Export: [dkt-onnx-export](../dkt-onnx-export/SKILL.md)
- Mantine UI + session hook: [dkt-mantine-showcase](../dkt-mantine-showcase/SKILL.md)

Details: [reference.md](reference.md)
