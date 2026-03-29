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

  // ── Rate limiting (graceful if table doesn't exist yet) ──
  let failedCount = 0;
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from('admin_pin_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('success', false)
    .gte('attempted_at', windowStart);

  // If table exists, use the count; if table missing, skip rate limiting
  if (!countError) {
    failedCount = count ?? 0;
  }

  if (failedCount >= MAX_ATTEMPTS) {
    return NextResponse.json({
      error: 'Too many failed attempts. Please try again later.',
      locked: true,
      remainingAttempts: 0,
    }, { status: 429 });
  }

  // ── Fetch PIN from database, fallback to env/hardcoded ──
  let correctPin: string | null = null;

  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'admin_access_pin')
    .maybeSingle();

  if (setting?.value && typeof setting.value === 'object' && 'pin' in (setting.value as Record<string, unknown>)) {
    correctPin = (setting.value as { pin: string }).pin;
  }

  // Fallback: check environment variable
  if (!correctPin) {
    correctPin = process.env.ADMIN_ACCESS_PIN || null;
  }

  if (!correctPin) {
    console.error('[verify-pin] No admin_access_pin found in app_settings or env');
    return NextResponse.json({ error: 'Admin PIN not configured. Run the migration SQL.' }, { status: 500 });
  }

  const isCorrect = body.pin === correctPin;

  // ── Log attempt (graceful if table doesn't exist) ──
  if (!countError) {
    await supabase.from('admin_pin_attempts').insert({
      ip_address: ip,
      success: isCorrect,
    });
  }

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
