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
 * Checks if a user has admin privileges.
 * Admin = role='admin' in app_metadata (app scoping is NOT enforced for admins
 * because legacy admin accounts may not have app_metadata.app set to APP_ID).
 * The ADMIN_EMAIL env var bypass is kept for bootstrap convenience only.
 */
export function isAdmin(user: { email?: string | null; app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail) return true;
  if (user.app_metadata?.role === "admin") return true;
  return false;
}

/**
 * Checks if a user belongs to this app (any role).
 */
export function isAppUser(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  return user.app_metadata?.app === APP_ID;
}
