import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sandbox/client", () => {
  return {
    createSandbox: vi.fn(async () => ({ sandboxId: "sandbox-test-1" })),
    getSandbox: vi.fn(async () => ({
      stop: vi.fn(async () => ({})),
    })),
  };
});

import {
  createSession,
  getSession,
  terminateSession,
} from "@/lib/sandbox/session-service";

describe("session lifecycle", () => {
  it("creates and retrieves a session", async () => {
    const created = await createSession({
      projectId: "project-a",
      userId: "user-a",
    });

    expect(created.projectId).toBe("project-a");
    expect(created.userId).toBe("user-a");
    expect(created.sandboxId).toBe("sandbox-test-1");

    const fetched = await getSession(created.sessionId);
    expect(fetched?.sessionId).toBe(created.sessionId);
  });

  it("terminates a session", async () => {
    const created = await createSession({
      projectId: "project-b",
      userId: "user-b",
    });

    const terminated = await terminateSession(created.sessionId);
    expect(terminated?.status).toBe("terminated");

    const fetched = await getSession(created.sessionId);
    expect(fetched).toBeNull();
  });
});
