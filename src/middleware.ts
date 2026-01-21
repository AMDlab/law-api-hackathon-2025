import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { authSecret } from "@/lib/auth-secret";

type UserRole =
  | "designer"
  | "bim_specialist"
  | "ifc_specialist"
  | "bim_software_programmer"
  | "reviewer"
  | "review_software_programmer";

const reviewerRoles: UserRole[] = ["reviewer", "review_software_programmer"];

const roleRules: { pattern: RegExp; allowed: UserRole[] }[] = [
  {
    pattern: /^\/api\/diagrams\/[^/]+\/[^/]+\/snapshots(?:\/|$)/,
    allowed: reviewerRoles,
  },
];

function isRoleAllowed(pathname: string, role?: UserRole) {
  const rule = roleRules.find((entry) => entry.pattern.test(pathname));
  if (!rule) return true;
  if (!role) return false;
  return rule.allowed.includes(role);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: authSecret,
  });

  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (!isRoleAllowed(pathname, token.role as UserRole | undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|api/auth).*)",
    "/api/diagrams/:path*",
  ],
};
