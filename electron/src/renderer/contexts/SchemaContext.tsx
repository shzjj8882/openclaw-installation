import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { OnboardSchema } from "@/types";

interface SchemaContextValue {
  onboardSchema: OnboardSchema | null;
  refreshOnboardSchema: () => Promise<void>;
}

const SchemaContext = createContext<SchemaContextValue | null>(null);

export function SchemaProvider({ children }: { children: ReactNode }) {
  const [onboardSchema, setOnboardSchema] = useState<OnboardSchema | null>(null);

  useEffect(() => {
    const unsub = window.electron?.onOnboardSchema?.(setOnboardSchema);
    return () => unsub?.();
  }, []);

  const refreshOnboardSchema = useCallback(async () => {
    await window.electron?.refreshOnboardSchema?.();
  }, []);

  return (
    <SchemaContext.Provider value={{ onboardSchema, refreshOnboardSchema }}>
      {children}
    </SchemaContext.Provider>
  );
}

export function useSchema() {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error("useSchema must be used within SchemaProvider");
  return ctx;
}
