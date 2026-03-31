import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

export const ProfileHeader = () => {
  const { user, profile } = useAuth();
  
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const memberSince = profile?.created_at 
    ? format(new Date(profile.created_at), 'MMMM yyyy')
    : 'Recently joined';

  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          {/* Avatar */}
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
          
          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-typewriter text-foreground">
                {displayName}
              </h1>
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
