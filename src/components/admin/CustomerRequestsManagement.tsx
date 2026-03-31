"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  Phone, Trash2, CheckCircle2, XCircle, Clock, Loader2,
  User, Mail, AlertCircle, MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CustomerRequest {
  id: string;
  user_id: string;
  request_type: 'mobile_change' | 'account_deletion';
  status: 'pending' | 'approved' | 'rejected';
  current_value: string | null;
  requested_value: string | null;
  reason: string | null;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
    account_number: string | null;
  } | null;
}

export function CustomerRequestsManagement() {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Action dialog
  const [actionDialog, setActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved');
  const [actionTarget, setActionTarget] = useState<CustomerRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customer-requests', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      toast.error('Failed to load customer requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const openAction = (request: CustomerRequest, type: 'approved' | 'rejected') => {
    setActionTarget(request);
    setActionType(type);
    setAdminNotes('');
    setActionDialog(true);
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/customer-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          request_id: actionTarget.id,
          action: actionType,
          admin_notes: adminNotes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      toast.success(`Request ${actionType}`);
      setActionDialog(false);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filtered = requests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (typeFilter !== 'all' && r.request_type !== typeFilter) return false;
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Customer Requests</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-gray-300 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mobile_change">Mobile Change</SelectItem>
              <SelectItem value="account_deletion">Account Deletion</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-gray-300 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <AlertCircle className="h-10 w-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div
              key={req.id}
              className={cn(
                "bg-white/[0.04] border rounded-xl p-4 hover:bg-white/[0.06] transition-colors",
                req.status === 'pending' ? 'border-amber-500/20' : 'border-white/[0.06]'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    req.request_type === 'mobile_change'
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-red-500/15 text-red-400'
                  )}>
                    {req.request_type === 'mobile_change' ? <Phone className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">
                        {req.request_type === 'mobile_change' ? 'Mobile Number Change' : 'Account Deletion'}
                      </p>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {req.profiles?.full_name || 'Unknown'}
                      </span>
                      {req.profiles?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {req.profiles.email}
                        </span>
                      )}
                      {req.profiles?.account_number && (
                        <span className="font-mono text-gray-600">{req.profiles.account_number}</span>
                      )}
                    </div>

                    {req.request_type === 'mobile_change' && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-gray-500">{req.current_value || '—'}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-white font-medium">{req.requested_value || '—'}</span>
                      </div>
                    )}

                    {req.reason && (
                      <p className="mt-1.5 text-xs text-gray-400 flex items-start gap-1">
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                        {req.reason}
                      </p>
                    )}

                    {req.admin_notes && (
                      <p className="mt-1 text-xs text-amber-400/80 italic">Admin: {req.admin_notes}</p>
                    )}

                    <p className="mt-1.5 text-[10px] text-gray-600">
                      {format(parseISO(req.created_at), 'dd MMM yyyy, hh:mm a')}
                      {req.resolved_at && ` · Resolved ${format(parseISO(req.resolved_at), 'dd MMM yyyy')}`}
                    </p>
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => openAction(req, 'approved')}
                      className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs px-3"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAction(req, 'rejected')}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs px-3"
                    >
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent className="bg-[#16161a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approved' ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              {actionType === 'approved' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {actionTarget?.request_type === 'mobile_change'
                ? `${actionType === 'approved' ? 'Approve' : 'Reject'} mobile change from ${actionTarget?.current_value} to ${actionTarget?.requested_value}`
                : `${actionType === 'approved' ? 'Approve' : 'Reject'} account deletion for ${actionTarget?.profiles?.full_name || actionTarget?.profiles?.email}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs text-gray-400 mb-1 block">Admin Notes (optional)</label>
            <Textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Add a note about this decision..."
              className="bg-white/5 border-white/10 text-white resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActionDialog(false)} className="text-gray-400">Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={cn(
                actionType === 'approved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700',
                'text-white'
              )}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {actionType === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
        <Clock className="h-3 w-3 mr-1" /> Pending
      </Badge>
    );
  }
  if (status === 'approved') {
    return (
      <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">
      <XCircle className="h-3 w-3 mr-1" /> Rejected
    </Badge>
  );
}
