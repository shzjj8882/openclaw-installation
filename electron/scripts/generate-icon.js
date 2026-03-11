#!/usr/bin/env node
/**
 * 从 docs/public/logo.svg 生成 electron/build/icon.png
 */
const sharp = require("sharp");
const { readFileSync } = require("fs");
const { join } = require("path");

const root = join(__dirname, "../..");
const svgPath = join(root, "docs/public/logo.svg");
const outPath = join(root, "electron/build/icon.png");

sharp(readFileSync(svgPath))
  .resize(512, 512)
  .png()
  .toFile(outPath)
  .then(() => console.log("Generated:", outPath))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
