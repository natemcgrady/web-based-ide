"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { createTerminalEventSource, sendTerminalInput } from "@/lib/api/client";

type TerminalPanelProps = {
  sessionId: string | null;
  cursor: string | null;
  onCursorChange: (cursor: string | null) => void;
};

export function TerminalPanel({
  sessionId,
  cursor,
  onCursorChange,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);

  const disabled = useMemo(() => !sessionId || running, [running, sessionId]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const terminal = new Terminal({
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
      fontSize: 12,
      convertEol: true,
      theme: {
        background: "#09090b",
        foreground: "#e4e4e7",
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();
    terminal.writeln("web-based-ide terminal connected.");
    termRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const onResize = () => fitAddon.fit();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      terminal.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sessionId || !termRef.current) {
      return;
    }
    const source = createTerminalEventSource({
      sessionId,
      cursor,
      onReady: () => {
        setConnected(true);
      },
      onEvent: (event) => {
        onCursorChange(event.id);
        const prefix =
          event.stream === "stderr"
            ? "\x1b[31m"
            : event.stream === "system"
              ? "\x1b[36m"
              : "";
        const suffix = prefix ? "\x1b[0m" : "";
        termRef.current?.writeln(`${prefix}${event.payload}${suffix}`);
      },
    });

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
    };
  }, [cursor, onCursorChange, sessionId]);

  return (
    <div className="flex h-full flex-col border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-xs text-zinc-400">
        <span>Terminal</span>
        <span>{connected ? "streaming" : "reconnecting..."}</span>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 px-2 py-1" />
      <form
        className="flex gap-2 border-t border-zinc-800 p-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!sessionId || !command.trim()) {
            return;
          }
          try {
            setRunning(true);
            await sendTerminalInput(sessionId, command.trim());
            setCommand("");
          } catch (error) {
            termRef.current?.writeln(
              `\x1b[31m${error instanceof Error ? error.message : "Command failed."}\x1b[0m`,
            );
          } finally {
            setRunning(false);
          }
        }}
      >
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder={sessionId ? "Type a shell command..." : "Create a session first"}
          disabled={disabled}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run
        </button>
      </form>
    </div>
  );
}
