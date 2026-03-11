import path from "path";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";

/** 用于环境检测的 PATH，包含 nvm/fnm/volta 等常见 Node 安装路径（GUI 应用不继承 shell PATH） */
export function getEnvCheckPath(): string {
  const home = os.homedir();
  const pathSep = process.platform === "win32" ? ";" : ":";
  const extra: string[] = [];

  if (process.platform === "darwin" || process.platform === "linux") {
    extra.push("/opt/homebrew/bin", "/usr/local/bin", path.join(home, ".local", "bin"));
    // nvm
    const nvmVersions = path.join(home, ".nvm", "versions", "node");
    if (fs.existsSync(nvmVersions)) {
      try {
        const vers = fs.readdirSync(nvmVersions);
        for (const v of vers) {
          const bin = path.join(nvmVersions, v, "bin");
          if (fs.existsSync(bin)) extra.push(bin);
        }
      } catch {
        /* ignore */
      }
    }
    // fnm
    for (const base of [path.join(home, ".fnm", "node-versions"), path.join(home, ".local", "share", "fnm", "node-versions")]) {
      if (fs.existsSync(base)) {
        try {
          const vers = fs.readdirSync(base);
          for (const v of vers) {
            const bin = path.join(base, v, "installation", "bin");
            if (fs.existsSync(bin)) extra.push(bin);
          }
        } catch {
          /* ignore */
        }
      }
    }
    // volta
    extra.push(path.join(home, ".volta", "bin"));
  } else {
    // Windows
    extra.push(
      path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs"),
      path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "nodejs"),
      path.join(home, "AppData", "Roaming", "npm"),
      path.join(home, "AppData", "Local", "fnm"),
      path.join(home, "scoop", "apps", "nodejs", "current")
    );
  }

  return [...extra, process.env.PATH || ""].join(pathSep);
}

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
