"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireEditor, requireAuthenticated } from "@/lib/session";
import { sendReportEmail } from "@/lib/mail";

export async function createDailyReport(formData: FormData) {
  await requireAuthenticated();

  const employeeName = String(formData.get("employeeName") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!employeeName || !dateRaw || !content) {
    throw new Error("氏名・日付・業務内容は必須です");
  }

  const fields = await prisma.reportField.findMany({ orderBy: { createdAt: "asc" } });
  const extraFields: Record<string, string> = {};
  for (const field of fields) {
    const value = String(formData.get(`extra_${field.id}`) ?? "").trim();
    if (value) extraFields[field.label] = value;
  }

  await prisma.dailyReport.create({
    data: {
      employeeName,
      date: new Date(dateRaw),
      content,
      extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
    },
  });

  const recipients = await prisma.reportRecipient.findMany();
  if (recipients.length > 0) {
    const extraLines = Object.entries(extraFields)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n");
    const body = [
      `氏名: ${employeeName}`,
      `日付: ${dateRaw}`,
      `業務内容: ${content}`,
      extraLines,
      "",
      "詳細はアプリでご確認ください。",
    ]
      .filter(Boolean)
      .join("\n");

    await sendReportEmail(
      recipients.map((r) => r.email),
      `【日報】${employeeName}(${dateRaw})`,
      body
    );
  }

  revalidatePath("/reports");
}

export async function deleteDailyReport(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.dailyReport.delete({ where: { id } });

  revalidatePath("/reports");
}

export async function addReportField(formData: FormData) {
  await requireEditor();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;

  await prisma.reportField.upsert({
    where: { label },
    update: {},
    create: { label },
  });

  revalidatePath("/reports");
}

export async function deleteReportField(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.reportField.delete({ where: { id } });

  revalidatePath("/reports");
}

export async function addReportRecipient(formData: FormData) {
  await requireEditor();

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;

  await prisma.reportRecipient.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  revalidatePath("/reports");
}

export async function deleteReportRecipient(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.reportRecipient.delete({ where: { id } });

  revalidatePath("/reports");
}
