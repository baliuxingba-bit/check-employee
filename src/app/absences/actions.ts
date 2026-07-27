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
  await notifyTeams(`欠勤表に新しい登録がありました(${period}・${type})。詳細はアプリでご確認ください。`);

  revalidatePath("/absences");
}

export async function deleteAbsence(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.absenceRecord.delete({ where: { id } });

  revalidatePath("/absences");
}

export async function addEmployee(formData: FormData) {
  await requireEditor();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const joinDateRaw = String(formData.get("joinDate") ?? "").trim();
  const birthDateRaw = String(formData.get("birthDate") ?? "").trim();

  const data = {
    affiliation: affiliation || null,
    joinDate: joinDateRaw ? new Date(joinDateRaw) : null,
    birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
  };

  await prisma.employee.upsert({
    where: { name },
    update: data,
    create: { name, ...data },
  });

  revalidatePath("/absences");
}

export async function updateEmployee(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const joinDateRaw = String(formData.get("joinDate") ?? "").trim();
  const birthDateRaw = String(formData.get("birthDate") ?? "").trim();

  await prisma.employee.update({
    where: { id },
    data: {
      name,
      affiliation: affiliation || null,
      joinDate: joinDateRaw ? new Date(joinDateRaw) : null,
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
    },
  });

  revalidatePath("/absences");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

export async function importEmployeesCsv(formData: FormData) {
  await requireEditor();

  const file = formData.get("csv");
  if (!(file instanceof File)) return;

  const text = await file.text();
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return;

  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const nameIdx = header.indexOf("name");
  const affiliationIdx = header.indexOf("affiliation");
  const joinDateIdx = header.indexOf("joinDate");
  const birthDateIdx = header.indexOf("birthDate");

  if (nameIdx === -1) {
    throw new Error("CSVのヘッダーに name 列が見つかりません");
  }

  let count = 0;
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const name = (cells[nameIdx] ?? "").trim();
    if (!name) continue;

    const affiliation = affiliationIdx !== -1 ? (cells[affiliationIdx] ?? "").trim() : "";
    const joinDateRaw = joinDateIdx !== -1 ? (cells[joinDateIdx] ?? "").trim() : "";
    const birthDateRaw = birthDateIdx !== -1 ? (cells[birthDateIdx] ?? "").trim() : "";

    const data = {
      affiliation: affiliation || null,
      joinDate: joinDateRaw ? new Date(joinDateRaw) : null,
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
    };

    await prisma.employee.upsert({
      where: { name },
      update: data,
      create: { name, ...data },
    });
    count++;
  }

  revalidatePath("/absences");
}

export async function deleteEmployee(formData: FormData) {
  await requireEditor();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.employee.delete({ where: { id } });

  revalidatePath("/absences");
}
