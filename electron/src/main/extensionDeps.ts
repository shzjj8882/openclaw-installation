import path from "path";
import os from "os";
import fs from "fs";
import { spawn } from "child_process";
import { getOpenClawPathEnv, getOpenClawExtensionPath, getOpenClawRoot } from "./openclawPaths";

const NPM_PNPM_ONLY_KEYS = [
  "npm_config_shamefully_hoist",
  "npm_config_recursive",
  "NPM_CONFIG_SHAMEFULLY_HOIST",
  "NPM_CONFIG_RECURSIVE",
];

export function isFeishuDepsInstalled(): boolean {
  const extPath = getOpenClawExtensionPath("feishu");
  if (extPath) {
    const sdkPath = path.join(extPath, "node_modules", "@larksuiteoapi", "node-sdk");
    if (fs.existsSync(sdkPath)) return true;
  }
  const openclawRoot = getOpenClawRoot();
  if (openclawRoot) {
    const sdkPath = path.join(openclawRoot, "node_modules", "@larksuiteoapi", "node-sdk");
    if (fs.existsSync(sdkPath)) return true;
  }
  return false;
}

export async function installExtensionDeps(extId: string): Promise<void> {
  if (extId === "feishu" && isFeishuDepsInstalled()) return;
  const extPath = getOpenClawExtensionPath(extId);
  const openclawCache = path.join(os.homedir(), ".openclaw", ".plugin-npm-cache");
  try {
    fs.mkdirSync(openclawCache, { recursive: true });
  } catch {
    // ignore
  }
  const baseEnv = {
    ...process.env,
    PATH: getOpenClawPathEnv(),
    npm_config_cache: openclawCache,
    NPM_CONFIG_CACHE: openclawCache,
  } as NodeJS.ProcessEnv;
  const env = { ...baseEnv };
  NPM_PNPM_ONLY_KEYS.forEach((k) => delete env[k]);

  const runInstall = (cwd: string, args: string[]): Promise<number> =>
    new Promise((res) => {
      const c = spawn("npm", ["install", "--ignore-scripts", ...args], {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
      });
      c.on("close", (code) => res(code ?? 0));
    });

  if (extPath) {
    const pkgJson = path.join(extPath, "package.json");
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
      if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
        const code = await runInstall(extPath, []);
        if (code === 0) return;
      }
    } catch {
      // fall through
    }
  }

  if (extId === "feishu") {
    const openclawRoot = getOpenClawRoot();
    if (openclawRoot && fs.existsSync(path.join(openclawRoot, "package.json"))) {
      await runInstall(openclawRoot, ["@larksuiteoapi/node-sdk"]);
    }
  }
}
