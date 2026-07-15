import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET);

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("session")?.value;
  let authenticated = false;

  if (cookie) {
    try {
      await jwtVerify(cookie, encodedKey, { algorithms: ["HS256"] });
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
