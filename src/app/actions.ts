"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteSession, requireEditor } from "@/lib/session";
import { redirect } from "next/navigation";

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function createItem(formData: FormData) {
  await requireEditor();

  const categorySelect = String(formData.get("category") ?? "").trim();
  const categoryOther = String(formData.get("categoryOther") ?? "").trim();
  const category = categorySelect === "その他" ? categoryOther : categorySelect;

  const subject = String(formData.get("subject") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const expiryDateRaw = String(formData.get("expiryDate") ?? "").trim();
  const notificationDateRaw = String(formData.get("notificationDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!category || !subject || !detail) {
    throw new Error("カテゴリ・対象・詳細は必須です");
  }

  await prisma.trackedItem.create({
    data: {
      category,
      subject,
      detail,
      expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
      notificationDate: notificationDateRaw ? new Date(notificationDateRaw) : null,
      notes: notes || null,
    },
  });

  revalidatePath("/");
}

export async function updateItem(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const categorySelect = String(formData.get("category") ?? "").trim();
  const categoryOther = String(formData.get("categoryOther") ?? "").trim();
  const category = categorySelect === "その他" ? categoryOther : categorySelect;

  const subject = String(formData.get("subject") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const expiryDateRaw = String(formData.get("expiryDate") ?? "").trim();
  const notificationDateRaw = String(formData.get("notificationDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!category || !subject || !detail) {
    throw new Error("カテゴリ・対象・詳細は必須です");
  }

  const newExpiryDate = expiryDateRaw ? new Date(expiryDateRaw) : null;
  const newNotificationDate = notificationDateRaw ? new Date(notificationDateRaw) : null;

  const existing = await prisma.trackedItem.findUnique({ where: { id } });
  const notificationChanged =
    existing &&
    (existing.notificationDate?.getTime() ?? null) !== (newNotificationDate?.getTime() ?? null);

  await prisma.trackedItem.update({
    where: { id },
    data: {
      category,
      subject,
      detail,
      expiryDate: newExpiryDate,
      notificationDate: newNotificationDate,
      notes: notes || null,
      // Re-arm the notification if the notification date was changed.
      notifiedAt: notificationChanged ? null : undefined,
    },
  });

  revalidatePath("/");
}

export async function deleteItem(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.trackedItem.delete({ where: { id } });

  revalidatePath("/");
}

export async function addCategory(formData: FormData) {
  await requireEditor();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  revalidatePath("/");
}

export async function deleteCategory(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.category.delete({ where: { id } });

  revalidatePath("/");
}
