'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Loader2, Pencil, Trash2, Eye, EyeOff,
  Search, Globe, Calendar, Tag, FileText, ExternalLink,
  Image as ImageIcon, X,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[];
  canonical_url: string | null;
  og_image: string | null;
  geo_region: string;
  geo_target_countries: string[];
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  'Product Updates', 'Logistics', 'Compliance', 'Global Shipping',
  'Partners', 'Features', 'Guides', 'Company News', 'General',
];

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image: '',
  category: 'General',
  tags: '',
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
  canonical_url: '',
  og_image: '',
  geo_region: 'IN',
  geo_target_countries: 'IN',
  author_name: '',
  status: 'draft' as 'draft' | 'published' | 'archived',
};

type EditorTab = 'content' | 'seo' | 'geo';

export function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('content');

  const getAuthHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
    };
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/blog', { headers });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch {
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120);
  };

  const handleCreate = () => {
    setEditingPost(null);
    setForm(emptyForm);
    setEditorTab('content');
    setShowEditor(true);
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content,
      cover_image: post.cover_image || '',
      category: post.category,
      tags: (post.tags || []).join(', '),
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      meta_keywords: (post.meta_keywords || []).join(', '),
      canonical_url: post.canonical_url || '',
      og_image: post.og_image || '',
      geo_region: post.geo_region || 'IN',
      geo_target_countries: (post.geo_target_countries || ['IN']).join(', '),
      author_name: post.author_name || '',
      status: post.status,
    });
    setEditorTab('content');
    setShowEditor(true);
  };

  const handleSave = async (publishNow?: boolean) => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.content.trim()) { toast.error('Content is required'); return; }
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const status = publishNow ? 'published' : form.status;
      const payload = {
        title: form.title,
        slug: form.slug || generateSlug(form.title),
        excerpt: form.excerpt || null,
        content: form.content,
        cover_image: form.cover_image || null,
        category: form.category,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        meta_keywords: form.meta_keywords ? form.meta_keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        canonical_url: form.canonical_url || null,
        og_image: form.og_image || null,
        geo_region: form.geo_region || 'IN',
        geo_target_countries: form.geo_target_countries ? form.geo_target_countries.split(',').map(c => c.trim()).filter(Boolean) : ['IN'],
        author_name: form.author_name || 'CourierX Team',
        status,
      };
      const url = editingPost ? `/api/admin/blog/${editingPost.id}` : '/api/admin/blog';
      const method = editingPost ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingPost ? 'Post updated' : (publishNow ? 'Post published' : 'Post saved'));
        setShowEditor(false);
        fetchPosts();
      } else {
        toast.error(data.error || 'Failed to save post');
      }
    } catch {
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(newStatus === 'published' ? 'Post published' : 'Post unpublished');
        fetchPosts();
      }
    } catch { toast.error('Failed to update post'); }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE', headers });
      if (res.ok) { toast.success('Post deleted'); fetchPosts(); }
    } catch { toast.error('Failed to delete post'); }
  };

  const filteredPosts = posts.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const statusCounts = {
    all: posts.length,
    draft: posts.filter(p => p.status === 'draft').length,
    published: posts.filter(p => p.status === 'published').length,
    archived: posts.filter(p => p.status === 'archived').length,
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10">
                <FileText className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Blog Management</h2>
                <p className="text-sm text-gray-400">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <Button onClick={handleCreate} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
              <Plus className="h-4 w-4" /> New Post
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10">
              {(['all', 'published', 'draft', 'archived'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                    filterStatus === s
                      ? "bg-red-600 text-white shadow"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {s} <span className="ml-1 opacity-60">{statusCounts[s]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No posts found</p>
              <p className="text-sm text-gray-500 mt-1">Create your first blog post to get started</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredPosts.map(post => (
                <div
                  key={post.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all",
                    post.status === 'published'
                      ? "bg-white/[0.03] border-white/10 hover:border-white/20"
                      : "bg-white/[0.01] border-white/5 opacity-70"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Cover thumbnail */}
                    {post.cover_image && (
                      <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-white/5">
                        <img src={post.cover_image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-white text-sm truncate max-w-md">{post.title}</h3>
                        <Badge
                          variant={post.status === 'published' ? 'default' : 'secondary'}
                          className={cn("text-[10px]", post.status === 'published' && "bg-green-600")}
                        >
                          {post.status}
                        </Badge>
                        <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {post.category}
                        </Badge>
                      </div>
                      {post.excerpt && (
                        <p className="text-xs text-gray-500 line-clamp-1 mb-1">{post.excerpt}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {post.published_at
                            ? format(new Date(post.published_at), 'dd MMM yyyy')
                            : format(new Date(post.created_at), 'dd MMM yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />{post.geo_region}
                        </span>
                        {post.slug && (
                          <span className="flex items-center gap-1 text-gray-600">
                            /blog/{post.slug}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {post.status === 'published' && (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title="View live"
                        >
                          <ExternalLink className="h-4 w-4 text-green-400" />
                        </a>
                      )}
                      <button
                        onClick={() => handleToggleStatus(post)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {post.status === 'published'
                          ? <EyeOff className="h-4 w-4 text-yellow-400" />
                          : <Eye className="h-4 w-4 text-gray-500" />}
                      </button>
                      <button
                        onClick={() => handleEdit(post)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(post)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Post Editor Dialog ── */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="bg-[#16161a] border-white/10 text-white max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono text-white">
                {editingPost ? 'Edit Post' : 'New Blog Post'}
              </DialogTitle>
            </DialogHeader>

            {/* Editor Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit mb-4">
              {([
                { key: 'content' as EditorTab, label: 'Content', icon: FileText },
                { key: 'seo' as EditorTab, label: 'SEO', icon: Search },
                { key: 'geo' as EditorTab, label: 'GEO / AEO', icon: Globe },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setEditorTab(tab.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                    editorTab === tab.key
                      ? "bg-red-600 text-white shadow"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <tab.icon className="h-3 w-3" />{tab.label}
                </button>
              ))}
            </div>

            {/* Content Tab */}
            {editorTab === 'content' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400">Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        title: e.target.value,
                        slug: form.slug || generateSlug(e.target.value),
                      });
                    }}
                    placeholder="Post title"
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Slug</label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="auto-generated-from-title"
                    className="mt-1 bg-white/5 border-white/10 text-white font-mono text-sm placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Excerpt</label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    placeholder="Brief summary for cards and previews..."
                    rows={2}
                    className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Content (HTML or Markdown)</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Write your blog post content here..."
                    rows={12}
                    className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono resize-y"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-400">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full mt-1 h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400">Author Name</label>
                    <Input
                      value={form.author_name}
                      onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                      placeholder="CourierX Team"
                      className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Tags (comma-separated)</label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="shipping, medicine, compliance"
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Cover Image URL</label>
                  <Input
                    value={form.cover_image}
                    onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                    placeholder="https://..."
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
            )}

            {/* SEO Tab */}
            {editorTab === 'seo' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs text-blue-300/80">
                    SEO fields override defaults for search engines. Leave blank to auto-generate from title and excerpt.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Meta Title</label>
                  <Input
                    value={form.meta_title}
                    onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                    placeholder={form.title || 'Auto-generated from title'}
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-gray-600 mt-1">{(form.meta_title || form.title).length}/60 chars</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Meta Description</label>
                  <textarea
                    value={form.meta_description}
                    onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                    placeholder={form.excerpt || 'Auto-generated from excerpt'}
                    rows={3}
                    className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 resize-none"
                  />
                  <p className="text-[10px] text-gray-600 mt-1">{(form.meta_description || form.excerpt).length}/160 chars</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Meta Keywords (comma-separated)</label>
                  <Input
                    value={form.meta_keywords}
                    onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
                    placeholder="courier, shipping, medicine delivery"
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Canonical URL</label>
                  <Input
                    value={form.canonical_url}
                    onChange={(e) => setForm({ ...form, canonical_url: e.target.value })}
                    placeholder="https://courierx.in/blog/your-slug"
                    className="mt-1 bg-white/5 border-white/10 text-white font-mono text-sm placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">OG Image URL</label>
                  <Input
                    value={form.og_image}
                    onChange={(e) => setForm({ ...form, og_image: e.target.value })}
                    placeholder="https://... (1200x630 recommended)"
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
            )}

            {/* GEO / AEO Tab */}
            {editorTab === 'geo' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                  <p className="text-xs text-green-300/80">
                    GEO targeting helps search engines show this content to users in specific regions. AEO (Answer Engine Optimization) ensures AI assistants can extract and cite your content.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Primary Region (ISO code)</label>
                  <Input
                    value={form.geo_region}
                    onChange={(e) => setForm({ ...form, geo_region: e.target.value.toUpperCase() })}
                    placeholder="IN"
                    className="mt-1 bg-white/5 border-white/10 text-white font-mono placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400">Target Countries (comma-separated ISO codes)</label>
                  <Input
                    value={form.geo_target_countries}
                    onChange={(e) => setForm({ ...form, geo_target_countries: e.target.value.toUpperCase() })}
                    placeholder="IN, US, UK, CA, AU, AE"
                    className="mt-1 bg-white/5 border-white/10 text-white font-mono placeholder:text-gray-600"
                  />
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <p className="text-xs font-medium text-gray-300 mb-2">AEO Tips for this post:</p>
                  <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                    <li>Use clear Q&A format in content for AI snippet extraction</li>
                    <li>Include structured data (auto-generated from your content)</li>
                    <li>Write concise, factual answers in the first paragraph</li>
                    <li>Use specific numbers, dates, and proper nouns</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <Button variant="ghost" onClick={() => setShowEditor(false)} className="text-gray-400">
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Draft
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  Publish
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

export default BlogManagement;
