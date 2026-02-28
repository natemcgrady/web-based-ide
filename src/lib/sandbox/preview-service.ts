import { Writable } from "node:stream";
import { getSandbox } from "@/lib/sandbox/client";
import { pushTerminalEvent } from "@/lib/sandbox/terminal-event-store";
import type { SessionRecord } from "@/lib/contracts/sandbox";
import { updateSession } from "@/lib/sandbox/session-service";
import { logAuditEvent } from "@/lib/audit/events";

function streamToTerminal(sessionId: string, stream: "stdout" | "stderr") {
  return new Writable({
    write(chunk, _encoding, callback) {
      pushTerminalEvent({
        sessionId,
        stream,
        payload: chunk.toString("utf8"),
      });
      callback();
    },
  });
}

export async function startPreview({
  session,
  actorId,
}: {
  session: SessionRecord;
  actorId: string;
}) {
  const sandbox = await getSandbox(session.sandboxId);

  pushTerminalEvent({
    sessionId: session.sessionId,
    stream: "system",
    payload: "Installing dependencies in sandbox with pnpm...",
  });

  await sandbox.runCommand({
    cmd: "pnpm",
    args: ["install", "--ignore-scripts"],
    cwd: "/vercel/sandbox",
    stdout: streamToTerminal(session.sessionId, "stdout"),
    stderr: streamToTerminal(session.sessionId, "stderr"),
  });

  pushTerminalEvent({
    sessionId: session.sessionId,
    stream: "system",
    payload: `Starting preview server on port ${session.previewPort}...`,
  });

  const command = await sandbox.runCommand({
    cmd: "pnpm",
    args: ["dev", "--host", "0.0.0.0", "--port", String(session.previewPort)],
    cwd: "/vercel/sandbox",
    detached: true,
    stdout: streamToTerminal(session.sessionId, "stdout"),
    stderr: streamToTerminal(session.sessionId, "stderr"),
  });

  const updated = await updateSession(session.sessionId, {
    previewCommandId: command.cmdId,
  });

  logAuditEvent({
    type: "preview.start",
    actorId,
    sessionId: session.sessionId,
    projectId: session.projectId,
    payload: {
      commandId: command.cmdId,
    },
  });

  return {
    commandId: command.cmdId,
    previewUrl: sandbox.domain(session.previewPort),
    session: updated,
  };
}

export async function getPreviewStatus(session: SessionRecord) {
  const sandbox = await getSandbox(session.sandboxId);
  let commandStatus: "not-started" | "running" | "stopped" = "not-started";
  let exitCode: number | null = null;

  if (session.previewCommandId) {
    const command = await sandbox.getCommand(session.previewCommandId);
    exitCode = command.exitCode;
    commandStatus = exitCode === null ? "running" : "stopped";
  }

  return {
    previewUrl: sandbox.domain(session.previewPort),
    commandStatus,
    exitCode,
  };
}
