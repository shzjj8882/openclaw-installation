import { useState, useCallback } from "react";
import { useFooterSetter } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { StepFooter } from "./StepFooter";
import type { EnvCheckResult } from "@/types";
import { CheckCircle2, Download, Loader2 } from "lucide-react";

interface InstallStepOpenClawProps {
  envCheck: EnvCheckResult | null;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  onRefresh: (force?: boolean) => Promise<unknown>;
}

export function InstallStepOpenClaw({
  envCheck,
  onNext,
  onPrev,
  isFirst,
  isLast,
  onRefresh,
}: InstallStepOpenClawProps) {
  const setFooterContent = useFooterSetter();
  const installed = envCheck?.openclaw ?? false;
  const version = envCheck?.versions?.openclaw;
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [installError, setInstallError] = useState<string | null>(null);

  const handleInstall = useCallback(async () => {
    const electron = window.electron;
    if (!electron?.onInstallProgress) {
      electron?.runOpenClawInstall?.("npm");
      return;
    }

    setInstalling(true);
    setInstallError(null);
    setProgress(0);
    setProgressMsg("即将弹出授权窗口，请输入密码...");

    const unsubscribe = electron.onInstallProgress((data) => {
      setProgress(data.progress ?? 0);
      setProgressMsg(data.message ?? "");
    });

    try {
      const useSudo = /Mac|Linux/.test(navigator.userAgent) && electron.installOpenClawWithSudo;
      if (useSudo) {
        await electron.installOpenClawWithSudo();
      } else {
        await electron.installOpenClaw();
      }
      await onRefresh(true);
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : "安装失败");
    } finally {
      unsubscribe?.();
      setInstalling(false);
    }
  }, [onRefresh]);

  return (
    <div className="space-y-6">
      {installed ? (
        <div className="flex items-center gap-4 p-5 rounded-xl bg-primary/15 border border-primary/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold">OpenClaw 已安装</p>
            <p className="text-sm text-muted-foreground">
              版本: {version || "已检测"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-muted-foreground leading-relaxed">
            安装 OpenClaw CLI。点击下方按钮，按提示完成授权即可。
          </p>

          {installing ? (
            <div className="space-y-4 p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                <span className="font-medium">{progressMsg || "安装中…"}</span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-primary/20">
                {progress < 10 ? (
                  <div className="h-full w-1/3 bg-primary animate-progress-indeterminate rounded-full" />
                ) : (
                  <div
                    className="h-full w-full bg-primary transition-all duration-500 ease-out rounded-full"
                    style={{ transform: `translateX(-${100 - progress}%)` }}
                  />
                )}
              </div>
            </div>
          ) : (
            <Button onClick={handleInstall} className="gap-2">
              <Download className="h-4 w-4" />
              一键安装
            </Button>
          )}

          {installError && (
            <p className="text-sm text-destructive font-medium">{installError}</p>
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onRefresh()} disabled={installing}>
              刷新检测
            </Button>
            {window.electron?.runOpenClawInstall != null && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.electron!.runOpenClawInstall!("npm")}
                disabled={installing}
              >
                在终端运行
              </Button>
            )}
          </div>
        </div>
      )}
      <StepFooter
        onPrev={onPrev}
        onNext={onNext}
        isFirst={isFirst}
        isLast={isLast}
        nextDisabled={!installed}
        nextLabel={isLast ? "进入配置" : "下一步"}
        setFooterContent={setFooterContent}
      />
    </div>
  );
}
