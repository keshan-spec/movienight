import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "mn_session";

function sessionToken(): string {
  const token = process.env.SESSION_TOKEN;
  if (!token) throw new Error("Missing SESSION_TOKEN environment variable.");
  return token;
}

export async function signInWithPassword(password: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected || password !== expected) return false;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return true;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Guard for server actions — middleware covers page loads, this covers direct POSTs. */
export async function hasSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value === sessionToken();
}
