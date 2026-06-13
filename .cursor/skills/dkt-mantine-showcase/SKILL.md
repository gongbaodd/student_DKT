---
name: dkt-mantine-showcase
description: >-
  Build DKT showcase UIs with Vite, React, and Mantine in student-dkt:
  session hooks, swipe decks, prediction dashboards, localStorage persistence.
  Use when creating or extending museum_web-style apps, Mantine layouts, or
  wiring user interactions to DktModel predictions.
---

# DKT Mantine Showcase

React + Vite + Mantine UI on top of [dkt-frontend-onnx](../dkt-frontend-onnx/SKILL.md).

Reference apps:
- **Minimal** (no Mantine): `math/` — quiz form + CSS prediction bar
- **Full showcase**: `museum_web/` — swipe deck + bottom dashboard

## Scaffold

1. `npm create vite@latest <app> -- --template react-ts`
2. Install: `@mantine/core`, `@mantine/hooks`, `postcss-preset-mantine`, `postcss-simple-vars`, `@tabler/icons-react`, `onnxruntime-web`
3. Copy from `museum_web/`: `postcss.config.cjs`, `vite.config.ts`, `src/theme.ts`
4. `MantineProvider` + `@mantine/core/styles.css` in `main.tsx`
5. Copy `src/dkt/*` from `math/` (see frontend-onnx skill)

## Layout pattern (`museum_web/App.tsx`)

```
AppShell header
  └─ SwipeDeck / quiz area (top)
  └─ Divider
  └─ Dashboard (bottom) — cluster bars, stats, recent history
```

Single scrollable page, no tabs.

## Session hook (`useDktSession.ts`)

Central state — copy and adapt:

| State | Purpose |
|-------|---------|
| `encodedHistory` | Passed to `predictNext` |
| `swipeHistory` / attempts | UI log with predicted vs actual |
| `predictions` | `allSkills[]` for dashboard bars |
| `currentPrediction` | Score for current item's skill |

Flow:
```
init → DktModel.load() + domain JSON + restore localStorage
interaction → encode → append → predictNext → advance item
reset → clear localStorage → cold start
```

## UI components

| Component | Role |
|-----------|------|
| `SwipeDeck` | Pointer drag, like/pass buttons |
| `MuseumCard` | Item display + model guess overlay |
| `Dashboard` | Stats, `ClusterAffinity` bars, history table |
| `ClusterAffinity` | Sorted `Progress` bars per skill |

Math equivalent: inline state in `math/App.tsx` (no hook, no Mantine).

## Recommendation (`pickNextMuseum.ts`)

1. Filter unseen items
2. Cold start: random
3. Score by `allSkills[item.clusterId]`; pick highest cluster
4. Return `null` when exhausted → show reset UI

## UI patterns

- **Cold start**: muted text when `encodedHistory.length === 0`
- **Dashboard**: per-skill `Progress` from `predictions[]`
- **Persistence**: `localStorage` key per app (e.g. `museum-dkt-session`)

## Pitfalls

- Use `src/utils/` not `src/lib/` (gitignored)
- Add `predev` guard for missing `public/dkt.onnx`
- External images: Mantine `Image` with `fallbackSrc`

## New showcase checklist

```
- [ ] Mantine + Vite scaffold
- [ ] Copy dkt/ modules + export ONNX to public/
- [ ] Domain JSON in public/ (museums, skills, etc.)
- [ ] Session hook: load, interact, persist
- [ ] Input UI (swipe / quiz)
- [ ] Dashboard showing predictions[]
- [ ] README with build commands
```

## Related skills

- ONNX runtime: [dkt-frontend-onnx](../dkt-frontend-onnx/SKILL.md)
- Train + export: [dkt-python](../dkt-python/SKILL.md) → [dkt-onnx-export](../dkt-onnx-export/SKILL.md)

Details: [reference.md](reference.md)
