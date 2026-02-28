"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const PROMPT = "$ ";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(sessionId);
  const runningRef = useRef(false);
  const inputBufferRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);

  const writePrompt = useCallback(() => {
    termRef.current?.write(PROMPT);
  }, []);

  const replaceInput = useCallback((nextValue: string) => {
    const terminal = termRef.current;
    if (!terminal) {
      return;
    }

    const currentValue = inputBufferRef.current;
    if (currentValue.length > 0) {
      terminal.write("\b \b".repeat(currentValue.length));
    }
    inputBufferRef.current = nextValue;
    terminal.write(nextValue);
  }, []);

  const submitCommand = useCallback(
    async (command: string) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId) {
        termRef.current?.writeln(
          "\x1b[33mCreate a sandbox session before running commands.\x1b[0m",
        );
        writePrompt();
        return;
      }

      setRunning(true);
      runningRef.current = true;

      try {
        await sendTerminalInput(activeSessionId, command);
      } catch (error) {
        termRef.current?.writeln(
          `\x1b[31m${error instanceof Error ? error.message : "Command failed."}\x1b[0m`,
        );
      } finally {
        setRunning(false);
        runningRef.current = false;
        writePrompt();
      }
    },
    [writePrompt],
  );

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
    terminal.write(PROMPT);
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
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const terminal = termRef.current;
    if (!terminal) {
      return;
    }

    const disposable = terminal.onData((data) => {
      if (data === "\x1b[A") {
        const history = historyRef.current;
        if (history.length === 0) {
          return;
        }
        if (historyIndexRef.current === null) {
          historyIndexRef.current = history.length - 1;
        } else if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
        }
        replaceInput(history[historyIndexRef.current] ?? "");
        return;
      }

      if (data === "\x1b[B") {
        const history = historyRef.current;
        if (history.length === 0 || historyIndexRef.current === null) {
          return;
        }
        if (historyIndexRef.current < history.length - 1) {
          historyIndexRef.current += 1;
          replaceInput(history[historyIndexRef.current] ?? "");
        } else {
          historyIndexRef.current = null;
          replaceInput("");
        }
        return;
      }

      for (const chunk of data) {
        if (chunk === "\r") {
          const command = inputBufferRef.current.trim();
          inputBufferRef.current = "";
          historyIndexRef.current = null;
          terminal.write("\r\n");

          if (!command) {
            writePrompt();
            continue;
          }

          if (runningRef.current) {
            terminal.writeln("\x1b[33mA command is already running.\x1b[0m");
            writePrompt();
            continue;
          }

          historyRef.current.push(command);
          void submitCommand(command);
          continue;
        }

        if (chunk === "\u007f") {
          if (!runningRef.current && inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
            terminal.write("\b \b");
          }
          continue;
        }

        if (chunk === "\u0003") {
          if (runningRef.current) {
            terminal.writeln("^C");
            terminal.writeln(
              "\x1b[33mInterrupt is not available yet in this terminal mode.\x1b[0m",
            );
          } else {
            inputBufferRef.current = "";
            terminal.writeln("^C");
          }
          writePrompt();
          continue;
        }

        if (runningRef.current || chunk < " " || chunk === "\x1b") {
          continue;
        }

        inputBufferRef.current += chunk;
        terminal.write(chunk);
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [replaceInput, submitCommand, writePrompt]);

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
        <span>
          {connected ? (running ? "running command..." : "streaming") : "reconnecting..."}
        </span>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 px-2 py-1" />
    </div>
  );
}
