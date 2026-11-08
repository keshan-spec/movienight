"use server";

import { redirect } from "next/navigation";
import { signInWithPassword, signOut } from "@/lib/auth";

export async function signIn(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await signInWithPassword(password);
  redirect(ok ? "/" : "/signin?wrong=1");
}

export async function signOutAction() {
  await signOut();
  redirect("/signin");
}
