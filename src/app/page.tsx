import { prisma } from "@/lib/prisma";
import { createEmployee, deleteEmployee } from "./actions";

const DAY_MS = 1000 * 60 * 60 * 24;

function getStatus(visaExpiry: Date | null) {
  if (!visaExpiry) {
    return { label: "期限なし", color: "bg-gray-100 text-gray-600" };
  }

  const daysLeft = Math.ceil(
    (visaExpiry.getTime() - Date.now()) / DAY_MS
  );

  if (daysLeft < 0) {
    return { label: `期限切れ (${Math.abs(daysLeft)}日超過)`, color: "bg-red-100 text-red-700" };
  }
  if (daysLeft <= 60) {
    return { label: `残り${daysLeft}日`, color: "bg-yellow-100 text-yellow-700" };
  }
  return { label: `残り${daysLeft}日`, color: "bg-green-100 text-green-700" };
}

export default async function Home() {
  const employees = await prisma.employee.findMany({
    orderBy: [{ visaExpiry: "asc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      <header>
        <h1 className="text-2xl font-bold">ビザ・就労資格 期限管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          従業員のビザ/就労資格の有効期限を一覧管理します。
        </p>
      </header>

      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">従業員を追加</h2>
        <form action={createEmployee} className="grid gap-4 sm:grid-cols-2">
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
            雇用形態
            <select
              name="employmentType"
              required
              className="rounded border border-gray-300 px-3 py-2"
              defaultValue=""
            >
              <option value="" disabled>
                選択してください
              </option>
              <option value="正社員">正社員</option>
              <option value="契約社員">契約社員</option>
              <option value="派遣">派遣</option>
              <option value="アルバイト">アルバイト</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            ビザ/就労資格の種類
            <input
              name="visaType"
              required
              className="rounded border border-gray-300 px-3 py-2"
              placeholder="例: F-1 OPT, H-1B, 市民権 など"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            有効期限(該当なしの場合は空欄)
            <input
              type="date"
              name="visaExpiry"
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
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
              追加する
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">従業員一覧</h2>

        {employees.length === 0 ? (
          <p className="text-sm text-gray-500">まだ従業員が登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-4">氏名</th>
                  <th className="py-2 pr-4">雇用形態</th>
                  <th className="py-2 pr-4">ビザ種類</th>
                  <th className="py-2 pr-4">状態</th>
                  <th className="py-2 pr-4">メモ</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const status = getStatus(employee.visaExpiry);
                  return (
                    <tr key={employee.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium">{employee.name}</td>
                      <td className="py-2 pr-4">{employee.employmentType}</td>
                      <td className="py-2 pr-4">{employee.visaType}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-500">
                        {employee.notes ?? ""}
                      </td>
                      <td className="py-2 text-right">
                        <form action={deleteEmployee}>
                          <input type="hidden" name="id" value={employee.id} />
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-red-600"
                          >
                            削除
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
