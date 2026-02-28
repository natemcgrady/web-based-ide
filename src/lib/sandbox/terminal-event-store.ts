import type { TerminalEvent } from "@/lib/contracts/sandbox";

const eventsBySession = new Map<string, TerminalEvent[]>();
const MAX_EVENTS = 1500;

export function pushTerminalEvent(
  event: Omit<TerminalEvent, "id" | "createdAt"> & { id?: string },
) {
  const payload: TerminalEvent = {
    id: event.id ?? crypto.randomUUID(),
    sessionId: event.sessionId,
    stream: event.stream,
    payload: event.payload,
    createdAt: new Date().toISOString(),
  };

  const existing = eventsBySession.get(event.sessionId) ?? [];
  existing.push(payload);
  if (existing.length > MAX_EVENTS) {
    existing.splice(0, existing.length - MAX_EVENTS);
  }
  eventsBySession.set(event.sessionId, existing);
  return payload;
}

export function listTerminalEvents(sessionId: string, cursor?: string) {
  const events = eventsBySession.get(sessionId) ?? [];
  if (!cursor) {
    return events;
  }
  const index = events.findIndex((event) => event.id === cursor);
  return index >= 0 ? events.slice(index + 1) : events;
}
