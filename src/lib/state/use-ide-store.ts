"use client";

import { create } from "zustand";
import type { FileEntry, SessionRecord } from "@/lib/contracts/sandbox";

type IdeState = {
  projectId: string;
  session: SessionRecord | null;
  files: FileEntry[];
  activePath: string | null;
  dirtyFileMap: Record<string, boolean>;
  previewUrl: string | null;
  terminalCursor: string | null;
  setProjectId: (projectId: string) => void;
  setSession: (session: SessionRecord | null) => void;
  setFiles: (files: FileEntry[]) => void;
  setActivePath: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  markDirty: (path: string, dirty: boolean) => void;
  setPreviewUrl: (url: string | null) => void;
  setTerminalCursor: (cursor: string | null) => void;
};

export const useIdeStore = create<IdeState>((set) => ({
  projectId: "starter-project",
  session: null,
  files: [],
  activePath: null,
  dirtyFileMap: {},
  previewUrl: null,
  terminalCursor: null,
  setProjectId: (projectId) => set({ projectId }),
  setSession: (session) => set({ session }),
  setFiles: (files) =>
    set((state) => ({
      files,
      activePath: state.activePath ?? files[0]?.path ?? null,
    })),
  setActivePath: (activePath) => set({ activePath }),
  updateFileContent: (path, content) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.path === path
          ? {
              ...file,
              content,
              updatedAt: new Date().toISOString(),
            }
          : file,
      ),
      dirtyFileMap: {
        ...state.dirtyFileMap,
        [path]: true,
      },
    })),
  markDirty: (path, dirty) =>
    set((state) => ({
      dirtyFileMap: {
        ...state.dirtyFileMap,
        [path]: dirty,
      },
    })),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setTerminalCursor: (terminalCursor) => set({ terminalCursor }),
}));
