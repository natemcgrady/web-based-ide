"use client";

import type { FileEntry, SessionRecord, TerminalEvent } from "@/lib/contracts/sandbox";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }
  return payload;
}

export async function createSession(projectId: string) {
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  return parseJsonResponse<{ session: SessionRecord }>(response);
}

export async function listFiles(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/files`);
  return parseJsonResponse<{ projectId: string; files: FileEntry[] }>(response);
}

export async function saveFiles(
  projectId: string,
  files: Array<{ path: string; content: string; isDir?: boolean }>,
) {
  const response = await fetch(`/api/projects/${projectId}/files`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: files.map((file) => ({
        path: file.path,
        content: file.content,
        isDir: Boolean(file.isDir),
        operation: "upsert",
      })),
    }),
  });
  return parseJsonResponse<{ projectId: string; files: FileEntry[] }>(response);
}

export async function syncToSandbox(projectId: string, sessionId: string) {
  const response = await fetch(`/api/projects/${projectId}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, direction: "to-sandbox" }),
  });
  return parseJsonResponse<{ synced: number }>(response);
}

export async function syncFromSandbox(projectId: string, sessionId: string) {
  const response = await fetch(`/api/projects/${projectId}/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, direction: "from-sandbox" }),
  });
  return parseJsonResponse<{ synced: number; files: FileEntry[] }>(response);
}

export async function sendTerminalInput(sessionId: string, command: string) {
  const response = await fetch(`/api/terminal/${sessionId}/input`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  return parseJsonResponse<{ exitCode: number; cwd: string }>(response);
}

export async function startPreview(sessionId: string) {
  const response = await fetch(`/api/preview/${sessionId}/start`, {
    method: "POST",
  });
  return parseJsonResponse<{ previewUrl: string }>(response);
}

export async function getPreviewStatus(sessionId: string) {
  const response = await fetch(`/api/preview/${sessionId}/status`);
  return parseJsonResponse<{
    previewUrl: string;
    commandStatus: "not-started" | "running" | "stopped";
    exitCode: number | null;
  }>(response);
}

export function createTerminalEventSource({
  sessionId,
  cursor,
  onEvent,
  onReady,
}: {
  sessionId: string;
  cursor?: string | null;
  onEvent: (event: TerminalEvent) => void;
  onReady?: () => void;
}) {
  const params = new URLSearchParams();
  if (cursor) {
    params.set("cursor", cursor);
  }
  const source = new EventSource(
    `/api/terminal/${sessionId}/events?${params.toString()}`,
  );

  source.addEventListener("ready", () => {
    onReady?.();
  });
  for (const stream of ["stdout", "stderr", "system"] as const) {
    source.addEventListener(stream, (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as TerminalEvent;
      onEvent(payload);
    });
  }

  return source;
}
