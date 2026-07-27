import { prisma } from "@/lib/prisma";
import {
  createAbsence,
  deleteAbsence,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployeesCsv,
} from "./actions";
import { AppHeader } from "../AppHeader";
import { verifySession } from "@/lib/session";

const ABSENCE_TYPES = ["有給", "欠勤", "遅刻", "早退", "半給"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const WEEKDAY_HEADER_COLORS = [
  "bg-red-500 text-white",
  "bg-black text-white",
  "bg-black text-white",
  "bg-black text-white",
  "bg-black text-white",
  "bg-black text-white",
  "bg-sky-300 text-gray-900",
];

const TYPE_COLORS: Record<string, string> = {
  有給: "bg-green-100 text-green-700",
  欠勤: "bg-red-100 text-red-700",
  遅刻: "bg-yellow-100 text-yellow-700",
  早退: "bg-yellow-100 text-yellow-700",
  半給: "bg-blue-100 text-blue-700",
};

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

type AbsenceRecord = {
  id: string;
  employeeName: string;
  date: Date;
  type: string;
  notes: string | null;
};

function buildMonthView(year: number, monthNum: number, allRecords: AbsenceRecord[]) {
  const monthStart = new Date(year, monthNum - 1, 1);
  const records = allRecords.filter(
    (r) => r.date.getFullYear() === year && r.date.getMonth() === monthNum - 1
  );

  const recordsByDay = new Map<number, AbsenceRecord[]>();
  for (const record of records) {
    const day = record.date.getDate();
    if (!recordsByDay.has(day)) recordsByDay.set(day, []);
    recordsByDay.get(day)!.push(record);
  }

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startWeekday = monthStart.getDay(); // Sunday = 0
  const calendarCells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === monthNum;

  return { year, monthNum, calendarCells, recordsByDay, isCurrentMonth, today };
}

function MonthCalendar({
  view,
  canEdit,
}: {
  view: ReturnType<typeof buildMonthView>;
  canEdit: boolean;
}) {
  const { year, monthNum, calendarCells, recordsByDay, isCurrentMonth, today } = view;

  return (
    <div>
      <h3 className="font-semibold mb-3">
        {year}年{monthNum}月
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`py-1.5 text-center text-sm font-semibold rounded ${WEEKDAY_HEADER_COLORS[i]}`}
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, i) => {
              const dayRecords = day ? recordsByDay.get(day) ?? [] : [];
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <div
                  key={i}
                  className={`min-h-[90px] rounded border p-1.5 ${
                    day ? "border-gray-200" : "border-transparent"
                  } ${isToday ? "ring-2 ring-black" : ""}`}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-700">{day}</span>
                        {dayRecords.length > 0 && (
                          <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                            {dayRecords.length}人
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {dayRecords.map((r) => (
                          <span
                            key={r.id}
                            className={`truncate rounded px-1 py-0.5 text-[11px] leading-tight ${
                              TYPE_COLORS[r.type] ?? "bg-gray-100 text-gray-600"
                            }`}
                            title={canEdit ? `${r.employeeName}・${r.type}` : r.type}
                          >
                            {canEdit ? `${r.employeeName}(${r.type})` : r.type}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
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

  const rangeStart = new Date(year, monthNum - 1, 1);
  const rangeEnd = new Date(year, monthNum + 1, 1); // end of the following month

  const records = await prisma.absenceRecord.findMany({
    where: { date: { gte: rangeStart, lt: rangeEnd } },
    orderBy: [{ date: "asc" }, { employeeName: "asc" }],
  });

  const listRecords = records.filter(
    (r) => r.date.getFullYear() === year && r.date.getMonth() === monthNum - 1
  );

  const employees = canEdit
    ? await prisma.employee.findMany({ orderBy: { name: "asc" } })
    : [];

  const nextMonthDate = new Date(year, monthNum, 1);
  const currentView = buildMonthView(year, monthNum, records);
  const nextView = buildMonthView(
    nextMonthDate.getFullYear(),
    nextMonthDate.getMonth() + 1,
    records
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      <AppHeader
        title="欠勤表"
        description="有給・欠勤・遅刻・早退・半給を記録し、カレンダーで一目で確認できます。"
        active="absences"
      />

      <section className="rounded-lg border border-gray-200 p-6">
        <form className="flex items-end gap-3 mb-6" action="/absences">
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

        <div className="grid gap-8 lg:grid-cols-2">
          <MonthCalendar view={currentView} canEdit={canEdit} />
          <MonthCalendar view={nextView} canEdit={canEdit} />
        </div>
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
                list="employee-roster"
                autoComplete="off"
                className="rounded border border-gray-300 px-3 py-2"
                placeholder="苗字を入力すると候補が出ます"
              />
              <datalist id="employee-roster">
                {employees.map((e) => (
                  <option key={e.id} value={e.name} />
                ))}
              </datalist>
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
        <h2 className="font-semibold mb-4">{month} 記録一覧</h2>

        {listRecords.length === 0 ? (
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
                {listRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{formatDate(record.date)}</td>
                    <td className="py-2 pr-4 font-medium">
                      {canEdit ? record.employeeName : "非公開"}
                    </td>
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

      {canEdit && (
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">社員名簿</h2>
          <p className="text-sm text-gray-500 mb-4">
            ここに登録しておくと、欠勤登録の氏名欄で苗字を入力するだけで候補が出ます。
          </p>

          <form
            action={importEmployeesCsv}
            className="mb-6 flex flex-wrap items-end gap-3 rounded border border-dashed border-gray-300 p-4"
          >
            <label className="flex flex-col gap-1 text-sm">
              CSV一括登録(name,affiliation,joinDate,birthDate の列)
              <input
                type="file"
                name="csv"
                accept=".csv,text/csv"
                required
                className="text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              CSVから一括登録
            </button>
          </form>

          <h3 className="text-sm font-semibold mb-3">新規追加</h3>
          <form action={addEmployee} className="grid gap-3 mb-8 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              氏名
              <input
                name="name"
                required
                className="rounded border border-gray-300 px-3 py-2"
                placeholder="山田 太郎"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              所属
              <select
                name="affiliation"
                defaultValue=""
                className="rounded border border-gray-300 px-3 py-2"
              >
                <option value="">未選択</option>
                <option value="八幸商事">八幸商事</option>
                <option value="日晴興業">日晴興業</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              入社日
              <input
                type="date"
                name="joinDate"
                className="rounded border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              生年月日
              <input
                type="date"
                name="birthDate"
                className="rounded border border-gray-300 px-3 py-2"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                追加する
              </button>
            </div>
          </form>

          {employees.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mb-3">登録済み一覧(編集・削除)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="py-2 pr-2">氏名</th>
                      <th className="py-2 pr-2">所属</th>
                      <th className="py-2 pr-2">入社日</th>
                      <th className="py-2 pr-2">生年月日</th>
                      <th className="py-2"></th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e) => (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td colSpan={5} className="py-2">
                          <form
                            id={`employee-edit-${e.id}`}
                            action={updateEmployee}
                            className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-2 items-center"
                          >
                            <input type="hidden" name="id" value={e.id} />
                            <input
                              name="name"
                              defaultValue={e.name}
                              required
                              className="rounded border border-gray-300 px-2 py-1"
                            />
                            <select
                              name="affiliation"
                              defaultValue={e.affiliation ?? ""}
                              className="rounded border border-gray-300 px-2 py-1"
                            >
                              <option value="">未選択</option>
                              <option value="八幸商事">八幸商事</option>
                              <option value="日晴興業">日晴興業</option>
                            </select>
                            <input
                              type="date"
                              name="joinDate"
                              defaultValue={e.joinDate ? formatDate(e.joinDate) : ""}
                              className="rounded border border-gray-300 px-2 py-1"
                            />
                            <input
                              type="date"
                              name="birthDate"
                              defaultValue={e.birthDate ? formatDate(e.birthDate) : ""}
                              className="rounded border border-gray-300 px-2 py-1"
                            />
                            <button
                              type="submit"
                              className="rounded bg-gray-800 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
                            >
                              更新
                            </button>
                          </form>
                        </td>
                        <td className="py-2 text-right">
                          <form action={deleteEmployee}>
                            <input type="hidden" name="id" value={e.id} />
                            <button
                              type="submit"
                              className="text-xs text-gray-400 hover:text-red-600"
                            >
                              削除
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
