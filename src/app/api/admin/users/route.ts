import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-check';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('[admin/users] List error:', error);
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    // Filter to only elocutionist app users
    const elocutionistUsers = users.filter(
      (u) => u.app_metadata?.app === 'elocutionist'
    );

    return NextResponse.json(elocutionistUsers);
  } catch (error) {
    console.error('[admin/users] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, password } = await request.json();
    if (!email || !password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Invalid email or password (min 6 chars)' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin', app: 'elocutionist' },
    });

    if (error) {
      console.error('[admin/users] Create error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error('[admin/users] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}