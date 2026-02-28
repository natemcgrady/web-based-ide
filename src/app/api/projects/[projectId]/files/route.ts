import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteProjectFiles,
  listProjectFiles,
  upsertProjectFiles,
} from "@/lib/projects/project-store";
import { filesPatchSchema } from "@/lib/contracts/sandbox";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

type Context = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: NextRequest, context: Context) {
  const { projectId } = await context.params;
  const files = await listProjectFiles(projectId);
  return NextResponse.json({
    projectId,
    files,
  });
}

export async function PATCH(request: NextRequest, context: Context) {
  const { projectId } = await context.params;

  try {
    const body = await request.json();
    const payload = filesPatchSchema.parse(body);

    const deletions = payload.files
      .filter((file) => file.operation === "delete")
      .map((file) => file.path);

    const upserts = payload.files
      .filter((file) => file.operation === "upsert")
      .map((file) => ({
        path: file.path,
        content: file.content,
        isDir: file.isDir,
      }));

    if (deletions.length > 0) {
      await deleteProjectFiles(projectId, deletions);
    }
    if (upserts.length > 0) {
      await upsertProjectFiles(projectId, upserts);
    }

    const files = await listProjectFiles(projectId);
    return NextResponse.json({ projectId, files });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid request.");
    }
    return jsonError(
      error instanceof Error ? error.message : "Could not update files.",
      500,
    );
  }
}
