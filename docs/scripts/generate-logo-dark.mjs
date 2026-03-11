#!/usr/bin/env node
/**
 * 生成暗黑模式 Logo：白底变透明，红色等品牌色保持原样
 * 运行: node scripts/generate-logo-dark.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");
const inputPath = path.join(publicDir, "logo.png");
const outputPath = path.join(publicDir, "logo-dark.png");

const WHITE_THRESHOLD = 245; // R,G,B 均大于此值视为白底，设为透明

async function main() {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // 白底或近白底 -> 透明
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
    }
    // 浅灰边框等 -> 半透明或透明，便于融入暗色背景
    else if (r >= 220 && g >= 220 && b >= 220) {
      data[i + 3] = Math.round(((r + g + b) / 3 - 200) * 2);
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  console.log("Generated logo-dark.png (white → transparent, red preserved)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
