import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { loginRateLimiter, getClientIp, checkRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  console.log("[api/auth/login] Starting request");
  
  // Rate limit check
  const rateLimitResponse = await checkRateLimit(loginRateLimiter, getClientIp(request));
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    console.log("[api/auth/login] Request body received");
    
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      console.log("[api/auth/login] Validation failed:", errors);
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    console.log("[api/auth/login] Attempting login for:", email);
    
    // Check env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("[api/auth/login] Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    const supabase = await createServerClient();
    console.log("[api/auth/login] Supabase client created");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log("[api/auth/login] Auth error:", error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    console.log("[api/auth/login] Login successful for:", email);
    return NextResponse.json({
      user: data.user,
      session: data.session,
    });
    
  } catch (err) {
    console.error("[api/auth/login] Unexpected error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
