#!/usr/bin/env node
/**
 * pnpm 安装 node-pty 时 spawn-helper 缺少可执行权限，导致 posix_spawnp failed
 * @see https://github.com/microsoft/node-pty/issues/850
 */
const fs = require("fs");
const path = require("path");

try {
  const pkgPath = require.resolve("node-pty/package.json");
  const prebuilds = path.join(path.dirname(pkgPath), "prebuilds");
  if (!fs.existsSync(prebuilds)) return;
  const arches = fs.readdirSync(prebuilds);
  for (const arch of arches) {
    const helper = path.join(prebuilds, arch, "spawn-helper");
    if (fs.existsSync(helper)) {
      fs.chmodSync(helper, 0o755);
    }
  }
} catch (_) {}
