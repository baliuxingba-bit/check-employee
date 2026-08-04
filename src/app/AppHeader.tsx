import Link from "next/link";
import { logout } from "./actions";

export function AppHeader({
  title,
  description,
  active,
}: {
  title: string;
  description: string;
  active: "deadlines" | "absences";
}) {
  return (
    <header className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
        <nav className="mt-3 flex gap-4 text-sm">
          <Link
            href="/"
            className={
              active === "deadlines"
                ? "font-semibold text-black"
                : "text-gray-400 hover:text-gray-700"
            }
          >
            期限管理
          </Link>
          <Link
            href="/absences"
            className={
              active === "absences"
                ? "font-semibold text-black"
                : "text-gray-400 hover:text-gray-700"
            }
          >
            欠勤表
          </Link>
        </nav>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ログアウト
        </button>
      </form>
    </header>
  );
}
