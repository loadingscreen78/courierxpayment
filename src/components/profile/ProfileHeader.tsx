import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const ProfileHeader = () => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const memberSince = profile?.created_at 
    ? format(new Date(profile.created_at), 'MMMM yyyy')
    : 'Recently joined';

  const isGoogleUser = user?.app_metadata?.provider === 'google' || 
                       user?.identities?.some((i: any) => i.provider === 'google');

  const handleUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Invalid file', description: 'Only JPG, PNG, and WebP images are allowed.', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Image must be under 2MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/user/profile-picture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      await updateProfile({ avatar_url: data.avatar_url });
      toast({ title: 'Profile picture updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to upload', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePicture = async () => {
    setRemoving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const res = await fetch('/api/user/profile-picture', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to remove');

      await updateProfile({ avatar_url: null });
      toast({ title: 'Profile picture removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to remove', variant: 'destructive' });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          {/* Avatar with upload/remove controls */}
          <div className="relative group">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={displayName}
                className="h-20 w-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                {initials}
              </div>
            )}
            
            {/* Overlay buttons */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="Upload picture"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              {profile?.avatar_url && (
                <button
                  onClick={handleRemovePicture}
                  disabled={removing}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-red-500/50 text-white transition-colors"
                  title="Remove picture"
                >
                  {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleUploadPicture}
            />
          </div>
          
          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-typewriter text-foreground">
                {displayName}
              </h1>
              {isGoogleUser && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                  Google
                </span>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {user?.email || profile?.phone_number}
            </p>

            {profile?.account_number && (
              <p className="text-xs font-mono text-coke-red font-semibold">
                {profile.account_number}
              </p>
            )}
            
            <p className="text-xs text-muted-foreground/70">
              Member since {memberSince}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
