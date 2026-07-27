import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "mn_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/signin") return NextResponse.next();

  const token = process.env.SESSION_TOKEN;
  if (token && request.cookies.get(SESSION_COOKIE)?.value === token) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/signin";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
