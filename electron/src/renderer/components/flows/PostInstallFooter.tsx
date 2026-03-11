import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Play, Settings, RotateCw } from "lucide-react";
import { CONFIG_COMPLETE_DOC_URL } from "@/lib/channelDocs";

interface PostInstallFooterProps {
  showTerminal: boolean;
  showLogs: boolean;
  launchBackground: boolean;
  launching: boolean;
  gatewayRunning: boolean;
  onLaunch: () => void;
  onShowTerminal: () => void;
  onShowLogs: () => void;
  onLaunchBackgroundChange: (v: boolean) => void;
  onGoBack: () => void;
}

export function PostInstallFooter({
  showTerminal,
  showLogs,
  launchBackground,
  launching,
  gatewayRunning,
  onLaunch,
  onShowTerminal,
  onShowLogs,
  onLaunchBackgroundChange,
  onGoBack,
}: PostInstallFooterProps) {
  if (showTerminal || showLogs) {
    return (
      <div className="flex items-center justify-between w-full gap-4">
        <Button variant="outline" onClick={onGoBack} className="gap-2">
          ← 返回
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.electron?.openExternal?.(CONFIG_COMPLETE_DOC_URL)}
          >
            <ExternalLink className="h-4 w-4" />
            文档
          </Button>
          <Button onClick={onGoBack} className="gap-2">
            完成配置
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <Button className="flex-1 min-w-[8rem] gap-2" onClick={onLaunch} disabled={launching}>
          {gatewayRunning ? (
            <>
              <RotateCw className="h-4 w-4" />
              {launching ? "重启中…" : "重新启动"}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              {launching ? "启动中…" : "启动"}
            </>
          )}
        </Button>
        <Button variant="outline" className="flex-1 min-w-[8rem] gap-2" onClick={onShowTerminal}>
          <Settings className="h-4 w-4" />
          更改配置
        </Button>
        {gatewayRunning && (
          <Button variant="outline" className="flex-1 min-w-[8rem] gap-2" onClick={onShowLogs}>
            <FileText className="h-4 w-4" />
            查看日志
          </Button>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={launchBackground}
          onChange={(e) => onLaunchBackgroundChange(e.target.checked)}
          className="rounded border-gray-500"
        />
        后台启动（Gateway 在后台运行，不占用终端）
      </label>
    </div>
  );
}
