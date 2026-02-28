"use client";

type EditorTabsProps = {
  paths: string[];
  activePath: string | null;
  dirtyMap: Record<string, boolean>;
  onSelect: (path: string) => void;
};

export function EditorTabs({
  paths,
  activePath,
  dirtyMap,
  onSelect,
}: EditorTabsProps) {
  return (
    <div className="flex h-10 items-center gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-2">
      {paths.map((path) => {
        const active = activePath === path;
        const filename = path.split("/").at(-1) ?? path;
        return (
          <button
            key={path}
            type="button"
            className={`rounded-md px-3 py-1 text-xs transition ${
              active
                ? "bg-zinc-800 text-zinc-100"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
            onClick={() => onSelect(path)}
          >
            {filename}
            {dirtyMap[path] ? " •" : ""}
          </button>
        );
      })}
    </div>
  );
}
