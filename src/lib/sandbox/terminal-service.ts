import { getSandbox } from "@/lib/sandbox/client";
import { pushTerminalEvent } from "@/lib/sandbox/terminal-event-store";
import { updateSession } from "@/lib/sandbox/session-service";
import type { SessionRecord } from "@/lib/contracts/sandbox";
import { validateTerminalCommand } from "@/lib/security/policies";
import { logAuditEvent } from "@/lib/audit/events";

const PWD_SENTINEL = "__WEB_BASED_IDE_PWD__:";

function shellSingleQuote(value: string) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function extractPwd(stdout: string) {
  const lines = stdout.split("\n");
  const markerLine = lines.find((line) => line.startsWith(PWD_SENTINEL));
  if (!markerLine) {
    return { stdout, cwd: null };
  }

  const cwd = markerLine.slice(PWD_SENTINEL.length).trim();
  const cleanStdout = lines
    .filter((line) => !line.startsWith(PWD_SENTINEL))
    .join("\n");

  return {
    stdout: cleanStdout,
    cwd: cwd || null,
  };
}

export async function runTerminalCommand({
  session,
  command,
  actorId,
}: {
  session: SessionRecord;
  command: string;
  actorId: string;
}) {
  validateTerminalCommand(command);

  const sandbox = await getSandbox(session.sandboxId);
  await updateSession(session.sessionId, { status: "busy" });

  pushTerminalEvent({
    sessionId: session.sessionId,
    stream: "system",
    payload: `$ ${command}`,
  });

  const wrapped = [
    `cd ${shellSingleQuote(session.cwd)}`,
    command,
    `printf "\\n${PWD_SENTINEL}%s\\n" "$PWD"`,
  ].join(" && ");

  const result = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", wrapped],
    cwd: "/vercel/sandbox",
  });

  const [stdoutRaw, stderr] = await Promise.all([result.stdout(), result.stderr()]);
  const { stdout, cwd } = extractPwd(stdoutRaw);

  if (stdout.trim().length > 0) {
    pushTerminalEvent({
      sessionId: session.sessionId,
      stream: "stdout",
      payload: stdout,
    });
  }

  if (stderr.trim().length > 0) {
    pushTerminalEvent({
      sessionId: session.sessionId,
      stream: "stderr",
      payload: stderr,
    });
  }

  const nextState: Partial<SessionRecord> = {
    status: "ready",
  };
  if (cwd) {
    nextState.cwd = cwd;
  }

  await updateSession(session.sessionId, nextState);
  logAuditEvent({
    type: "terminal.command",
    actorId,
    sessionId: session.sessionId,
    projectId: session.projectId,
    payload: {
      command,
      exitCode: result.exitCode,
    },
  });

  return {
    exitCode: result.exitCode,
    cwd: cwd ?? session.cwd,
  };
}
