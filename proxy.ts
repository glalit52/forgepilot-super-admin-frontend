import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic guard: without a session cookie there is nothing to show, so go to sign-in.
 * The real check is the backend's: every /admin call is refused unless the caller is staff.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = !!request.cookies.get("fp_session")?.value;
  if (!signedIn && pathname !== "/login")
    return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|favicon.ico).*)"] };
