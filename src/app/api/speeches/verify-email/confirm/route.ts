import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyVerificationToken } from "@/lib/email-verification";

// POST /api/speeches/verify-email/confirm
// Validates a verification token from the confirmation link so the
// compose page can show "Email confirmed" and attach the token to
// the final speech submission. The authoritative check happens
// again in POST /api/speeches — this endpoint is for UX feedback.

const confirmSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }
    const result = verifyVerificationToken(parsed.data.token);
    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error ?? "Invalid token" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { valid: true, email: result.email },
      { status: 200 }
    );
  } catch (err) {
    console.error("[verify-email/confirm] Unhandled error:", err);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
