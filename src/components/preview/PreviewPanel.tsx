"use client";

import { useState } from "react";
import { getPreviewStatus, startPreview } from "@/lib/api/client";

type PreviewPanelProps = {
  sessionId: string | null;
  previewUrl: string | null;
  onPreviewUrlChange: (url: string | null) => void;
};

export function PreviewPanel({
  sessionId,
  previewUrl,
  onPreviewUrlChange,
}: PreviewPanelProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("idle");

  return (
    <div className="flex h-full flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-xs text-zinc-400">
        <span>Preview</span>
        <span>{status}</span>
      </div>
      <div className="flex gap-2 border-b border-zinc-800 p-2">
        <button
          type="button"
          disabled={!sessionId || loading}
          className="rounded bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={async () => {
            if (!sessionId) {
              return;
            }
            try {
              setLoading(true);
              setStatus("starting");
              const result = await startPreview(sessionId);
              onPreviewUrlChange(result.previewUrl);
              setStatus("running");
            } catch (error) {
              setStatus(
                error instanceof Error ? `error: ${error.message}` : "start failed",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          Start
        </button>
        <button
          type="button"
          disabled={!sessionId || loading}
          className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={async () => {
            if (!sessionId) {
              return;
            }
            try {
              setLoading(true);
              const nextStatus = await getPreviewStatus(sessionId);
              onPreviewUrlChange(nextStatus.previewUrl);
              setStatus(nextStatus.commandStatus);
            } catch {
              setStatus("status failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          Refresh
        </button>
      </div>
      {previewUrl ? (
        <iframe
          title="Sandbox Preview"
          src={previewUrl}
          className="h-full w-full bg-white"
          sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Start preview to load the sandbox app.
        </div>
      )}
    </div>
  );
}
