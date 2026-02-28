type AuditEvent = {
  type: string;
  actorId: string;
  sessionId?: string;
  projectId?: string;
  payload?: Record<string, unknown>;
  at: string;
};

const auditEvents: AuditEvent[] = [];

export function logAuditEvent(event: Omit<AuditEvent, "at">) {
  const enriched: AuditEvent = {
    ...event,
    at: new Date().toISOString(),
  };
  auditEvents.push(enriched);
  if (auditEvents.length > 1000) {
    auditEvents.shift();
  }

  // Structured output for Vercel logs.
  console.info("[audit]", JSON.stringify(enriched));
}

export function listAuditEvents(limit = 100) {
  return auditEvents.slice(-limit);
}
