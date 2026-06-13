# DKT Mantine Showcase — Reference

## museum_web structure

```
museum_web/src/
  main.tsx                 # MantineProvider
  App.tsx                  # AppShell + SwipeDeck + Dashboard
  theme.ts
  hooks/useDktSession.ts
  components/
    SwipeDeck.tsx
    MuseumCard.tsx
    Dashboard.tsx
    ClusterAffinity.tsx
  dkt/                     # from math/
  utils/
    pickNextMuseum.ts
    sessionStorage.ts
    format.ts
museum_web/public/
  dkt.onnx
  model-metadata.json
  museums.json
  skills.json
```

## useDktSession state machine

```
init
  ├─ DktModel.load() + fetch domain JSON
  ├─ restore localStorage
  └─ pick first item + predictNext

swipe(liked)
  ├─ encode(clusterId, liked) → append history
  ├─ predictNext → update predictions
  └─ advance cards

reset → clear localStorage → re-init
```

## Mantine postcss.config.cjs

```js
module.exports = {
  plugins: {
    "postcss-preset-mantine": {},
    "postcss-simple-vars": {
      variables: {
        "mantine-breakpoint-xs": "36em",
        "mantine-breakpoint-sm": "48em",
        "mantine-breakpoint-md": "62em",
        "mantine-breakpoint-lg": "75em",
        "mantine-breakpoint-xl": "88em",
      },
    },
  },
};
```

## pickNextMuseum

```ts
// Score unseen by clusterScores[museum.clusterId]
// Tie-break randomly within top cluster
// Cold start: shuffle(unseen)[0]
```

## Full pipeline commands

```bash
python museum/prepare_web_data.py
python export_museum_dkt_onnx.py
cd museum_web && npm install && npm run dev
```
