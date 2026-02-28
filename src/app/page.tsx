import type { Metadata } from "next";
import { IdeShell } from "@/components/layout/IdeShell";

export const metadata: Metadata = {
  title: "web-based-ide | Workspace",
  description:
    "Edit files, run shell commands, and preview apps in isolated Vercel Sandbox sessions.",
};

export default function Home() {
  return <IdeShell />;
}
