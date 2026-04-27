import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const limiter = new RateLimiterMemory({ points: 5, duration: 60 });

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Star Speaker AI <noreply@starspeaker.ai>';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    try {
      await limiter.consume(`forgot-password:${ip}`);
    } catch (rej: unknown) {
      const secLeft = Math.round(((rej as { msBeforeNext?: number }).msBeforeNext ?? 60000) / 1000);
      return NextResponse.json(
        { error: `Too many requests, retry in ${secLeft > 60 ? Math.round(secLeft / 60) + 'm' : secLeft + 's'}` },
        { status: 429 }
      );
    }

    const origin = request.headers.get('origin') ?? 'https://star-app.vercel.app';
    const redirectTo = `${origin}/auth/reset-password`;

    // Generate a recovery link via the admin client — no email sent by Supabase
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[forgot-password] Link generation error:', linkError);
      // Return success anyway — don't reveal whether the email exists
      return NextResponse.json({ success: true });
    }

    const resetLink = linkData.properties.action_link;

    // Send via Resend with branded template
    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your Star Speaker AI password',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="https://star-app.vercel.app/logo.png" alt="Star Speaker AI" height="48" style="height:48px;object-fit:contain;">
        </td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:40px 36px;">
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 16px;">Reset Your Password</h1>
          <p style="color:#a0a0a0;font-size:15px;line-height:1.6;margin:0 0 28px;">
            We received a request to reset the password for your Star Speaker AI account associated with <strong style="color:#d0d0d0;">${email}</strong>.<br><br>
            Click the button below to create a new password. This link expires in 1 hour.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="border-radius:8px;background:#9b59b6;">
              <a href="${resetLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">
                Reset Password →
              </a>
            </td></tr>
          </table>
          <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">
            If you didn't request this, you can safely ignore this email — your password won't change.<br><br>
            Or paste this link into your browser:<br>
            <a href="${resetLink}" style="color:#9b59b6;word-break:break-all;">${resetLink}</a>
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="color:#444;font-size:12px;margin:0;">© ${new Date().getFullYear()} Star Speaker AI. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    if (sendError) {
      console.error('[forgot-password] Resend error:', sendError);
    }

    // Always return success — don't reveal whether the email exists
    return NextResponse.json({ success: true, message: 'If this email is registered, a reset link has been sent.' });
  } catch (error) {
    console.error('[forgot-password] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
