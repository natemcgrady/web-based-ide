"use client";

import { useMemo, useState } from "react";
import type { FileEntry } from "@/lib/contracts/sandbox";

type FileExplorerProps = {
  files: FileEntry[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onCreateFile: (path: string) => Promise<void>;
};

type TreeNode = {
  label: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
};

function buildTree(files: FileEntry[]) {
  const root: TreeNode = {
    label: "/",
    path: "",
    isFile: false,
    children: [],
  };

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let cursor = root;
    segments.forEach((segment, index) => {
      const candidatePath = segments.slice(0, index + 1).join("/");
      let child = cursor.children.find((item) => item.path === candidatePath);
      if (!child) {
        child = {
          label: segment,
          path: candidatePath,
          isFile: index === segments.length - 1 && !file.isDir,
          children: [],
        };
        cursor.children.push(child);
      }
      cursor = child;
    });
  }

  const sortNode = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFile === b.isFile) {
        return a.label.localeCompare(b.label);
      }
      return a.isFile ? 1 : -1;
    });
    node.children.forEach(sortNode);
  };

  sortNode(root);
  return root.children;
}

function Tree({
  nodes,
  depth,
  activePath,
  onSelect,
}: {
  nodes: TreeNode[];
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isActive = node.path === activePath;
        return (
          <div key={node.path}>
            <button
              type="button"
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
              className={`w-full py-1 text-left text-xs ${
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
              onClick={() => node.isFile && onSelect(node.path)}
            >
              {node.isFile ? "📄" : "📁"} {node.label}
            </button>
            {node.children.length > 0 ? (
              <Tree
                nodes={node.children}
                depth={depth + 1}
                activePath={activePath}
                onSelect={onSelect}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function FileExplorer({
  files,
  activePath,
  onSelect,
  onCreateFile,
}: FileExplorerProps) {
  const [newPath, setNewPath] = useState("");
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="flex h-full flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 p-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Explorer
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={newPath}
            onChange={(event) => setNewPath(event.target.value)}
            placeholder="src/new-file.ts"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-500"
          />
          <button
            type="button"
            className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-900"
            onClick={async () => {
              if (!newPath.trim()) {
                return;
              }
              await onCreateFile(newPath.trim());
              setNewPath("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <Tree nodes={tree} depth={0} activePath={activePath} onSelect={onSelect} />
      </div>
    </div>
  );
}
