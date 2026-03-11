import path from "path";
import os from "os";
import fs from "fs";
import { PROVIDER_KEYS, AUTH_MAP } from "./authConstants";

export function inferAuthFromConfig(
  config: Record<string, unknown>,
  result: Record<string, unknown>
): void {
  const agents = (config.agents ?? config.agent) as Record<string, unknown>;
  const defaults = agents?.defaults as Record<string, unknown>;
  let modelStr = defaults?.model as string;
  if (typeof modelStr !== "string" && defaults?.model && typeof defaults.model === "object") {
    modelStr = (defaults.model as Record<string, unknown>).primary as string;
  }
  const providers = (config.models as Record<string, unknown>)?.providers as Record<string, unknown>;

  if (modelStr && typeof modelStr === "string") {
    const prefix = modelStr.split("/")[0]?.toLowerCase() ?? "";
    result.authChoice = AUTH_MAP[prefix] ?? (prefix ? `${prefix}-api-key` : undefined);
  }
  if (providers && typeof providers === "object") {
    const keys = Object.keys(providers);
    if (keys.length > 0 && !result.authChoice) {
      result.authChoice = `${keys[0].toLowerCase()}-api-key`;
    }
  }

  const authChoice = result.authChoice as string | undefined;
  if (!authChoice || authChoice === "skip" || authChoice === "__none__") return;

  const authFieldValues: Record<string, string> = {};
  const possibleKeys = PROVIDER_KEYS[authChoice] ?? [
    authChoice.replace(/-api-key$/, "").replace(/-zen$/, ""),
  ];
  let prov: Record<string, unknown> | null = null;
  for (const k of possibleKeys) {
    const p = providers?.[k] ?? providers?.[k.toLowerCase()];
    if (p && typeof p === "object") {
      prov = p as Record<string, unknown>;
      break;
    }
  }
  const isCustomAuth =
    authChoice === "custom-api-key" ||
    (authChoice.startsWith("custom-") && authChoice.endsWith("-api-key"));
  if (!prov && providers && isCustomAuth) {
    for (const key of Object.keys(providers)) {
      const p = providers[key] as Record<string, unknown>;
      if (p && typeof p === "object" && (p.baseUrl || p.base_url)) {
        prov = p;
        break;
      }
    }
  }
  if (!prov && providers) {
    for (const key of Object.keys(providers)) {
      const norm = key.toLowerCase().replace(".", "").replace(/-/g, "");
      const want = authChoice.replace(/-api-key$/, "").replace(/-zen$/, "").replace(/-/g, "");
      if (norm === want) {
        const p = providers[key];
        if (p && typeof p === "object") {
          prov = p as Record<string, unknown>;
          break;
        }
      }
    }
  }

  if (prov) {
    const apiKey = prov.apiKey as string;
    if (typeof apiKey === "string" && apiKey.trim()) {
      if (apiKey.startsWith("$")) {
        const envVal = process.env[apiKey.slice(1).trim()];
        if (envVal) authFieldValues[authChoice] = envVal;
      } else {
        authFieldValues[authChoice] = apiKey;
      }
    }
    if (isCustomAuth) {
      const baseUrl = (prov.baseUrl ?? prov.base_url) as string;
      const modelId = (prov.modelId ?? prov.model) as string;
      const compat = prov.compatibility as string;
      if (typeof baseUrl === "string" && baseUrl.trim()) authFieldValues["custom-base-url"] = baseUrl;
      if (typeof modelId === "string" && modelId.trim()) authFieldValues["custom-model-id"] = modelId;
      if (typeof compat === "string" && compat.trim()) authFieldValues["custom-compatibility"] = compat;
      if (authChoice !== "custom-api-key") authFieldValues["custom-api-key"] = authFieldValues[authChoice] ?? apiKey;
    }
    if (authChoice === "cloudflare-ai-gateway-api-key") {
      const accountId = (prov.accountId ?? prov["account-id"]) as string;
      const gatewayId = (prov.gatewayId ?? prov["gateway-id"]) as string;
      const cfKey = prov.apiKey as string;
      if (typeof accountId === "string" && accountId.trim()) authFieldValues["cloudflare-ai-gateway-account-id"] = accountId;
      if (typeof gatewayId === "string" && gatewayId.trim()) authFieldValues["cloudflare-ai-gateway-gateway-id"] = gatewayId;
      if (typeof cfKey === "string" && cfKey.trim() && !cfKey.startsWith("$")) authFieldValues["cloudflare-ai-gateway-api-key"] = cfKey;
    }
  }

  const cachePath = path.join(os.homedir(), ".openclaw", ".installer-auth-cache.json");
  try {
    const cacheRaw = fs.readFileSync(cachePath, "utf8");
    const cache = JSON.parse(cacheRaw) as { authChoice?: string; fieldValues?: Record<string, string> } | Record<string, string>;
    if (cache && typeof cache === "object") {
      const cached = "fieldValues" in cache ? cache.fieldValues : cache;
      const cachedChoice = "authChoice" in cache ? cache.authChoice : undefined;
      const cacheMatches = !cachedChoice || cachedChoice === authChoice;
      if (cached && typeof cached === "object" && Object.keys(cached).length > 0) {
        if (cacheMatches) Object.assign(authFieldValues, cached);
        else if (cachedChoice === "custom-api-key" && (authChoice === "custom-api-key" || !authChoice || isCustomAuth)) {
          Object.assign(authFieldValues, cached);
          if (!result.authChoice) result.authChoice = "custom-api-key";
        }
      }
    }
  } catch {
    // 无缓存文件
  }
  if (Object.keys(authFieldValues).length > 0) result.authFieldValues = authFieldValues;
}
