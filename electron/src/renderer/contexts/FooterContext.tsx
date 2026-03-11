import React, { createContext, useContext, useState, useMemo, type ReactNode } from "react";

/** 仅读取 footer 内容，用于实际渲染 footer 的组件，避免其他组件因 footer 变化重渲染 */
const FooterContentContext = createContext<ReactNode>(null);

/** 仅注入 setter，setState 稳定不变，消费者不会因 footerContent 变化而重渲染 */
const FooterSetterContext = createContext<((node: ReactNode) => void) | null>(null);

export function FooterProvider({ children }: { children: ReactNode }) {
  const [footerContent, setFooterContent] = useState<ReactNode>(null);
  const setterStable = React.useCallback((node: ReactNode) => setFooterContent(node), []);
  return (
    <FooterContentContext.Provider value={footerContent}>
      <FooterSetterContext.Provider value={setterStable}>{children}</FooterSetterContext.Provider>
    </FooterContentContext.Provider>
  );
}

/** 读取 footer 内容，仅 footer 渲染处使用 */
export function useFooterContent() {
  return useContext(FooterContentContext);
}

/** 获取 setFooterContent，仅需注入内容的组件使用，不会因 footer 变化重渲染 */
export function useFooterSetter() {
  const setter = useContext(FooterSetterContext);
  if (!setter) throw new Error("useFooterSetter must be used within FooterProvider");
  return setter;
}

/** 兼容旧 API：同时提供 content 与 setter */
export function useFooter() {
  return {
    footerContent: useFooterContent(),
    setFooterContent: useFooterSetter(),
  };
}
