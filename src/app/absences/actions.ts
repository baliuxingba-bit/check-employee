"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/session";
import { notifyTeams } from "@/lib/teams";

function formatDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export async function createAbsence(formData: FormData) {
  await requireEditor();

  const employeeName = String(formData.get("employeeName") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!employeeName || !startDateRaw || !endDateRaw || !type) {
    throw new Error("氏名・日付・区分は必須です");
  }

  const startDate = new Date(startDateRaw);
  const endDate = new Date(endDateRaw);

  if (endDate < startDate) {
    throw new Error("終了日は開始日以降にしてください");
  }

  const dates: Date[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }

  await prisma.absenceRecord.createMany({
    data: dates.map((date) => ({
      employeeName,
      date,
      type,
      notes: notes || null,
    })),
  });

  const period =
    dates.length === 1
      ? formatDate(startDate)
      : `${formatDate(startDate)}〜${formatDate(endDate)}`;
  await notifyTeams(`${employeeName}さんが ${period} ${type} で登録されました。`);

  revalidatePath("/absences");
}

export async function deleteAbsence(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.absenceRecord.delete({ where: { id } });

  revalidatePath("/absences");
}
