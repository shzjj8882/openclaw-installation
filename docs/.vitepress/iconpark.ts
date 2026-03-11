/**
 * IconPark 图标配置
 * 官网: https://iconpark.oceanengine.com/
 * GitHub: https://github.com/bytedance/IconPark
 */
import { Github } from "@icon-park/svg";

function toSvg(iconFn: (props?: { theme?: string; size?: string; fill?: string[] }) => string): string {
  const svg = iconFn({ theme: "outline", size: "24", fill: ["currentColor"] });
  return svg.replace(/<\?xml[^>]*\?>/, "").trim();
}

export const iconParkIcons = {
  github: toSvg(Github as (p?: object) => string),
};
