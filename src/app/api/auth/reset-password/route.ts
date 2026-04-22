import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const { password, token } = await request.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password too short' }, { status: 400 });
    }
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const { error } = await supabase.auth.verifyOtp({
      token,
      type: 'recovery',
    });

    if (error) {
      console.error('Verify OTP error:', error);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
