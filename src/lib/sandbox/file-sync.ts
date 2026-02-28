import { getSandbox } from "@/lib/sandbox/client";
import { listProjectFiles, upsertProjectFiles } from "@/lib/projects/project-store";
import type { SessionRecord } from "@/lib/contracts/sandbox";
import { buildFileEntry, normalizePath } from "@/lib/projects/file-tree";

export async function syncProjectToSandbox(session: SessionRecord) {
  const sandbox = await getSandbox(session.sandboxId);
  const files = await listProjectFiles(session.projectId);
  const concreteFiles = files.filter((file) => !file.isDir);

  await sandbox.writeFiles(
    concreteFiles.map((file) => ({
      path: normalizePath(file.path),
      content: Buffer.from(file.content, "utf8"),
    })),
  );

  return {
    synced: concreteFiles.length,
  };
}

export async function syncProjectFromSandbox(session: SessionRecord) {
  const sandbox = await getSandbox(session.sandboxId);
  const listing = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      "find . -type f -not -path './node_modules/*' -not -path './.git/*' -print",
    ],
    cwd: "/vercel/sandbox",
  });

  const stdout = await listing.stdout();
  const rawPaths = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const normalizedPaths = rawPaths.map((value) =>
    normalizePath(value.replace(/^\.\//, "")),
  );

  const updates: Array<{ path: string; content: string; isDir: boolean }> = [];
  for (const path of normalizedPaths) {
    const fileBuffer = await sandbox.readFileToBuffer({
      path,
      cwd: "/vercel/sandbox",
    });
    if (!fileBuffer) {
      continue;
    }
    updates.push({
      path,
      content: fileBuffer.toString("utf8"),
      isDir: false,
    });
  }

  const syncedFiles = await upsertProjectFiles(session.projectId, updates);
  return {
    synced: syncedFiles.length,
    files: syncedFiles.map((file) =>
      buildFileEntry({
        path: file.path,
        content: file.content,
        isDir: file.isDir,
      }),
    ),
  };
}
