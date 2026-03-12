import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AppState, EnvCheckResult } from "@/types";

interface EnvContextValue {
  appState: AppState;
  envCheck: EnvCheckResult | null;
  envCheckLoading: boolean;
  setAppState: (s: AppState) => void;
  setEnvCheck: (r: EnvCheckResult | null) => void;
  refreshEnvCheck: (force?: boolean) => Promise<EnvCheckResult | null>;
}

const EnvContext = createContext<EnvContextValue | null>(null);

export function EnvProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>("install");
  const [envCheck, setEnvCheck] = useState<EnvCheckResult | null>(null);
  const [envCheckLoading, setEnvCheckLoading] = useState(true);

  const refreshEnvCheck = useCallback(async (force?: boolean): Promise<EnvCheckResult | null> => {
    setEnvCheckLoading(true);
    try {
      if (window.electron?.checkEnv) {
        const result = await window.electron.checkEnv(force);
        setEnvCheck(result);
        return result;
      }
      const fallback: EnvCheckResult = {
        openclaw: false,
        nodejs: false,
        homebrew: false,
      };
      setEnvCheck(fallback);
      return fallback;
    } finally {
      setEnvCheckLoading(false);
    }
  }, []);

  const value: EnvContextValue = {
    appState,
    envCheck,
    envCheckLoading,
    setAppState,
    setEnvCheck,
    refreshEnvCheck,
  };

  return <EnvContext.Provider value={value}>{children}</EnvContext.Provider>;
}

export function useEnv() {
  const ctx = useContext(EnvContext);
  if (!ctx) throw new Error("useEnv must be used within EnvProvider");
  return ctx;
}
