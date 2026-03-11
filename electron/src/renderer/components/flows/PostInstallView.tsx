import { useState, useEffect, useCallback } from "react";
import { useFooterSetter } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TerminalView } from "@/components/TerminalView";
import { PostInstallFooter } from "./PostInstallFooter";

export function PostInstallView() {
  const setFooterContent = useFooterSetter();
  const [showTerminal, setShowTerminal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [launchBackground, setLaunchBackground] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [gatewayRunning, setGatewayRunning] = useState(false);

  const refreshGatewayStatus = useCallback(async () => {
    const res = await window.electron?.checkGatewayStatus?.();
    setGatewayRunning(res?.running ?? false);
  }, []);

  useEffect(() => {
    if (!showTerminal && !showLogs) refreshGatewayStatus();
  }, [showTerminal, showLogs, refreshGatewayStatus]);

  const handleLaunch = useCallback(async () => {
    setLaunching(true);
    try {
      await window.electron?.launchOpenClaw?.(launchBackground, gatewayRunning);
      await refreshGatewayStatus();
    } finally {
      setLaunching(false);
    }
  }, [launchBackground, gatewayRunning, refreshGatewayStatus]);

  const goBack = useCallback(() => {
    setShowTerminal(false);
    setShowLogs(false);
  }, []);

  useEffect(() => {
    setFooterContent(
      <PostInstallFooter
        showTerminal={showTerminal}
        showLogs={showLogs}
        launchBackground={launchBackground}
        launching={launching}
        gatewayRunning={gatewayRunning}
        onLaunch={handleLaunch}
        onShowTerminal={() => setShowTerminal(true)}
        onShowLogs={() => setShowLogs(true)}
        onLaunchBackgroundChange={setLaunchBackground}
        onGoBack={goBack}
      />
    );
    return () => setFooterContent(null);
  }, [showTerminal, showLogs, launchBackground, launching, gatewayRunning, handleLaunch, goBack, setFooterContent]);

  if (showLogs) {
    return (
      <div className="space-y-4 animate-slide-up">
        <TerminalView
          ptyId="openclaw-logs"
          readOnly
          title="Gateway 实时日志（openclaw logs --follow）"
          onBack={() => setShowLogs(false)}
        />
      </div>
    );
  }

  if (showTerminal) {
    return (
      <div className="space-y-4 animate-slide-up">
        <TerminalView onBack={() => setShowTerminal(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <Card>
        <CardHeader>
          <CardTitle>安装完成</CardTitle>
          <CardDescription>
            OpenClaw 已就绪，可启动服务或通过命令行进行配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            使用底部按钮启动服务或进入配置模式。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
