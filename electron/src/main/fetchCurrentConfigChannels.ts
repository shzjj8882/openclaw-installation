const CREDENTIAL_KEYS = [
  "token", "botToken", "appToken", "appId", "appSecret",
  "channelAccessToken", "channelSecret", "appPassword", "tenantId", "baseUrl",
];

function hasCredentials(c: Record<string, unknown>): boolean {
  for (const k of CREDENTIAL_KEYS) {
    const v = c[k];
    if (typeof v === "string" && v.trim()) return true;
  }
  const accounts = c.accounts as Record<string, unknown>;
  if (accounts?.main && typeof accounts.main === "object") {
    const main = accounts.main as Record<string, unknown>;
    if (typeof main.appId === "string" && main.appId.trim()) return true;
    if (typeof main.appSecret === "string" && main.appSecret.trim()) return true;
  }
  return false;
}

function str(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return "";
  const s = v.trim();
  if (s.startsWith("$")) {
    const envVal = process.env[s.slice(1).trim()];
    return typeof envVal === "string" ? envVal : "";
  }
  return s;
}

function extractChannelFieldValues(
  id: string,
  c: Record<string, unknown>
): Record<string, string | boolean> {
  const fv: Record<string, string | boolean> = {};
  if (typeof c.dmPolicy === "string") fv.dmPolicy = c.dmPolicy;
  if (typeof c.groupPolicy === "string") fv.groupPolicy = c.groupPolicy;
  const groups = c.groups as Record<string, unknown>;
  if (groups && groups["*"]) {
    const g = groups["*"] as Record<string, unknown>;
    if (typeof g?.requireMention === "boolean") fv.requireMention = g.requireMention;
  }

  if (id === "telegram" || id === "discord") {
    const v = str(c.token);
    if (v) fv.token = v;
  } else if (id === "slack") {
    const bt = str(c.botToken);
    const at = str(c.appToken);
    if (bt) fv["bot-token"] = bt;
    if (at) fv["app-token"] = at;
  } else if (id === "feishu") {
    const main = (c.accounts as Record<string, unknown>)?.main as Record<string, unknown>;
    if (main) {
      const appId = str(main.appId);
      const appSecret = str(main.appSecret);
      if (appId) fv["app-id"] = appId;
      if (appSecret) fv["app-secret"] = appSecret;
    }
  } else if (id === "line") {
    const t = str(c.channelAccessToken);
    const s = str(c.channelSecret);
    if (t) fv["channel-access-token"] = t;
    if (s) fv["channel-secret"] = s;
  } else if (id === "msteams") {
    const appId = str(c.appId);
    const appPw = str(c.appPassword);
    const tenant = str(c.tenantId);
    if (appId) fv["app-id"] = appId;
    if (appPw) fv["app-password"] = appPw;
    if (tenant) fv["tenant-id"] = tenant;
  } else if (id === "mattermost") {
    const bt = str(c.botToken);
    const bu = str(c.baseUrl);
    if (bt) fv["bot-token"] = bt;
    if (bu) fv["base-url"] = bu;
  } else {
    const t = str(c.token);
    if (t) fv.token = t;
  }
  return fv;
}

export function inferChannelsFromConfig(
  config: Record<string, unknown>,
  result: Record<string, unknown>
): void {
  const ch = config.channels as Record<string, unknown>;
  if (!ch || typeof ch !== "object") return;

  const ids = Object.keys(ch).filter((k) => {
    if (k === "defaults") return false;
    const v = ch[k];
    if (!v || typeof v !== "object") return false;
    const o = v as Record<string, unknown>;
    return o.enabled !== false && hasCredentials(o);
  });
  result.selectedChannels = ids;

  const channelFieldValues: Record<string, Record<string, string | boolean>> = {};
  for (const id of ids) {
    const c = ch[id] as Record<string, unknown>;
    if (!c) continue;
    const fv = extractChannelFieldValues(id, c);
    if (Object.keys(fv).length > 0) channelFieldValues[id] = fv;
  }
  if (Object.keys(channelFieldValues).length > 0) result.channelFieldValues = channelFieldValues;
}
