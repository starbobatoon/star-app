import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Only run on /admin/* routes
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow the login page itself and its static assets through
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  // Build a Supabase SSR client scoped to this request
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: Call getUser() immediately after creating the client.
  // Do not add any logic between createServerClient and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated — allow the request through
  if (user) {
    return response;
  }

  // Not authenticated
  // For API routes under /admin, return 401 JSON
  if (pathname.startsWith("/admin/api/") || pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // For page routes, redirect to login
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  // Preserve the intended destination so we can redirect back after login
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match all /admin/* routes including nested paths
  matcher: ["/admin/:path*"],
};