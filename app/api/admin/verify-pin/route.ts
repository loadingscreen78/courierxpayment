import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 30;

export async function POST(request: NextRequest) {
  const supabase = getServiceRoleClient();

  // Get client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  const body = await request.json().catch(() => null);
  if (!body?.pin || typeof body.pin !== 'string' || body.pin.length !== 4) {
    return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 });
  }

  // Check rate limit: count failed attempts in the last WINDOW_MINUTES
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('admin_pin_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('success', false)
    .gte('attempted_at', windowStart);

  if (countError) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  const failedCount = count ?? 0;
  if (failedCount >= MAX_ATTEMPTS) {
    return NextResponse.json({
      error: 'Too many failed attempts. Please try again later.',
      locked: true,
      remainingAttempts: 0,
    }, { status: 429 });
  }

  // Fetch the correct PIN from database
  const { data: setting, error: settingError } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'admin_access_pin')
    .single();

  if (settingError || !setting) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const correctPin = (setting.value as { pin: string }).pin;
  const isCorrect = body.pin === correctPin;

  // Log the attempt
  await supabase.from('admin_pin_attempts').insert({
    ip_address: ip,
    success: isCorrect,
  });

  // Cleanup old attempts (fire-and-forget)
  void supabase.rpc('cleanup_old_pin_attempts');

  if (!isCorrect) {
    const remaining = MAX_ATTEMPTS - (failedCount + 1);
    return NextResponse.json({
      error: 'Incorrect PIN',
      locked: remaining <= 0,
      remainingAttempts: Math.max(0, remaining),
    }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
