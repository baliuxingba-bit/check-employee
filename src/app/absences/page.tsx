import { prisma } from "@/lib/prisma";
import { createAbsence, deleteAbsence } from "./actions";
import { AppHeader } from "../AppHeader";
import { verifySession } from "@/lib/session";

const ABSENCE_TYPES = ["有給", "欠勤", "遅刻", "早退", "半給"];

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default async function AbsencesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const role = await verifySession();
  const canEdit = role === "editor";

  const { month: monthParam } = await searchParams;

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : defaultMonth;
  const [year, monthNum] = month.split("-").map(Number);

  const monthStart = new Date(year, monthNum - 1, 1);
  const monthEnd = new Date(year, monthNum, 1);

  const records = await prisma.absenceRecord.findMany({
    where: { date: { gte: monthStart, lt: monthEnd } },
    orderBy: [{ date: "asc" }, { employeeName: "asc" }],
  });

  const summary = new Map<string, Record<string, number>>();
  for (const record of records) {
    if (!summary.has(record.employeeName)) {
      summary.set(record.employeeName, {});
    }
    const counts = summary.get(record.employeeName)!;
    counts[record.type] = (counts[record.type] ?? 0) + 1;
  }
  const summaryRows = [...summary.entries()].sort(([a], [b]) => a.localeCompare(b, "ja"));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      <AppHeader
        title="欠勤表"
        description="有給・欠勤・遅刻・早退・半給を記録し、月別・人別に自動集計します。"
        active="absences"
      />

      <section className="rounded-lg border border-gray-200 p-6">
        <form className="flex items-end gap-3" action="/absences">
          <label className="flex flex-col gap-1 text-sm">
            対象月
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            表示
          </button>
        </form>
      </section>

      {canEdit && (
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">欠勤を記録</h2>
          <form action={createAbsence} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              氏名
              <input
                name="employeeName"
                required
                className="rounded border border-gray-300 px-3 py-2"
                placeholder="山田 太郎"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              開始日
              <input
                type="date"
                name="startDate"
                required
                defaultValue={formatDate(now)}
                className="rounded border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              終了日(1日だけの場合は開始日と同じ)
              <input
                type="date"
                name="endDate"
                required
                defaultValue={formatDate(now)}
                className="rounded border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              区分
              <select
                name="type"
                required
                defaultValue=""
                className="rounded border border-gray-300 px-3 py-2"
              >
                <option value="" disabled>
                  選択してください
                </option>
                {ABSENCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              メモ(任意)
              <input
                name="notes"
                className="rounded border border-gray-300 px-3 py-2"
                placeholder="補足があれば"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                記録する
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">{month} 月別集計</h2>

        {summaryRows.length === 0 ? (
          <p className="text-sm text-gray-500">この月の記録はまだありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-4">氏名</th>
                  {ABSENCE_TYPES.map((t) => (
                    <th key={t} className="py-2 pr-4">
                      {t}
                    </th>
                  ))}
                  <th className="py-2 pr-4">合計</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map(([name, counts]) => {
                  const total = Object.values(counts).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={name} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium">{name}</td>
                      {ABSENCE_TYPES.map((t) => (
                        <td key={t} className="py-2 pr-4">
                          {counts[t] ?? 0}
                        </td>
                      ))}
                      <td className="py-2 pr-4 font-medium">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">{month} 記録一覧</h2>

        {records.length === 0 ? (
          <p className="text-sm text-gray-500">この月の記録はまだありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-4">日付</th>
                  <th className="py-2 pr-4">氏名</th>
                  <th className="py-2 pr-4">区分</th>
                  <th className="py-2 pr-4">メモ</th>
                  {canEdit && <th className="py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{formatDate(record.date)}</td>
                    <td className="py-2 pr-4 font-medium">{record.employeeName}</td>
                    <td className="py-2 pr-4">{record.type}</td>
                    <td className="py-2 pr-4 text-gray-500">{record.notes ?? ""}</td>
                    {canEdit && (
                      <td className="py-2 text-right">
                        <form action={deleteAbsence}>
                          <input type="hidden" name="id" value={record.id} />
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-red-600"
                          >
                            削除
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
