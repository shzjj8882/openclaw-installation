import { useState, useCallback } from "react";
import { useFooterSetter } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { StepFooter } from "./StepFooter";
import { Progress } from "@/components/ui/progress";
import type { EnvCheckResult } from "@/types";
import { CheckCircle2, Download, Loader2 } from "lucide-react";

interface InstallStepNodejsProps {
  envCheck: EnvCheckResult | null;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  onRefresh: () => Promise<unknown>;
}

export function InstallStepNodejs({
  envCheck,
  onNext,
  onPrev,
  isFirst,
  isLast,
  onRefresh,
}: InstallStepNodejsProps) {
  const setFooterContent = useFooterSetter();
  const installed = envCheck?.nodejs ?? false;
  const version = envCheck?.versions?.node;
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [installError, setInstallError] = useState<string | null>(null);

  const handleInstall = useCallback(async () => {
    const electron = window.electron;
    if (!electron?.installNodejs || !electron?.onInstallProgress) {
      electron?.openExternal?.("https://nodejs.org/");
      return;
    }

    setInstalling(true);
    setInstallError(null);
    setProgress(0);
    setProgressMsg("准备中...");

    const unsubscribe = electron.onInstallProgress((data) => {
      setProgress(data.progress ?? 0);
      setProgressMsg(data.message ?? "");
    });

    try {
      await electron.installNodejs();
      await onRefresh();
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : "安装失败");
    } finally {
      unsubscribe?.();
      setInstalling(false);
    }
  }, [onRefresh]);

  const handleOpenWebsite = () => {
    window.electron?.openExternal?.("https://nodejs.org/");
  };

  return (
    <div className="space-y-6">
      {installed ? (
        <div className="flex items-center gap-4 p-5 rounded-xl bg-primary/15 border border-primary/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Node.js 已安装</p>
            <p className="text-sm text-muted-foreground">
              版本: {version || "已检测"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-muted-foreground leading-relaxed">
            OpenClaw 需要 Node.js 22+。点击下方按钮在应用内自动安装。
          </p>

          {installing ? (
            <div className="space-y-4 p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">{progressMsg}</span>
              </div>
              <Progress value={progress} />
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={handleInstall} className="gap-2">
                <Download className="h-4 w-4" />
                一键安装 Node.js
              </Button>
              <Button variant="outline" onClick={handleOpenWebsite} className="gap-2">
                手动下载
              </Button>
            </div>
          )}

          {installError && (
            <p className="text-sm text-destructive font-medium">{installError}</p>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={installing}
          >
            刷新检测
          </Button>
        </div>
      )}
      <StepFooter
        onPrev={onPrev}
        onNext={onNext}
        isFirst={isFirst}
        isLast={isLast}
        nextDisabled={!installed}
        nextLabel={isLast ? "完成安装" : "下一步"}
        setFooterContent={setFooterContent}
      />
    </div>
  );
}
