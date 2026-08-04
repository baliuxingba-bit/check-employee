import { prisma } from "@/lib/prisma";
import {
  createDailyReport,
  deleteDailyReport,
  addReportField,
  deleteReportField,
  addReportRecipient,
  deleteReportRecipient,
} from "./actions";
import { AppHeader } from "../AppHeader";
import { verifySession } from "@/lib/session";

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default async function ReportsPage() {
  const role = await verifySession();
  const canEdit = role === "editor";
  const now = new Date();

  const employees = await prisma.employee.findMany({ orderBy: { name: "asc" } });
  const fields = await prisma.reportField.findMany({ orderBy: { createdAt: "asc" } });
  const reports = await prisma.dailyReport.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  const recipients = canEdit
    ? await prisma.reportRecipient.findMany({ orderBy: { createdAt: "asc" } })
    : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      <AppHeader
        title="日報"
        description="その日の業務内容を記録します。登録すると設定した宛先に自動でメール送信されます。"
        active="reports"
      />

      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">日報を提出</h2>
        <form action={createDailyReport} className="grid gap-4 sm:grid-cols-2">
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
            日付
            <input
              type="date"
              name="date"
              required
              defaultValue={formatDateInput(now)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            本日の業務内容
            <textarea
              name="content"
              required
              rows={4}
              className="rounded border border-gray-300 px-3 py-2"
              placeholder="今日行った業務を記入してください"
            />
          </label>

          {fields.map((field) => (
            <label key={field.id} className="flex flex-col gap-1 text-sm sm:col-span-2">
              {field.label}
              <input
                name={`extra_${field.id}`}
                className="rounded border border-gray-300 px-3 py-2"
              />
            </label>
          ))}

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              提出する
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">日報一覧(直近50件)</h2>

        {reports.length === 0 ? (
          <p className="text-sm text-gray-500">まだ日報はありません。</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const extra = (report.extraFields as Record<string, string> | null) ?? {};
              return (
                <div key={report.id} className="rounded border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {formatDateInput(report.date)} ・ <span className="font-medium text-gray-800">{report.employeeName}</span>
                    </div>
                    {canEdit && (
                      <form action={deleteDailyReport}>
                        <input type="hidden" name="id" value={report.id} />
                        <button
                          type="submit"
                          className="text-xs text-gray-400 hover:text-red-600"
                        >
                          削除
                        </button>
                      </form>
                    )}
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{report.content}</p>
                  {Object.keys(extra).length > 0 && (
                    <dl className="mt-2 space-y-1 text-sm text-gray-600">
                      {Object.entries(extra).map(([label, value]) => (
                        <div key={label} className="flex gap-2">
                          <dt className="font-medium">{label}:</dt>
                          <dd className="whitespace-pre-wrap">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {canEdit && (
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">日報の項目管理</h2>
          <p className="text-sm text-gray-500 mb-4">
            ここで追加した項目は、日報フォームに追加の入力欄として表示されます(任意入力)。
          </p>
          <form action={addReportField} className="flex gap-3 mb-4">
            <input
              name="label"
              required
              className="rounded border border-gray-300 px-3 py-2 flex-1"
              placeholder="例: 明日の予定"
            />
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              追加
            </button>
          </form>
          {fields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fields.map((f) => (
                <form key={f.id} action={deleteReportField} className="inline-flex">
                  <input type="hidden" name="id" value={f.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-red-100 hover:text-red-700"
                    title="クリックで削除"
                  >
                    {f.label} ×
                  </button>
                </form>
              ))}
            </div>
          )}
        </section>
      )}

      {canEdit && (
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">メール送信先の管理</h2>
          <p className="text-sm text-gray-500 mb-4">
            日報が提出されると、ここに登録したメールアドレス宛に自動で通知が送られます。
          </p>
          <form action={addReportRecipient} className="flex gap-3 mb-4">
            <input
              type="email"
              name="email"
              required
              className="rounded border border-gray-300 px-3 py-2 flex-1"
              placeholder="president@example.com"
            />
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              追加
            </button>
          </form>
          {recipients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipients.map((r) => (
                <form key={r.id} action={deleteReportRecipient} className="inline-flex">
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-red-100 hover:text-red-700"
                    title="クリックで削除"
                  >
                    {r.email} ×
                  </button>
                </form>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
