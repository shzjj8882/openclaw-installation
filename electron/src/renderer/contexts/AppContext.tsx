import React, { type ReactNode } from "react";
import type { OnboardSchema } from "@/types";
import { EnvProvider, useEnv } from "./EnvContext";
import { FooterProvider, useFooter, useFooterContent, useFooterSetter } from "./FooterContext";
import { SchemaProvider, useSchema } from "./SchemaContext";

export { useEnv, useFooter, useFooterContent, useFooterSetter, useSchema };

export type { FieldSpec, OnboardSchema } from "@/types";

declare global {
  interface Window {
    electron?: {
      checkEnv: () => Promise<import("@/types").EnvCheckResult>;
      refreshOnboardSchema: () => Promise<void>;
      onOnboardSchema: (cb: (schema: OnboardSchema) => void) => () => void;
      openExternal: (url: string) => Promise<void>;
      runInTerminal: (cmd: string) => Promise<void>;
      installNodejs: () => Promise<void>;
      installOpenClaw: () => Promise<void>;
      installOpenClawWithSudo: () => Promise<void>;
      installHomebrew: () => Promise<void>;
      onInstallProgress: (cb: (d: { progress: number; message: string }) => void) => () => void;
    };
  }
}

/** 组合 Env + Footer + Schema 三个 Provider，减少单一 Context 导致的全量重渲染 */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <EnvProvider>
      <FooterProvider>
        <SchemaProvider>{children}</SchemaProvider>
      </FooterProvider>
    </EnvProvider>
  );
}

/** 兼容旧用法：从三个 Context 聚合，仅需部分字段的组件应使用 useEnv/useFooter/useSchema */
export function useApp() {
  const env = useEnv();
  const footer = useFooter();
  const schema = useSchema();
  return {
    ...env,
    ...footer,
    ...schema,
  };
}
