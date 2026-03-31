import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const supabase = getServiceRoleClient();
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  if (!roles?.some((r: any) => r.role === 'admin')) return null;
  return user;
}

// GET /api/admin/blog/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ post: data });
}

// PATCH /api/admin/blog/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const supabase = getServiceRoleClient();

  // If publishing for the first time, set published_at
  if (body.status === 'published') {
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('published_at')
      .eq('id', params.id)
      .single();
    if (!existing?.published_at) {
      body.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

// DELETE /api/admin/blog/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
