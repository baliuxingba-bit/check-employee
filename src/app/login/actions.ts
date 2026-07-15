"use server";

import { createSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.APP_PASSWORD;

  if (!expected || password !== expected) {
    redirect("/login?error=1");
  }

  await createSession();
  redirect("/");
}
