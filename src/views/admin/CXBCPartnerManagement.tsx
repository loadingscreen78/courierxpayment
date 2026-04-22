import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/layout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  ExternalLink,
  UserPlus,
  Copy,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type PartnerApplication = Database['public']['Tables']['cxbc_partner_applications']['Row'];
type PartnerStatus = Database['public']['Enums']['partner_status'];
type IndiaZone = Database['public']['Enums']['india_zone'];

const statusColors: Record<PartnerStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  under_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

interface ManualPartnerForm {
  email: string;
  password: string;
  businessName: string;
  ownerName: string;
  phone: string;
  panNumber: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  zone: IndiaZone;
}

const initialFormState: ManualPartnerForm = {
  email: '', password: '', businessName: '', ownerName: '', phone: '',
  panNumber: '', gstNumber: '', address: '', city: '', state: '', pincode: '', zone: 'north',
};

const CXBCPartnerManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | 'all'>('all');
  const [selectedApplication, setSelectedApplication] = useState<PartnerApplication | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<ManualPartnerForm>(initialFormState);
  const [createdCredentials, setCreatedCredentials] = useState<{ 
    email: string; password: string; userId?: string; partnerId?: string; linkedExisting?: boolean;
  } | null>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ['cxbc-applications', statusFilter],
    queryFn: async () => {
      let query = supabase.from('cxbc_partner_applications').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as PartnerApplication[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (application: PartnerApplication) => {
      // Resolve user_id: use application's user_id, or look up by email
      let resolvedUserId = application.user_id;

      if (!resolvedUserId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', application.email)
          .maybeSingle();

        if (profileError) {
          console.warn('Failed to look up user by email:', profileError.message);
        }

        if (profile?.user_id) {
          resolvedUserId = profile.user_id;
        }
      }

      if (!resolvedUserId) {
        throw new Error('NO_LINKED_USER');
      }

      // Check if partner record already exists (by user_id or email)
      const { data: existingPartner } = await supabase
        .from('cxbc_partners')
        .select('id, status')
        .or(`user_id.eq.${resolvedUserId},email.eq.${application.email}`)
        .maybeSingle();

      if (existingPartner) {
        // Already exists — just update status to approved and link user_id
        const { error: updatePartnerErr } = await supabase
          .from('cxbc_partners')
          .update({ status: 'approved', user_id: resolvedUserId, approved_at: new Date().toISOString() })
          .eq('id', existingPartner.id);
        if (updatePartnerErr) throw updatePartnerErr;
      } else {
        // Create new partner record
        const { error: partnerError } = await supabase.from('cxbc_partners').insert({
          user_id: resolvedUserId, business_name: application.business_name,
          owner_name: application.owner_name, email: application.email, phone: application.phone,
          pan_number: application.pan_number, gst_number: application.gst_number,
          address: application.address, city: application.city, state: application.state,
          pincode: application.pincode, zone: application.zone,
          kyc_pan_url: application.kyc_pan_url, kyc_aadhaar_url: application.kyc_aadhaar_url,
          shop_photo_url: application.shop_photo_url, status: 'approved', approved_at: new Date().toISOString(),
        });
        if (partnerError) throw partnerError;
      }

      // Update application status
      const { error: updateError } = await supabase.from('cxbc_partner_applications')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', application.id);
      if (updateError) throw updateError;

      return { userId: resolvedUserId };
    },
    onSuccess: () => {
      toast.success('Partner approved successfully — they can now access the CXBC panel');
      queryClient.invalidateQueries({ queryKey: ['cxbc-applications'] });
      setSelectedApplication(null);
    },
    onError: (error) => {
      if (error.message === 'NO_LINKED_USER') {
        toast.warning('This application has no linked user account. The applicant must sign up first, or create the partner directly using "Create Partner".');
      } else {
        toast.error('Failed to approve partner: ' + error.message);
      }
    },
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (form: ManualPartnerForm) => {
      const { data, error } = await supabase.functions.invoke('admin-create-cxbc-partner', {
        body: { email: form.email, password: form.password, businessName: form.businessName, ownerName: form.ownerName, phone: form.phone, panNumber: form.panNumber, gstNumber: form.gstNumber || undefined, address: form.address, city: form.city, state: form.state, pincode: form.pincode, zone: form.zone },
      });
      // supabase.functions.invoke sets error for non-2xx; try to parse response context
      if (error) {
        // Try to get the response body for more context
        let errorBody: any = null;
        try {
          if ('context' in error && (error as any).context?.body) {
            const reader = (error as any).context.body.getReader();
            const { value } = await reader.read();
            errorBody = JSON.parse(new TextDecoder().decode(value));
          }
        } catch { /* ignore parse errors */ }

        const errorMessage = errorBody?.error || error.message || 'Failed to create partner';
        const isDuplicate = !!errorBody?.partner_id;
        const err = new Error(errorMessage);
        (err as any).isDuplicate = isDuplicate;
        throw err;
      }
      if (data?.error) {
        const isDuplicate = !!data.partner_id;
        const err = new Error(data.error);
        (err as any).isDuplicate = isDuplicate;
        throw err;
      }
      if (!data?.user_id || !data?.partner_id) throw new Error('Partner created but response was incomplete');
      return { email: form.email, password: form.password, userId: data.user_id, partnerId: data.partner_id, linkedExisting: data.linked_existing_user || false };
    },
    onSuccess: (credentials) => {
      setCreatedCredentials(credentials);
      toast.success(credentials.linkedExisting ? 'Partner linked to existing account' : 'Partner created successfully');
      queryClient.invalidateQueries({ queryKey: ['cxbc-applications'] });
    },
    onError: (error: any) => {
      if (error.isDuplicate) {
        toast.error('This email already has an existing CXBC partner account.');
      } else if (error.message?.includes('Missing required fields') || error.message?.includes('Invalid')) {
        toast.error('Invalid input: ' + error.message);
      } else {
        toast.error(error.message);
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ application, reason }: { application: PartnerApplication; reason: string }) => {
      const { error } = await supabase.from('cxbc_partner_applications')
        .update({ status: 'rejected', rejection_reason: reason, reviewed_at: new Date().toISOString() }).eq('id', application.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Application rejected'); queryClient.invalidateQueries({ queryKey: ['cxbc-applications'] }); setSelectedApplication(null); setShowRejectDialog(false); setRejectionReason(''); },
    onError: (error) => { toast.error('Failed to reject application: ' + error.message); },
  });

  const filteredApplications = applications?.filter((app) =>
    app.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = () => { if (!selectedApplication) return; approveMutation.mutate(selectedApplication); };
  const handleReject = () => { if (!selectedApplication || !rejectionReason.trim()) return; rejectMutation.mutate({ application: selectedApplication, reason: rejectionReason }); };
  const handleCreatePartner = () => {
    if (!createForm.email || !createForm.password || !createForm.businessName || !createForm.ownerName || !createForm.phone || !createForm.panNumber || !createForm.address || !createForm.city || !createForm.state || !createForm.pincode) { toast.error('Please fill in all required fields'); return; }
    createPartnerMutation.mutate(createForm);
  };
  const handleCloseCredentials = () => { setCreatedCredentials(null); setShowCreateDialog(false); setCreateForm(initialFormState); };
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">CXBC Partner Applications</h1>
            <p className="text-gray-400">Review and manage partner applications</p>
          </div>
          <button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all">
            <UserPlus className="h-4 w-4" /> Create Partner
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#16161a] rounded-[2rem] border border-white/5 p-4 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input placeholder="Search by business, owner, email, or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-red-500 focus:outline-none transition-colors" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PartnerStatus | 'all')}>
              <SelectTrigger className="w-full md:w-48 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-[#16161a] border-white/10">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-[#16161a] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
          <div className="p-6 pb-4">
            <h3 className="text-white font-semibold">Partner Applications</h3>
          </div>
          <div className="px-6 pb-6">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div>
            ) : filteredApplications?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No applications found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Business</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Owner</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Zone</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Applied</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications?.map((app) => (
                      <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-white font-medium">{app.business_name}</td>
                        <td className="py-3 px-4 text-gray-300">{app.owner_name}</td>
                        <td className="py-3 px-4 text-gray-400">{app.city}, {app.state}</td>
                        <td className="py-3 px-4 text-gray-400 uppercase">{app.zone}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[app.status]}`}>
                            {app.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">{format(new Date(app.created_at), 'dd MMM yyyy')}</td>
                        <td className="py-3 px-4">
                          <button onClick={() => setSelectedApplication(app)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                            <Eye className="h-4 w-4" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Application Detail Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#16161a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription className="text-gray-400">Review partner application and approve or reject</DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[selectedApplication.status]}`}>{selectedApplication.status.replace('_', ' ')}</span>
                <span className="text-sm text-gray-500">Applied {format(new Date(selectedApplication.created_at), 'dd MMM yyyy HH:mm')}</span>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-white flex items-center gap-2"><Building2 className="h-4 w-4 text-red-500" /> Business Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-500">Business Name</p><p className="text-white font-medium">{selectedApplication.business_name}</p></div>
                  <div><p className="text-gray-500">Owner Name</p><p className="text-white font-medium">{selectedApplication.owner_name}</p></div>
                  <div><p className="text-gray-500">PAN Number</p><p className="text-white font-medium">{selectedApplication.pan_number}</p></div>
                  <div><p className="text-gray-500">GST Number</p><p className="text-white font-medium">{selectedApplication.gst_number || 'Not provided'}</p></div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-white flex items-center gap-2"><Phone className="h-4 w-4 text-red-500" /> Contact</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-300"><Mail className="h-4 w-4 text-gray-500" />{selectedApplication.email}</div>
                  <div className="flex items-center gap-2 text-gray-300"><Phone className="h-4 w-4 text-gray-500" />{selectedApplication.phone}</div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-white flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" /> Location</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>{selectedApplication.address}</p>
                  <p>{selectedApplication.city}, {selectedApplication.state} - {selectedApplication.pincode}</p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-white/10 border border-white/10 text-gray-300 uppercase">{selectedApplication.zone} Zone</span>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-white flex items-center gap-2"><FileText className="h-4 w-4 text-red-500" /> KYC Documents</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedApplication.kyc_pan_url && (
                    <a href={selectedApplication.kyc_pan_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-300 transition-colors">
                      <FileText className="h-4 w-4" /> PAN Card <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {selectedApplication.kyc_aadhaar_url && (
                    <a href={selectedApplication.kyc_aadhaar_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-300 transition-colors">
                      <FileText className="h-4 w-4" /> Aadhaar Card <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {selectedApplication.shop_photo_url && (
                    <a href={selectedApplication.shop_photo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-300 transition-colors">
                      <Building2 className="h-4 w-4" /> Shop Photo <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              {selectedApplication.rejection_reason && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm font-medium text-red-400">Rejection Reason:</p>
                  <p className="text-sm text-gray-300 mt-1">{selectedApplication.rejection_reason}</p>
                </div>
              )}
              {(selectedApplication.status === 'pending' || selectedApplication.status === 'under_review') && (
                <DialogFooter className="gap-2">
                  <button onClick={() => setShowRejectDialog(true)} disabled={rejectMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-gray-300 hover:bg-white/20 transition-colors">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                  <button onClick={handleApprove} disabled={approveMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white bg-green-600 hover:bg-green-700 shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:opacity-40 transition-all">
                    {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve Partner
                  </button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-[#16161a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription className="text-gray-400">Please provide a reason for rejecting this application.</DialogDescription>
          </DialogHeader>
          <textarea placeholder="Enter rejection reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none transition-colors resize-none" />
          <DialogFooter>
            <button onClick={() => setShowRejectDialog(false)} className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-gray-300 hover:bg-white/20 transition-colors">Cancel</button>
            <button onClick={handleReject} disabled={!rejectionReason.trim() || rejectMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-all">
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm Rejection
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Partner Dialog */}
      <Dialog open={showCreateDialog && !createdCredentials} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#16161a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Create New Partner</DialogTitle>
            <DialogDescription className="text-gray-400">Manually create a CXBC partner account with login credentials</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-white border-b border-white/10 pb-2">Login Credentials</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">Email *</Label>
                  <input type="email" placeholder="partner@example.com" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Password *</Label>
                  <input type="text" placeholder="Create a password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none transition-colors" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-white border-b border-white/10 pb-2">Business Information</h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'businessName', label: 'Business Name *', ph: 'Shop / Business Name' },
                  { id: 'ownerName', label: 'Owner Name *', ph: 'Full name of owner' },
                  { id: 'phone', label: 'Phone *', ph: '10-digit mobile number' },
                  { id: 'panNumber', label: 'PAN Number *', ph: 'ABCDE1234F' },
                ].map(({ id, label, ph }) => (
                  <div key={id} className="space-y-2">
                    <Label className="text-gray-400">{label}</Label>
                    <input placeholder={ph} value={(createForm as any)[id]} onChange={(e) => setCreateForm({ ...createForm, [id]: id === 'panNumber' ? e.target.value.toUpperCase() : e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none transition-colors" />
                  </div>
                ))}
                <div className="space-y-2 col-span-2">
                  <Label className="text-gray-400">GST Number (Optional)</Label>
                  <input placeholder="22AAAAA0000A1Z5" value={createForm.gstNumber} onChange={(e) => setCreateForm({ ...createForm, gstNumber: e.target.value.toUpperCase() })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none transition-colors" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-white border-b border-white/10 pb-2">Location Details</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">Address *</Label>
                  <textarea placeholder="Full shop address" value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none transition-colors resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'city', label: 'City *', ph: 'City' },
                    { id: 'state', label: 'State *', ph: 'State' },
                    { id: 'pincode', label: 'Pincode *', ph: '6-digit pincode' },
                  ].map(({ id, label, ph }) => (
                    <div key={id} className="space-y-2">
                      <Label className="text-gray-400">{label}</Label>
                      <input placeholder={ph} value={(createForm as any)[id]} onChange={(e) => setCreateForm({ ...createForm, [id]: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none transition-colors" />
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Label className="text-gray-400">Zone *</Label>
                    <Select value={createForm.zone} onValueChange={(v) => setCreateForm({ ...createForm, zone: v as IndiaZone })}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select zone" /></SelectTrigger>
                      <SelectContent className="bg-[#16161a] border-white/10">
                        {['north', 'south', 'east', 'west', 'central', 'northeast'].map(z => (
                          <SelectItem key={z} value={z} className="capitalize">{z.charAt(0).toUpperCase() + z.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreateDialog(false)} className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-gray-300 hover:bg-white/20 transition-colors">Cancel</button>
            <button onClick={handleCreatePartner} disabled={createPartnerMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-all">
              {createPartnerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create Partner
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Dialog */}
      <Dialog open={!!createdCredentials} onOpenChange={handleCloseCredentials}>
        <DialogContent className="bg-[#16161a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-green-500">
              {createdCredentials?.linkedExisting ? 'Partner Linked Successfully!' : 'Partner Created Successfully!'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {createdCredentials?.linkedExisting
                ? 'This email was already registered. The existing account has been linked as a CXBC partner. The user can log in with their existing password.'
                : 'Share these login credentials with the partner. Make sure to copy them now as the password cannot be retrieved later.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createdCredentials?.linkedExisting && (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-sm">
                <p className="font-medium text-yellow-400">⚠️ Existing User Linked</p>
                <p className="text-gray-400 mt-1">This email already had an account. The password you entered was NOT applied. The user should use their existing password to log in.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-gray-500">Email</Label>
              <div className="flex items-center gap-2">
                <input value={createdCredentials?.email || ''} readOnly className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono" />
                <button onClick={() => copyToClipboard(createdCredentials?.email || '')} className="p-2 rounded-xl bg-white/10 border border-white/10 text-gray-400 hover:text-white hover:bg-white/20 transition-colors"><Copy className="h-4 w-4" /></button>
              </div>
            </div>
            {!createdCredentials?.linkedExisting && (
              <div className="space-y-2">
                <Label className="text-gray-500">Password</Label>
                <div className="flex items-center gap-2">
                  <input value={createdCredentials?.password || ''} readOnly className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono" />
                  <button onClick={() => copyToClipboard(createdCredentials?.password || '')} className="p-2 rounded-xl bg-white/10 border border-white/10 text-gray-400 hover:text-white hover:bg-white/20 transition-colors"><Copy className="h-4 w-4" /></button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><Label className="text-gray-500 text-xs">User ID</Label><p className="font-mono text-xs text-gray-400 truncate">{createdCredentials?.userId}</p></div>
              <div><Label className="text-gray-500 text-xs">Partner ID</Label><p className="font-mono text-xs text-gray-400 truncate">{createdCredentials?.partnerId}</p></div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-sm text-gray-400">Partner can log in at the CXBC Panel using these credentials.</div>
          </div>
          <DialogFooter>
            <button onClick={handleCloseCredentials} className="px-4 py-2 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors">Done</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CXBCPartnerManagement;
