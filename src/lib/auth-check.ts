import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { APP_ID } from "./constants";

export { APP_ID };

/**
 * Creates a Supabase server client and returns the authenticated user.
 * Returns null if not authenticated.
 * Use in API route handlers to enforce auth checks.
 */
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cannot set cookies from server components — middleware handles this
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Checks if a user has admin privileges for the Star Speaker App.
 * Requires role=admin AND app=APP_ID in app_metadata so that admins from
 * other Supabase apps (e.g. AutoWebinar) don't bleed into this dashboard.
 * ADMIN_EMAIL env var bypass is kept for bootstrap/recovery convenience.
 */
export function isAdmin(user: { email?: string | null; app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail) return true;
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  return meta.role === "admin" && meta.app === APP_ID;
}

/**
 * Checks if a user belongs to this app (any role).
 */
export function isAppUser(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  return user.app_metadata?.app === APP_ID;
}
