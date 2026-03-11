#!/usr/bin/env node
/**
 * 生成首页 features 使用的 IconPark SVG 彩色图标（two-tone）
 * 运行: node scripts/generate-feature-icons.mjs
 */
import { Rocket, Setting, Computer, Globe } from "@icon-park/svg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");

const toSvg = (fn, fill) =>
  fn({ theme: "two-tone", size: "48", fill: fill || ["#333", "#2F88FF"] })
    .replace(/<\?xml[^>]*\?>/, "")
    .trim();

const icons = [
  { name: "icon-rocket.svg", fn: Rocket, fill: ["#1F2937", "#F97316"] },      // 橙色 - 一键安装
  { name: "icon-setting.svg", fn: Setting, fill: ["#1F2937", "#8B5CF6"] },   // 紫色 - 可视化配置
  { name: "icon-computer.svg", fn: Computer, fill: ["#1F2937", "#3B82F6"] }, // 蓝色 - 内置终端
  { name: "icon-globe.svg", fn: Globe, fill: ["#1F2937", "#22C55E"] },        // 绿色 - 跨平台支持
];

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

for (const { name, fn, fill } of icons) {
  fs.writeFileSync(path.join(publicDir, name), toSvg(fn, fill));
  console.log(`Generated ${name}`);
}
