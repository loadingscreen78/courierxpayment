import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('cx_dev_access', '', { path: '/', maxAge: 0 });
  return res;
}
