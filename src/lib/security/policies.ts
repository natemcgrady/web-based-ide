import { env } from "@/lib/env";

const blockedFragments = [
  "rm -rf /",
  ":(){ :|:& };:",
  "shutdown",
  "reboot",
  "mkfs",
  "dd if=",
];

export function validateTerminalCommand(command: string) {
  const normalized = command.trim();
  if (!normalized) {
    throw new Error("Command cannot be empty.");
  }
  if (normalized.length > env.TERMINAL_MAX_COMMAND_LENGTH) {
    throw new Error("Command exceeds allowed length.");
  }

  const lowered = normalized.toLowerCase();
  for (const fragment of blockedFragments) {
    if (lowered.includes(fragment)) {
      throw new Error(`Blocked command pattern detected: ${fragment}`);
    }
  }
}

export function assertSessionOwnership(userId: string, sessionUserId: string) {
  if (userId !== sessionUserId) {
    throw new Error("You do not have access to this session.");
  }
}
