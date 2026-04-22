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
 * Checks if a user has admin privileges scoped to this app.
 * Admin = their app_metadata has role='admin' AND app matches this app's ID.
 * The ADMIN_EMAIL env var bypass is kept for bootstrap convenience only.
 * Uses APP_ID from constants.ts for the app check.
 */
export function isAdmin(user: { email?: string | null; app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail) return true;
  if (user.app_metadata?.role === "admin" && user.app_metadata?.app === APP_ID) return true;
  return false;
}

/**
 * Checks if a user belongs to this app (any role).
 */
export function isAppUser(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  return user.app_metadata?.app === APP_ID;
}
