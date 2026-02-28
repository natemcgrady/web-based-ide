import { NextRequest } from "next/server";

export type AuthUser = {
  id: string;
};

export function getUserFromRequest(request: NextRequest): AuthUser {
  const fromHeader = request.headers.get("x-user-id");
  if (fromHeader && fromHeader.trim().length > 0) {
    return { id: fromHeader.trim() };
  }

  // Dev fallback: keeps the app usable without wiring auth provider first.
  return { id: "demo-user" };
}
