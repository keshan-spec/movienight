"use server";

import { redirect } from "next/navigation";
import { signInWithPassword } from "@/lib/auth";

export async function signIn(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await signInWithPassword(password);
  redirect(ok ? "/" : "/signin?wrong=1");
}
