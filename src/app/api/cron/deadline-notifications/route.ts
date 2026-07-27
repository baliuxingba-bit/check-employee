import { prisma } from "@/lib/prisma";
import { notifyTeams } from "@/lib/teams";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const items = await prisma.trackedItem.findMany({
    where: {
      notificationDate: { lt: tomorrow },
      notifiedAt: null,
    },
  });

  for (const item of items) {
    const expiryLabel = item.expiryDate
      ? item.expiryDate.toLocaleDateString("ja-JP")
      : "未設定";
    await notifyTeams(
      `【期限通知】${item.category}・${item.subject}(${item.detail})の有効期限は ${expiryLabel} です。詳細はアプリでご確認ください。`
    );
    await prisma.trackedItem.update({
      where: { id: item.id },
      data: { notifiedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, notified: items.length });
}
