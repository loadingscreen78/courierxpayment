import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Monitor, Smartphone, Globe, Clock, Activity, Trash2, AlertTriangle,
  Shield, Loader2, MapPin, CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface LoginEntry {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  location: string | null;
  login_method: string | null;
  created_at: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export const SecurityTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { mediumTap, errorFeedback } = useHaptics();
  const { playError } = useSoundEffects();

  const [logins, setLogins] = useState<LoginEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch activity data
      const actRes = await fetch('/api/user/activity', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const actData = await actRes.json();
      setLogins(actData.logins || []);
      setActivities(actData.activities || []);

      // Check for pending deletion request
      const reqRes = await fetch('/api/user/request-change', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const reqData = await reqRes.json();
      const hasPending = reqData.requests?.some(
        (r: any) => r.request_type === 'account_deletion' && r.status === 'pending'
      );
      setPendingDeletion(hasPending || false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleDeletionRequest = async () => {
    mediumTap();
    setSubmittingDeletion(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const res = await fetch('/api/user/request-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          request_type: 'account_deletion',
          reason: deletionReason || 'No reason provided',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      toast({ title: 'Request Submitted', description: 'Your account deletion request is under review.' });
      setPendingDeletion(true);
      setDeletionReason('');
    } catch (err: any) {
      errorFeedback();
      playError();
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingDeletion(false);
    }
  };

  const getDeviceIcon = (deviceType: string | null, userAgent: string | null) => {
    const ua = (deviceType || userAgent || '').toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const parseDevice = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown device';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome Browser';
    if (ua.includes('firefox')) return 'Firefox Browser';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari Browser';
    if (ua.includes('edge')) return 'Edge Browser';
    return 'Web Browser';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Recent Logins
          </CardTitle>
          <CardDescription>Your last 5 login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {logins.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No login history available yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Login history will appear after your next sign-in</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logins.map((login, i) => (
                <div key={login.id} className={`flex items-start gap-3 p-3 rounded-lg border ${i === 0 ? 'border-success/30 bg-success/5' : 'border-border/50'}`}>
                  <div className={`p-2 rounded-lg ${i === 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {getDeviceIcon(login.device_type, login.user_agent)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{parseDevice(login.user_agent)}</p>
                      {i === 0 && (
                        <Badge variant="outline" className="text-[10px] border-success/30 text-success bg-success/10">
                          Current
                        </Badge>
                      )}
                      {login.login_method && (
                        <Badge variant="outline" className="text-[10px]">
                          {login.login_method}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {login.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {login.location}
                        </span>
                      )}
                      {login.ip_address && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {login.ip_address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {format(new Date(login.created_at), 'dd MMM yyyy, hh:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Activity Log
          </CardTitle>
          <CardDescription>Your last 20 account activities</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Activities like profile updates, shipments, and requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{act.action}</p>
                    {act.details && <p className="text-xs text-muted-foreground mt-0.5">{act.details}</p>}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {format(new Date(act.created_at), 'dd MMM, hh:mm a')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Deletion Request */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Account Deletion
          </CardTitle>
          <CardDescription>
            Request permanent deletion of your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingDeletion ? (
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Deletion Request Pending</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your account deletion request is being reviewed by our admin team. You will be notified once it&apos;s processed.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                <p className="text-sm text-muted-foreground">
                  Requesting account deletion will send a request to our admin team. Once approved, all your data, shipment history, and wallet balance will be permanently removed. Any remaining wallet balance will be refunded to your registered bank account within 14 business days.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="btn-press gap-2">
                    <Trash2 className="h-4 w-4" />
                    Request Account Deletion
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Request Account Deletion?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p>This will submit a request to permanently delete your account. An admin will review and process it.</p>
                        <div>
                          <Label htmlFor="deletionReason" className="text-foreground text-sm">
                            Reason (optional)
                          </Label>
                          <Textarea
                            id="deletionReason"
                            value={deletionReason}
                            onChange={(e) => setDeletionReason(e.target.value)}
                            placeholder="Tell us why you want to delete your account..."
                            className="mt-2"
                            rows={3}
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletionRequest}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={submittingDeletion}
                    >
                      {submittingDeletion ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
                      ) : (
                        'Submit Deletion Request'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
