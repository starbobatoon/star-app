import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-check';
import { APP_ID } from '@/lib/constants';

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

    // Filter to only Star Speaker App admins
    const filteredUsers = users.filter((u: any) => {
      const meta = u.app_metadata || {};
      return meta.app === APP_ID && meta.role === 'admin';
    });

    return NextResponse.json(filteredUsers);
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
      app_metadata: { role: 'admin', app: APP_ID },
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