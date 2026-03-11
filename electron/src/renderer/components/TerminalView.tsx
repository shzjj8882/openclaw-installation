import "@xterm/xterm/css/xterm.css";
import { ARROW_ESC } from "./terminalTheme";
import { useTerminal } from "./useTerminal";

const DEFAULT_TERMINAL_ID = "openclaw-config-terminal";

export function TerminalView({
  onBack,
  initialCommand,
  ptyId = DEFAULT_TERMINAL_ID,
  readOnly = false,
  title,
}: {
  onBack?: () => void;
  initialCommand?: string;
  ptyId?: string;
  readOnly?: boolean;
  title?: string;
}) {
  const { containerRef, terminalRef, statusMsg } = useTerminal(ptyId, initialCommand, readOnly);

  const focus = () => {
    terminalRef.current?.focus();
    terminalRef.current?.textarea?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const esc = ARROW_ESC[e.key];
    if (esc) {
      e.stopPropagation();
      e.preventDefault();
      window.electron?.ptyWrite?.(ptyId, esc);
    } else if (e.key === "Tab") {
      e.stopPropagation();
    }
  };

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden border border-white/10 bg-slate-900 outline-none"
      style={{ height: 450 }}
      tabIndex={0}
      onClick={focus}
      onFocus={focus}
      onKeyDownCapture={handleKeyDown}
      role="application"
      aria-label="终端"
    >
      {onBack && (
        <div
          className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-slate-800/50 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 返回
          </button>
          <span className="text-xs text-muted-foreground">
            {statusMsg ?? title ?? "在此终端中运行 openclaw onboard、openclaw config 等命令进行配置"}
          </span>
        </div>
      )}
      <div ref={containerRef} className="flex-1 min-h-0 p-2 cursor-text" />
    </div>
  );
}
