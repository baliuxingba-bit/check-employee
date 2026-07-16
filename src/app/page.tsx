import { prisma } from "@/lib/prisma";
import { createItem, deleteItem } from "./actions";
import { CategoryField } from "./CategoryField";
import { AppHeader } from "./AppHeader";
import { verifySession } from "@/lib/session";

const DAY_MS = 1000 * 60 * 60 * 24;

function getStatus(expiryDate: Date | null) {
  if (!expiryDate) {
    return { label: "期限なし", color: "bg-gray-100 text-gray-600" };
  }

  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / DAY_MS);

  if (daysLeft < 0) {
    return { label: `期限切れ (${Math.abs(daysLeft)}日超過)`, color: "bg-red-100 text-red-700" };
  }
  if (daysLeft <= 60) {
    return { label: `残り${daysLeft}日`, color: "bg-yellow-100 text-yellow-700" };
  }
  return { label: `残り${daysLeft}日`, color: "bg-green-100 text-green-700" };
}

export default async function Home() {
  const role = await verifySession();
  const canEdit = role === "editor";

  const items = await prisma.trackedItem.findMany({
    orderBy: [{ expiryDate: "asc" }, { subject: "asc" }],
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      <AppHeader
        title="期限管理ツール"
        description="ビザ・車検・保険・免許・契約・健康診断など、更新期限があるものを一覧管理します。"
        active="deadlines"
      />

      {canEdit && (
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">項目を追加</h2>
          <form action={createItem} className="grid gap-4 sm:grid-cols-2">
            <CategoryField />

            <label className="flex flex-col gap-1 text-sm">
              対象
              <input
                name="subject"
                required
                className="rounded border border-gray-300 px-3 py-2"
                placeholder="例: 山田太郎 / 品川500 あ 1234"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              詳細
              <input
                name="detail"
                required
                className="rounded border border-gray-300 px-3 py-2"
                placeholder="例: F-1 OPT / 2tトラック"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              有効期限(該当なしの場合は空欄)
              <input
                type="date"
                name="expiryDate"
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
      )}

      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">一覧</h2>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500">まだ何も登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-4">カテゴリ</th>
                  <th className="py-2 pr-4">対象</th>
                  <th className="py-2 pr-4">詳細</th>
                  <th className="py-2 pr-4">状態</th>
                  <th className="py-2 pr-4">メモ</th>
                  {canEdit && <th className="py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = getStatus(item.expiryDate);
                  return (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium">{item.category}</td>
                      <td className="py-2 pr-4">{item.subject}</td>
                      <td className="py-2 pr-4">{item.detail}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-500">
                        {item.notes ?? ""}
                      </td>
                      {canEdit && (
                        <td className="py-2 text-right">
                          <form action={deleteItem}>
                            <input type="hidden" name="id" value={item.id} />
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
