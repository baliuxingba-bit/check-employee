import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-xl font-bold">ログイン</h1>
      <form action={login} className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="パスワード"
          className="rounded border border-gray-300 px-3 py-2"
        />
        {error && (
          <p className="text-sm text-red-600">パスワードが違います</p>
        )}
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          ログイン
        </button>
      </form>
    </main>
  );
}
