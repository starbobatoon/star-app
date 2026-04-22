import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const maxWrongAttemptsByIPperMinute = 5;
const maxWrongAttemptsByIPper10Minutes = 15;
const limiter = new RateLimiterMemory({
  points: maxWrongAttemptsByIPperMinute,
  duration: 60,
  pointsByDuration: [
    { points: maxWrongAttemptsByIPper10Minutes - maxWrongAttemptsByIPperMinute, duration: 600 },
  ],
  execEvenly: false,
  blockDuration: 600,
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') ?? request.ip ?? 'unknown';
    const key = `forgot-password:${ip}`;

    try {
      await limiter.consume(key);
    } catch (rejRes) {
      const secLeft = Math.round(rejRes.msBeforeNext / 1000);
      if (secLeft < 60) {
        return NextResponse.json({ error: `Too many requests, retry in ${secLeft}s` }, { status: 429 });
      } else {
        return NextResponse.json({ error: `Too many requests, retry in ${Math.round(secLeft / 60)}m` }, { status: 429 });
      }
    }

    const origin = request.headers.get('origin') ?? request.headers.get('x-forwarded-host') ?? 'http://localhost:3000';
    const redirectTo = `${origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error('Reset password email error:', error);
      return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Reset email sent' });
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
