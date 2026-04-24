import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

/**
 * POST /api/user/fcm-token
 * Saves the FCM push token for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    await supabase
      .from('profiles')
      .update({ fcm_token: token, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[fcm-token] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/fcm-token
 * Clears the FCM token (on logout).
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await supabase
      .from('profiles')
      .update({ fcm_token: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[fcm-token] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
