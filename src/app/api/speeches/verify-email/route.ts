import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { createVerificationToken } from "@/lib/email-verification";
import {
  checkRateLimit,
  getClientIp,
  verificationEmailRateLimiter,
  verificationIpRateLimiter,
} from "@/lib/rate-limit";

// POST /api/speeches/verify-email
// Sends a confirmation email containing a signed link. The submitter
// must click it before a public speech is generated, proving they
// control the inbox. This keeps unverified addresses out of
// GoHighLevel and stops speech emails going to third parties.
//
// Both the caller IP and the target email are rate-limited so this
// endpoint cannot be used to bomb someone's inbox via Resend.

const requestSchema = z.object({
  email: z.string().email("A valid email is required"),
});

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ??
  "Star Speaker AI <management@blackceo.com>";

export async function POST(request: Request) {
  const ipLimit = await checkRateLimit(
    verificationIpRateLimiter,
    getClientIp(request)
  );
  if (ipLimit) return ipLimit;

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }
    const email = parsed.data.email.trim().toLowerCase();

    const emailLimit = await checkRateLimit(
      verificationEmailRateLimiter,
      email
    );
    if (emailLimit) return emailLimit;

    const token = createVerificationToken(email);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      request.headers.get("origin") ??
      "https://star-app-weld.vercel.app";
    const verifyUrl = `${appUrl.replace(/\/$/, "")}/compose?verify=${encodeURIComponent(token)}`;

    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Confirm your email to generate your speech — Star Speaker AI",
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
          <h1 style="font-size: 22px; margin-bottom: 8px;">One quick step before your speech</h1>
          <p style="font-size: 16px; line-height: 1.5;">
            Thank you for using Star Speaker AI. Please confirm this is your
            email address, and we will generate your speech right away.
          </p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}"
               style="background: #0B1472; color: #ffffff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-size: 16px;">
              Confirm my email
            </a>
          </p>
          <p style="font-size: 14px; line-height: 1.5; color: #555;">
            This link expires in 30 minutes. If you did not request a speech,
            you can ignore this email — nothing will be created.
          </p>
          <p style="font-size: 14px;">With gratitude,<br/>Star Bobatoon</p>
        </div>
      `,
    });

    if (sendError) {
      console.error("[verify-email] Resend error:", sendError);
      return NextResponse.json(
        { error: "Could not send the confirmation email. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ sent: true }, { status: 200 });
  } catch (err) {
    console.error("[verify-email] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
