import { prisma } from "@/lib/prisma";
import { createItem, updateItem, deleteItem, addCategory, deleteCategory } from "./actions";
import { CategoryField } from "./CategoryField";
import { AppHeader } from "./AppHeader";
import { verifySession } from "@/lib/session";

const DAY_MS = 1000 * 60 * 60 * 24;

function formatDateInput(date: Date | null) {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

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

  const categories = canEdit
    ? await prisma.category.findMany({ orderBy: { name: "asc" } })
    : [];

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
            <CategoryField customCategories={categories.map((c) => c.name)} />

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

            <label className="flex flex-col gap-1 text-sm">
              通知日(この日にTeamsへ自動通知)
              <input
                type="date"
                name="notificationDate"
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

      {canEdit && (
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">カテゴリ管理</h2>
          <p className="text-sm text-gray-500 mb-4">
            ここで追加したカテゴリは、上の「項目を追加」フォームのカテゴリ選択肢に表示されます。
          </p>
          <form action={addCategory} className="flex gap-3 mb-4">
            <input
              name="name"
              required
              className="rounded border border-gray-300 px-3 py-2 flex-1"
              placeholder="例: 消防設備点検"
            />
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              追加
            </button>
          </form>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <form key={c.id} action={deleteCategory} className="inline-flex">
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-red-100 hover:text-red-700"
                    title="クリックで削除"
                  >
                    {c.name} ×
                  </button>
                </form>
              ))}
            </div>
          )}
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
                  <th className="py-2 pr-4">通知日</th>
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
                        {formatDateInput(item.notificationDate) || "-"}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">
                        {item.notes ?? ""}
                      </td>
                      {canEdit && (
                        <td className="py-2 text-right whitespace-nowrap">
                          <details className="inline-block text-left">
                            <summary className="inline-block cursor-pointer text-xs text-gray-500 hover:text-black">
                              編集
                            </summary>
                            <form
                              action={updateItem}
                              className="mt-3 grid gap-2 sm:grid-cols-2 rounded border border-gray-200 p-3"
                            >
                              <input type="hidden" name="id" value={item.id} />
                              <CategoryField
                                customCategories={categories.map((c) => c.name)}
                                defaultValue={item.category}
                              />
                              <input
                                name="subject"
                                required
                                defaultValue={item.subject}
                                className="rounded border border-gray-300 px-2 py-1"
                                placeholder="対象"
                              />
                              <input
                                name="detail"
                                required
                                defaultValue={item.detail}
                                className="rounded border border-gray-300 px-2 py-1"
                                placeholder="詳細"
                              />
                              <label className="flex flex-col gap-1 text-xs text-gray-500">
                                有効期限
                                <input
                                  type="date"
                                  name="expiryDate"
                                  defaultValue={formatDateInput(item.expiryDate)}
                                  className="rounded border border-gray-300 px-2 py-1"
                                />
                              </label>
                              <label className="flex flex-col gap-1 text-xs text-gray-500">
                                通知日
                                <input
                                  type="date"
                                  name="notificationDate"
                                  defaultValue={formatDateInput(item.notificationDate)}
                                  className="rounded border border-gray-300 px-2 py-1"
                                />
                              </label>
                              <input
                                name="notes"
                                defaultValue={item.notes ?? ""}
                                className="rounded border border-gray-300 px-2 py-1 sm:col-span-2"
                                placeholder="メモ(任意)"
                              />
                              <button
                                type="submit"
                                className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 sm:col-span-2"
                              >
                                更新する
                              </button>
                            </form>
                          </details>
                          <form action={deleteItem} className="inline-block ml-2">
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
