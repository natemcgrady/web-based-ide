"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { EditorTabs } from "@/components/editor/EditorTabs";
import { FileExplorer } from "@/components/explorer/FileExplorer";
import { MonacoPane } from "@/components/editor/MonacoPane";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import {
  createSession,
  listFiles,
  saveFiles,
  syncFromSandbox,
  syncToSandbox,
} from "@/lib/api/client";
import { useIdeStore } from "@/lib/state/use-ide-store";

export function IdeShell() {
  const {
    projectId,
    session,
    files,
    activePath,
    dirtyFileMap,
    previewUrl,
    terminalCursor,
    setFiles,
    setActivePath,
    setSession,
    updateFileContent,
    markDirty,
    setPreviewUrl,
    setTerminalCursor,
  } = useIdeStore();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("booting");

  const activeFile = useMemo(
    () => files.find((file) => file.path === activePath) ?? null,
    [activePath, files],
  );

  const refreshFiles = useCallback(async () => {
    const payload = await listFiles(projectId);
    setFiles(payload.files);
  }, [projectId, setFiles]);

  useEffect(() => {
    void (async () => {
      try {
        setStatus("loading files");
        await refreshFiles();
        setStatus("ready");
      } catch (error) {
        setStatus(
          error instanceof Error ? `load failed: ${error.message}` : "load failed",
        );
      }
    })();
  }, [refreshFiles]);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
            web-based-ide
          </p>
          <h1 className="font-mono text-sm text-zinc-300">
            Next.js + Vercel Sandbox
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading}
            className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={async () => {
              try {
                setLoading(true);
                setStatus("creating session");
                const result = await createSession(projectId);
                setSession(result.session);
                setStatus(`session ready (${result.session.sessionId.slice(0, 8)})`);
              } catch (error) {
                setStatus(
                  error instanceof Error
                    ? `session failed: ${error.message}`
                    : "session failed",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            New Sandbox Session
          </button>
          <button
            type="button"
            disabled={loading || !session}
            className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={async () => {
              if (!session) {
                return;
              }
              try {
                setLoading(true);
                setStatus("syncing files to sandbox");
                const result = await syncToSandbox(projectId, session.sessionId);
                setStatus(`synced ${result.synced} files to sandbox`);
              } catch (error) {
                setStatus(
                  error instanceof Error ? `sync failed: ${error.message}` : "sync failed",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            Sync to Sandbox
          </button>
          <button
            type="button"
            disabled={loading || !session}
            className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={async () => {
              if (!session) {
                return;
              }
              try {
                setLoading(true);
                setStatus("syncing files from sandbox");
                await syncFromSandbox(projectId, session.sessionId);
                await refreshFiles();
                setStatus("refreshed from sandbox");
              } catch (error) {
                setStatus(
                  error instanceof Error ? `sync failed: ${error.message}` : "sync failed",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            Pull from Sandbox
          </button>
          <button
            type="button"
            disabled={loading || !activeFile}
            className="rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={async () => {
              if (!activeFile) {
                return;
              }
              try {
                setLoading(true);
                setStatus(`saving ${activeFile.path}`);
                const payload = await saveFiles(projectId, [
                  {
                    path: activeFile.path,
                    content: activeFile.content,
                    isDir: false,
                  },
                ]);
                setFiles(payload.files);
                markDirty(activeFile.path, false);
                setStatus("saved");
              } catch (error) {
                setStatus(
                  error instanceof Error ? `save failed: ${error.message}` : "save failed",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            Save Active File
          </button>
        </div>
      </header>

      <div className="border-b border-zinc-800 px-4 py-1 text-xs text-zinc-500">
        {status}
      </div>

      <PanelGroup direction="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize={20} minSize={16}>
          <FileExplorer
            files={files}
            activePath={activePath}
            onSelect={setActivePath}
            onCreateFile={async (path) => {
              const payload = await saveFiles(projectId, [{ path, content: "" }]);
              setFiles(payload.files);
              setActivePath(path);
            }}
          />
        </Panel>

        <PanelResizeHandle className="w-px bg-zinc-800" />

        <Panel defaultSize={52} minSize={28}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={68} minSize={30}>
              <div className="flex h-full flex-col">
                <EditorTabs
                  paths={files.filter((file) => !file.isDir).map((file) => file.path)}
                  activePath={activePath}
                  dirtyMap={dirtyFileMap}
                  onSelect={setActivePath}
                />
                <div className="min-h-0 flex-1">
                  {activeFile ? (
                    <MonacoPane
                      path={activeFile.path}
                      value={activeFile.content}
                      onChange={(value) => updateFileContent(activeFile.path, value)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                      Select a file from explorer.
                    </div>
                  )}
                </div>
              </div>
            </Panel>
            <PanelResizeHandle className="h-px bg-zinc-800" />
            <Panel defaultSize={32} minSize={20}>
              <TerminalPanel
                sessionId={session?.sessionId ?? null}
                cursor={terminalCursor}
                onCursorChange={setTerminalCursor}
              />
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-px bg-zinc-800" />

        <Panel defaultSize={28} minSize={18}>
          <PreviewPanel
            sessionId={session?.sessionId ?? null}
            previewUrl={previewUrl}
            onPreviewUrlChange={setPreviewUrl}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}
