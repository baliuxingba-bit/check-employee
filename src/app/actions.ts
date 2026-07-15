"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function createEmployee(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "").trim();
  const visaType = String(formData.get("visaType") ?? "").trim();
  const visaExpiryRaw = String(formData.get("visaExpiry") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !employmentType || !visaType) {
    throw new Error("名前・雇用形態・ビザ種類は必須です");
  }

  await prisma.employee.create({
    data: {
      name,
      employmentType,
      visaType,
      visaExpiry: visaExpiryRaw ? new Date(visaExpiryRaw) : null,
      notes: notes || null,
    },
  });

  revalidatePath("/");
}

export async function deleteEmployee(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.employee.delete({ where: { id } });

  revalidatePath("/");
}
