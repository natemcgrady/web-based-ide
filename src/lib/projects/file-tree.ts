import { createHash } from "node:crypto";
import type { FileEntry } from "@/lib/contracts/sandbox";

export function normalizePath(path: string) {
  const trimmed = path.trim().replaceAll("\\", "/");
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}

export function computeFileHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

export function buildFileEntry({
  path,
  content,
  isDir,
}: {
  path: string;
  content: string;
  isDir?: boolean;
}): FileEntry {
  const normalizedPath = normalizePath(path);
  const resolvedContent = isDir ? "" : content;
  return {
    path: normalizedPath,
    content: resolvedContent,
    isDir: Boolean(isDir),
    hash: computeFileHash(`${normalizedPath}:${resolvedContent}:${Boolean(isDir)}`),
    updatedAt: new Date().toISOString(),
  };
}

export function sortedTree(files: FileEntry[]) {
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}
