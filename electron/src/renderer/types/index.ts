export type AppState = "install" | "configure";

export interface EnvCheckResult {
  openclaw: boolean;
  nodejs: boolean;
  homebrew: boolean;
  versions?: { node?: string; openclaw?: string };
}

export interface FieldSpec {
  flag: string;
  label: string;
  type: "password" | "text" | "url" | "boolean";
  required: boolean;
  envKey?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface OnboardSchema {
  authOptions: { value: string; label: string; fields: FieldSpec[] }[];
  hasInstallDaemon: boolean;
  daemonOptions?: { fields: FieldSpec[] };
  skillsOptions?: { fields: FieldSpec[] };
  channels: {
    id: string;
    name: string;
    fields: { flag: string; label: string; type: "password" | "text" | "url" | "boolean"; required: boolean; placeholder?: string; options?: { value: string; label: string }[] }[];
    hasGroups?: boolean;
  }[];
  skills: { name: string; description: string; eligible: boolean }[];
  currentConfig?: Record<string, unknown>;
}

export type AuthChoice =
  | "openai-api-key"
  | "anthropic-api-key"
  | "skip";

export type ChannelType =
  | "telegram"
  | "whatsapp"
  | "discord"
  | "googlechat"
  | "mattermost"
  | "signal"
  | "bluebubbles"
  | "imessage";
