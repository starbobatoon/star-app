import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const limiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const key = `forgot-password:${ip}`;

    try {
      await limiter.consume(key);
    } catch (rejRes: unknown) {
      const rej = rejRes as { msBeforeNext?: number };
      const secLeft = Math.round((rej.msBeforeNext ?? 60000) / 1000);
      return NextResponse.json(
        { error: `Too many requests, retry in ${secLeft > 60 ? Math.round(secLeft / 60) + 'm' : secLeft + 's'}` },
        { status: 429 }
      );
    }

    const origin = request.headers.get('origin') ?? request.headers.get('x-forwarded-host') ?? 'http://localhost:3000';
    const redirectTo = `${origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error('[forgot-password] Reset email error:', error);
      return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Reset email sent' });
  } catch (error) {
    console.error('[forgot-password] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}