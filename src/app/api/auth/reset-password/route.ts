import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const { password, token_hash } = await request.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password too short (min 6 chars)' }, { status: 400 });
    }
    if (!token_hash) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Verify the recovery token using token_hash (Supabase v2 PKCE flow)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    } as any);

    if (verifyError) {
      console.error('[reset-password] Verify OTP error:', verifyError);
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      console.error('[reset-password] Update password error:', updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[reset-password] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}