import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth/user";
import { jsonError } from "@/lib/http";
import { getSession } from "@/lib/sandbox/session-service";
import { assertSessionOwnership } from "@/lib/security/policies";
import { listTerminalEvents } from "@/lib/sandbox/terminal-event-store";

export const runtime = "nodejs";
export const maxDuration = 60;

type Context = {
  params: Promise<{
    sessionId: string;
  }>;
};

const encoder = new TextEncoder();

function formatSseEvent({
  id,
  event,
  data,
}: {
  id?: string;
  event?: string;
  data: string;
}) {
  const lines = [];
  if (id) {
    lines.push(`id: ${id}`);
  }
  if (event) {
    lines.push(`event: ${event}`);
  }
  lines.push(`data: ${data}`);
  return `${lines.join("\n")}\n\n`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest, context: Context) {
  const { sessionId } = await context.params;
  const user = getUserFromRequest(request);

  const session = await getSession(sessionId);
  if (!session) {
    return jsonError("Session not found.", 404);
  }

  try {
    assertSessionOwnership(user.id, session.userId);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Forbidden", 403);
  }

  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const startedAt = Date.now();
      let lastCursor = cursor;

      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      void (async () => {
        controller.enqueue(
          encoder.encode(
            formatSseEvent({
              event: "ready",
              data: JSON.stringify({ sessionId }),
            }),
          ),
        );

        while (!closed) {
          if (request.signal.aborted || Date.now() - startedAt > 55_000) {
            close();
            break;
          }

          const events = listTerminalEvents(sessionId, lastCursor);
          for (const event of events) {
            lastCursor = event.id;
            controller.enqueue(
              encoder.encode(
                formatSseEvent({
                  id: event.id,
                  event: event.stream,
                  data: JSON.stringify(event),
                }),
              ),
            );
          }

          controller.enqueue(encoder.encode(": heartbeat\n\n"));
          await sleep(1000);
        }
      })();

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
