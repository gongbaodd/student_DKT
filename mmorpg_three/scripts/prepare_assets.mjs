import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceDir = join(root, "..", "mmorpg_assets", "pirate-kit", "Models", "GLB format");
const destDir = join(root, "public", "assets", "models");
const textureDest = join(destDir, "Textures");

const models = [
  "boat-row-small",
  "boat-row-large",
  "ship-small",
  "ship-medium",
  "ship-large",
  "ship-pirate-small",
  "ship-pirate-medium",
  "ship-pirate-large",
];

if (!existsSync(sourceDir)) {
  console.error(`Asset source not found: ${sourceDir}`);
  console.error("Run: python mmorpg_assets/download_pirate_kit.py");
  process.exit(1);
}

mkdirSync(textureDest, { recursive: true });

const colormapSrc = join(sourceDir, "Textures", "colormap.png");
const colormapDest = join(textureDest, "colormap.png");
if (!existsSync(colormapSrc)) {
  console.error(`Missing texture: ${colormapSrc}`);
  process.exit(1);
}
copyFileSync(colormapSrc, colormapDest);

let copied = 0;
for (const name of models) {
  const src = join(sourceDir, `${name}.glb`);
  const dest = join(destDir, `${name}.glb`);
  if (!existsSync(src)) {
    console.error(`Missing model: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  copied += 1;
}

console.log(`Prepared ${copied} models + colormap -> ${destDir}`);
