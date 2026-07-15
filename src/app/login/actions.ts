"use server";

import { createSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  const expected = process.env.APP_PASSWORD?.trim();

  if (!expected || password !== expected) {
    redirect("/login?error=1");
  }

  await createSession();
  redirect("/");
}
