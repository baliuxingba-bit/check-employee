"use server";

import { createSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  const editPassword = process.env.APP_PASSWORD?.trim();
  const viewPassword = process.env.APP_PASSWORD_VIEW?.trim();

  if (editPassword && password === editPassword) {
    await createSession("editor");
    redirect("/");
  }

  if (viewPassword && password === viewPassword) {
    await createSession("viewer");
    redirect("/");
  }

  redirect("/login?error=1");
}
