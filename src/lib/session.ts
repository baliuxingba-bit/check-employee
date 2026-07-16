import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Role = "viewer" | "editor";

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET?.trim());

export async function createSession(role: Role) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const session = await new SignJWT({ authenticated: true, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(encodedKey);

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload.role === "editor" ? "editor" : "viewer";
  } catch {
    return null;
  }
}

export async function requireEditor() {
  const role = await verifySession();
  if (role !== "editor") {
    throw new Error("この操作には編集権限が必要です");
  }
}
