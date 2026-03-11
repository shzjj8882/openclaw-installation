import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { COLORFUL_THEME } from "./terminalTheme";

export function useTerminal(
  ptyId: string,
  initialCommand: string | undefined,
  readOnly: boolean
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(
    ptyId === "openclaw-logs" ? "正在连接日志…" : null
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const term = new Terminal({
      cursorBlink: !readOnly,
      fontSize: 14,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      theme: COLORFUL_THEME,
      overviewRuler: { width: 6 },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    terminalRef.current = term;
    fitRef.current = fit;

    const focusTerminal = () => {
      term.focus();
      term.textarea?.focus();
    };
    focusTerminal();
    requestAnimationFrame(focusTerminal);
    const focusTimer = setTimeout(focusTerminal, 100);
    containerRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });

    let initCommandSent = false;
    const cmdToSend = initialCommand?.trim();
    const sendInitCommand = () => {
      if (cmdToSend && !initCommandSent) {
        initCommandSent = true;
        window.electron?.ptyWrite?.(ptyId, cmdToSend + "\r");
      }
    };

    const unsub = window.electron?.onPtyData?.((id, data) => {
      if (id === ptyId) {
        setStatusMsg(null);
        term.write(data);
        sendInitCommand();
        term.scrollToBottom();
      }
    });

    const unsubExit = window.electron?.onPtyExit?.((id, code) => {
      if (id === ptyId && code !== 0) {
        setStatusMsg(`进程已退出 (code: ${code})`);
      }
    });

    window.electron?.ptySpawn?.(ptyId);
    window.electron?.ptyResize?.(ptyId, term.cols, term.rows);

    const fallbackTimer = cmdToSend ? setTimeout(sendInitCommand, 1500) : undefined;

    if (!readOnly) {
      term.onData((data) => {
        window.electron?.ptyWrite?.(ptyId, data);
      });
    }

    let lastCols = term.cols;
    let lastRows = term.rows;
    let rafId: number | null = null;
    const ro = new ResizeObserver(() => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        fit.fit();
        if (term.cols !== lastCols || term.rows !== lastRows) {
          lastCols = term.cols;
          lastRows = term.rows;
          window.electron?.ptyResize?.(ptyId, term.cols, term.rows);
        }
      });
    });
    ro.observe(containerRef.current);

    return () => {
      clearTimeout(focusTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (rafId != null) cancelAnimationFrame(rafId);
      ro.disconnect();
      unsub?.();
      unsubExit?.();
      window.electron?.ptyKill?.(ptyId);
      term.dispose();
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, []);

  return { containerRef, terminalRef, statusMsg };
}
