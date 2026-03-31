import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/shipment-lifecycle/supabaseAdmin';

// GET /api/public/blog — list published posts (public, no auth)
export async function GET(request: NextRequest) {
  const supabase = getServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const slug = searchParams.get('slug');

  // Single post by slug
  if (slug) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ post: data });
  }

  // List published posts
  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, category, tags, author_name, published_at, geo_region, geo_target_countries')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return categories for filter
  const { data: allPosts } = await supabase
    .from('blog_posts')
    .select('category')
    .eq('status', 'published');

  const categories = ['All', ...new Set((allPosts || []).map((p: any) => p.category))];

  return NextResponse.json({ posts: data || [], categories });
}
