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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

// GET /api/admin/blog — list all posts (admin sees drafts too)
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}

// POST /api/admin/blog — create a new post
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const supabase = getServiceRoleClient();

  const slug = body.slug || generateSlug(body.title || '');
  
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: body.title,
      slug,
      excerpt: body.excerpt || null,
      content: body.content,
      cover_image: body.cover_image || null,
      category: body.category || 'General',
      tags: body.tags || [],
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
      meta_keywords: body.meta_keywords || [],
      canonical_url: body.canonical_url || null,
      og_image: body.og_image || null,
      geo_region: body.geo_region || 'IN',
      geo_target_countries: body.geo_target_countries || ['IN'],
      status: body.status || 'draft',
      published_at: body.status === 'published' ? new Date().toISOString() : null,
      author_id: admin.id,
      author_name: body.author_name || admin.email?.split('@')[0] || 'CourierX Team',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}
