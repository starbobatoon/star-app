import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // NOTE: Compose is intentionally PUBLIC (no sign-in gate). The single
    // identity model the product presents is: compose is open to everyone,
    // and only /admin is protected. The old compose auth-gate block was dead
    // code (this middleware's matcher only ran on /admin/*) and has been
    // removed so there is exactly one identity story.

    // ── Admin protection ──
    if (!pathname.startsWith("/admin")) {
      return NextResponse.next();
    }

    // Allow the login page itself and its static assets through
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/") || pathname === "/admin/forgot-password" || pathname.startsWith("/admin/forgot-password/") || pathname === "/admin/reset-password" || pathname.startsWith("/admin/reset-password/")) {
      return NextResponse.next();
    }

    // Check for required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[middleware] Missing Supabase environment variables");
      // Redirect to login with error instead of crashing
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("error", "config_error");
      return NextResponse.redirect(loginUrl);
    }

    // Build a Supabase SSR client scoped to this request
    let response = NextResponse.next({ request });

    let supabase;
    try {
      supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              try {
                return request.cookies.getAll();
              } catch (e) {
                console.error("[middleware] Error getting cookies:", e);
                return [];
              }
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  request.cookies.set(name, value);
                  response.cookies.set(name, value, options);
                });
              } catch (e) {
                console.error("[middleware] Error setting cookies:", e);
              }
            },
          },
        }
      );
    } catch (e) {
      console.error("[middleware] Error creating Supabase client:", e);
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("error", "auth_error");
      return NextResponse.redirect(loginUrl);
    }

    // Call getUser() with error handling
    let user = null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("[middleware] getUser error:", error.message);
      } else {
        user = data.user;
      }
    } catch (e) {
      console.error("[middleware] Exception in getUser:", e);
    }

    // Authenticated — check admin role
    if (user) {
      const adminEmail = process.env.ADMIN_EMAIL;
      // Admins bypass app scoping: legacy admin accounts may not have app_metadata.app set.
      // Non-admin compose users still require app === APP_ID (handled in compose section above).
      const isAdminUser = user.email === adminEmail || user.app_metadata?.role === 'admin';
      
      if (!isAdminUser) {
        // Authenticated but not admin
        if (pathname.startsWith("/admin/api/")) {
          return NextResponse.json(
            { error: "Forbidden: Admin access required" },
            { status: 403 }
          );
        }
        // For page routes, redirect to login with error
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/admin/login";
        loginUrl.searchParams.set("error", "admin_required");
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      return response;
    }

    // Not authenticated
    if (pathname.startsWith("/admin/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // For page routes, redirect to login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
    
  } catch (e) {
    console.error("[middleware] Unhandled exception:", e);
    // Graceful fallback - redirect to login
    try {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("error", "server_error");
      return NextResponse.redirect(loginUrl);
    } catch {
      // If even that fails, return a simple response
      return new NextResponse("Internal server error", { status: 500 });
    }
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
