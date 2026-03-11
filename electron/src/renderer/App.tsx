import { useEffect, lazy, Suspense } from "react";
import { AppProvider, useEnv, useFooterContent } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";

const InstallFlow = lazy(() =>
  import("@/components/flows/InstallFlow").then((m) => ({ default: m.InstallFlow }))
);
const PostInstallView = lazy(() =>
  import("@/components/flows/PostInstallView").then((m) => ({ default: m.PostInstallView }))
);

function MainContent() {
  const { appState, refreshEnvCheck, setAppState } = useEnv();

  useEffect(() => {
    refreshEnvCheck().then((result) => {
      if (!result) return;
      if (result.openclaw && result.nodejs) {
        const needHomebrew = /Mac|Linux/.test(navigator.userAgent);
        if (!needHomebrew || result.homebrew) {
          setAppState("configure");
        }
      }
    });
  }, [refreshEnvCheck, setAppState]);

  return (
    <div className="h-screen flex flex-col gradient-bg overflow-hidden">
      <header className="flex-shrink-0 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <img src="./logo.svg" alt="OpenClaw Logo" className="h-8 w-8 flex-shrink-0" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">OpenClaw 安装助手</h1>
            <p className="text-sm text-muted-foreground mt-1">图形化引导，让 AI 助手触手可及</p>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 animate-fade-in">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">加载中…</p>
              </div>
            }
          >
            {appState === "install" ? <InstallFlow /> : <PostInstallView />}
          </Suspense>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

/** 独立组件，仅订阅 footerContent，避免 MainContent 因 footer 变化重渲染 */
function AppFooter() {
  const footerContent = useFooterContent();
  if (!footerContent) return null;
  return (
    <footer className="flex-shrink-0 border-t border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto px-6 pt-4 pb-8">{footerContent}</div>
    </footer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
