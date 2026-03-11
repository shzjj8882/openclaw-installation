import path from "path";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";

export function getOpenClawPathEnv(): string {
  const localBin = path.join(os.homedir(), ".local", "bin");
  const extraPaths =
    process.platform === "darwin"
      ? ["/opt/homebrew/bin", "/usr/local/bin", localBin]
      : process.platform === "linux"
        ? [localBin]
        : [path.join(os.homedir(), "AppData", "Roaming", "npm")];
  const pathSep = process.platform === "win32" ? ";" : ":";
  return [...extraPaths, process.env.PATH || ""].join(pathSep);
}

export function getOpenClawExtensionPath(extId: string): string | null {
  const env = { ...process.env, PATH: getOpenClawPathEnv() } as NodeJS.ProcessEnv;
  const candidates: string[] = [];
  if (process.platform !== "win32") {
    candidates.push(path.join("/usr/local", "lib", "node_modules", "openclaw", "extensions", extId));
    candidates.push(path.join("/opt", "homebrew", "lib", "node_modules", "openclaw", "extensions", extId));
  }
  try {
    const npmRoot = execSync("npm root -g", { encoding: "utf8", env }).trim();
    candidates.push(path.join(npmRoot, "openclaw", "extensions", extId));
  } catch {
    // ignore
  }
  try {
    const whichOut = execSync("which openclaw", { encoding: "utf8", env }).trim();
    if (whichOut) {
      const binDir = path.dirname(whichOut);
      candidates.push(path.join(binDir, "..", "lib", "node_modules", "openclaw", "extensions", extId));
      candidates.push(path.join(binDir, "..", "node_modules", "openclaw", "extensions", extId));
      try {
        const real = fs.realpathSync(whichOut);
        const realDir = path.join(path.dirname(real), "..", "extensions", extId);
        candidates.push(realDir);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  for (const p of candidates) {
    const resolved = path.resolve(p);
    if (fs.existsSync(path.join(resolved, "package.json"))) return resolved;
  }
  return null;
}

export function getOpenClawRoot(): string | null {
  const extPath = getOpenClawExtensionPath("feishu");
  if (extPath) return path.join(extPath, "..", "..");
  const env = { ...process.env, PATH: getOpenClawPathEnv() } as NodeJS.ProcessEnv;
  const candidates = [
    path.join("/usr/local", "lib", "node_modules", "openclaw"),
    path.join("/opt", "homebrew", "lib", "node_modules", "openclaw"),
  ];
  try {
    const npmRoot = execSync("npm root -g", { encoding: "utf8", env }).trim();
    candidates.push(path.join(npmRoot, "openclaw"));
  } catch {
    // ignore
  }
  for (const p of candidates) {
    const resolved = path.resolve(p);
    if (fs.existsSync(path.join(resolved, "package.json"))) return resolved;
  }
  return null;
}
