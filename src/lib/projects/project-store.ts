import type { FileEntry } from "@/lib/contracts/sandbox";
import { buildFileEntry, normalizePath, sortedTree } from "@/lib/projects/file-tree";

const store = new Map<string, Map<string, FileEntry>>();

function ensureProject(projectId: string) {
  const existing = store.get(projectId);
  if (existing) {
    return existing;
  }

  const files = new Map<string, FileEntry>();
  const seed = [
    buildFileEntry({
      path: "package.json",
      content: JSON.stringify(
        {
          name: "sandbox-project",
          private: true,
          scripts: {
            dev: "vite --host 0.0.0.0 --port 3000",
            build: "vite build",
            preview: "vite preview --host 0.0.0.0 --port 3000",
          },
        },
        null,
        2,
      ),
    }),
    buildFileEntry({
      path: "index.html",
      content: [
        "<!doctype html>",
        "<html>",
        "  <head>",
        "    <meta charset=\"UTF-8\" />",
        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />",
        "    <title>web-based-ide preview</title>",
        "  </head>",
        "  <body>",
        "    <div id=\"app\"></div>",
        "    <script type=\"module\" src=\"/src/main.ts\"></script>",
        "  </body>",
        "</html>",
      ].join("\n"),
    }),
    buildFileEntry({
      path: "src/main.ts",
      content: [
        "const app = document.getElementById('app');",
        "if (app) {",
        "  app.innerHTML = '<h1>web-based-ide sandbox is live.</h1>';",
        "}",
      ].join("\n"),
    }),
  ];

  seed.forEach((entry) => files.set(entry.path, entry));
  store.set(projectId, files);
  return files;
}

export async function listProjectFiles(projectId: string) {
  const files = ensureProject(projectId);
  return sortedTree(Array.from(files.values()));
}

export async function upsertProjectFiles(
  projectId: string,
  updates: Array<Pick<FileEntry, "path" | "content" | "isDir">>,
) {
  const files = ensureProject(projectId);

  for (const update of updates) {
    const path = normalizePath(update.path);
    const entry = buildFileEntry({
      path,
      content: update.content,
      isDir: update.isDir,
    });
    files.set(path, entry);
  }

  return sortedTree(Array.from(files.values()));
}

export async function deleteProjectFiles(projectId: string, paths: string[]) {
  const files = ensureProject(projectId);
  for (const path of paths) {
    files.delete(normalizePath(path));
  }
  return sortedTree(Array.from(files.values()));
}
