import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Package, 
  ClipboardText, 
  Truck,
  Warning,
  Clock,
  CheckCircle,
  DotsThree,
  CurrencyInr,
} from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import { getStatusLabel, getStatusDotColor, getLegLabel } from '@/lib/shipment-lifecycle/statusLabelMap';
import type { ShipmentStatus } from '@/lib/shipment-lifecycle/types';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getStartOfWeek, groupShipmentsByDayOfWeek, type DayOfWeekEntry } from '@/lib/utils/chartUtils';

interface DashboardStats {
  pendingInbound: number;
  pendingQC: number;
  readyToDispatch: number;
  onHold: number;
  todayProcessed: number;
  avgQCTime: string;
  totalRevenue: number;
}

const fallbackChartData: DayOfWeekEntry[] = [
  { name: 'Mon', shipments: 0 },
  { name: 'Tue', shipments: 0 },
  { name: 'Wed', shipments: 0 },
  { name: 'Thu', shipments: 0 },
  { name: 'Fri', shipments: 0 },
  { name: 'Sat', shipments: 0 },
  { name: 'Sun', shipments: 0 },
];

function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [chartData, setChartData] = useState<DayOfWeekEntry[]>(fallbackChartData);
  const [isLoading, setIsLoading] = useState(true);
  const [queueShipments, setQueueShipments] = useState<{ warehouse: any[]; domestic: any[]; international: any[]; delivered: any[] }>({
    warehouse: [], domestic: [], international: [], delivered: [],
  });
  const [activeTab, setActiveTab] = useState('warehouse');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: shipments, error } = await supabase
          .from('shipments')
          .select('*')
          .in('current_leg', ['COUNTER', 'INTERNATIONAL', 'COMPLETED', 'DOMESTIC']);

        if (error) throw error;

        const pendingQC = shipments?.filter(s =>
          s.current_leg === 'COUNTER' &&
          ['BOOKING_CONFIRMED', 'ARRIVED_AT_WAREHOUSE'].includes(s.current_status)
        ).length || 0;

        const readyToDispatch = shipments?.filter(s =>
          s.current_status === 'DISPATCH_APPROVED'
        ).length || 0;

        const onHold = shipments?.filter(s =>
          ['PACKAGED', 'QUALITY_CHECKED'].includes(s.current_status)
        ).length || 0;

        const today = new Date().toISOString().split('T')[0];
        const todayProcessed = shipments?.filter(s =>
          s.updated_at && s.updated_at.startsWith(today) &&
          ['QUALITY_CHECKED', 'PACKAGED', 'DISPATCH_APPROVED', 'DISPATCHED'].includes(s.current_status)
        ).length || 0;

        setStats({
          pendingInbound: 0,
          pendingQC,
          readyToDispatch,
          onHold,
          todayProcessed,
          avgQCTime: '~12 min',
          totalRevenue: shipments?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0,
        });

        // Group shipments by leg for queue tabs, sorted by updated_at desc
        const sortByUpdated = (a: any, b: any) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

        setQueueShipments({
          warehouse: (shipments?.filter(s => s.current_leg === 'COUNTER') || []).sort(sortByUpdated),
          domestic: (shipments?.filter(s => s.current_leg === 'DOMESTIC') || []).sort(sortByUpdated),
          international: (shipments?.filter(s => s.current_leg === 'INTERNATIONAL') || []).sort(sortByUpdated),
          delivered: (shipments?.filter(s => s.current_leg === 'COMPLETED') || []).sort(sortByUpdated),
        });

        const { data: recent } = await supabase
          .from('shipments')
          .select('*')
          .in('current_leg', ['COUNTER', 'INTERNATIONAL', 'COMPLETED', 'DOMESTIC'])
          .order('updated_at', { ascending: false })
          .limit(5);

        // Fetch profiles separately to avoid RLS join issues
        const allShipments = [...(shipments || []), ...(recent || [])];
        const userIds = [...new Set(allShipments.map((s: any) => s.user_id).filter(Boolean))];
        let profileMap: Record<string, { full_name: string | null; email: string | null; phone: string | null }> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone_number')
            .in('id', userIds);
          (profiles || []).forEach((p: any) => {
            profileMap[p.id] = { full_name: p.full_name, email: p.email, phone: p.phone_number };
          });
        }
        const attachProfile = (s: any) => ({ ...s, profiles: profileMap[s.user_id] || null });

        setRecentShipments((recent || []).map(attachProfile));

        // Fetch weekly chart data
        const startOfWeek = getStartOfWeek(new Date());
        const { data: weeklyShipments, error: weeklyError } = await supabase
          .from('shipments')
          .select('created_at')
          .gte('created_at', startOfWeek.toISOString());

        if (!weeklyError && weeklyShipments) {
          setChartData(groupShipmentsByDayOfWeek(weeklyShipments));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    const channel = supabase
      .channel('admin-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: 'current_leg=in.(COUNTER,INTERNATIONAL,COMPLETED,DOMESTIC)',
        },
        (payload) => {
          // Show toast when a shipment transitions to COUNTER (new warehouse arrival)
          if (
            payload.eventType === 'UPDATE' &&
            (payload.new as any)?.current_leg === 'COUNTER' &&
            (payload.old as any)?.current_leg !== 'COUNTER'
          ) {
            toast.info('New shipment arrived at warehouse', {
              description: (payload.new as any)?.tracking_number || 'New arrival',
            });
          }
          fetchDashboardData();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[AdminDashboard] Channel error, will refresh on reconnect');
        }
        if (status === 'SUBSCRIBED') {
          // Re-fetch on reconnection to catch missed events
          fetchDashboardData();
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statCards = [
    { title: 'Pending QC', value: stats?.pendingQC || 0, icon: ClipboardText, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { title: 'Ready to Dispatch', value: stats?.readyToDispatch || 0, icon: Truck, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { title: 'On Hold', value: stats?.onHold || 0, icon: Warning, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  ];

  const queueTabs = [
    { key: 'warehouse', label: 'Warehouse', count: queueShipments.warehouse.length, items: queueShipments.warehouse },
    { key: 'domestic', label: 'Domestic', count: queueShipments.domestic.length, items: queueShipments.domestic },
    { key: 'international', label: 'International', count: queueShipments.international.length, items: queueShipments.international },
    { key: 'delivered', label: 'Delivered', count: queueShipments.delivered.length, items: queueShipments.delivered },
  ];

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6">
        {/* Statistics Chart Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="col-span-1 sm:col-span-12 lg:col-span-7 bg-[#16161a] rounded-2xl sm:rounded-[2rem] border border-white/5 p-4 sm:p-8 relative overflow-hidden shadow-2xl"
        >
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-6">Statistics</h3>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 mb-8">
              {statCards.map((stat) => (
                <div key={stat.title} className="flex flex-col">
                  <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">{stat.title}</span>
                  <span className={`text-2xl font-bold ${stat.title === 'On Hold' ? 'text-red-500' : 'text-white'}`}>
                    {isLoading ? '—' : stat.value}
                  </span>
                </div>
              ))}
            </div>
            {/* Chart */}
            <div className="h-48 sm:h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#16161a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Area type="monotone" dataKey="shipments" stroke="#ef4444" strokeWidth={3} fill="url(#redGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] -z-0 opacity-50" />
        </motion.section>

        {/* Secondary Stats */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="col-span-1 sm:col-span-12 lg:col-span-5 space-y-4 sm:space-y-6"
        >
          {/* Processed Today */}
          <div className="bg-[#16161a] rounded-2xl sm:rounded-[2rem] border border-white/5 p-5 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Today</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-4xl font-black text-white italic">
                  {isLoading ? '—' : stats?.todayProcessed || 0}
                </span>
                <span className="ml-3 text-gray-400 font-medium">Processed</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle size={24} weight="bold" className="text-green-500" />
              </div>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full mt-6 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-[45%] bg-gradient-to-r from-red-600 to-red-400 rounded-full" />
            </div>
          </div>

          {/* Avg QC Time */}
          <div className="bg-[#16161a] rounded-2xl sm:rounded-[2rem] border border-white/5 p-5 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Avg QC Time</p>
                <p className="text-2xl sm:text-3xl font-mono text-gray-300">{stats?.avgQCTime || '--'}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock size={24} weight="bold" className="text-blue-500" />
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-emerald-950/60 to-[#16161a] rounded-2xl sm:rounded-[2rem] border border-emerald-500/20 p-5 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Total Shipment Revenue</p>
                <p className="text-2xl font-mono font-bold text-emerald-400">
                  {isLoading ? '—' : `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CurrencyInr size={24} weight="bold" className="text-emerald-500" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Queue Tabs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
          className="col-span-1 sm:col-span-12 bg-[#16161a] rounded-2xl sm:rounded-[2rem] border border-white/5 p-4 sm:p-8 shadow-2xl"
        >
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Shipment Queues</h3>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
              {queueTabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
                  {tab.label}
                  <Badge variant="secondary" className="ml-2 bg-white/10 text-gray-300 text-xs">
                    {tab.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {queueTabs.map((tab) => (
              <TabsContent key={tab.key} value={tab.key}>
                {isLoading ? (
                  <div className="space-y-3 mt-4">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : tab.items.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={48} weight="bold" className="mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-500">No shipments in this queue</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto">
                    {tab.items.map((shipment: any) => (
                      <div
                        key={shipment.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => window.location.href = `/admin/qc/${shipment.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-white/10">
                            <Package size={20} weight="bold" className="text-gray-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold text-sm">{shipment.tracking_number || 'No tracking'}</h4>
                            <p className="text-gray-500 text-xs">
                              {shipment.recipient_name} • {getLegLabel(shipment.current_leg as any)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusDotColor(shipment.current_status as ShipmentStatus)}`} />
                          <span className="text-white text-xs font-medium">{getStatusLabel(shipment.current_status as ShipmentStatus)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </motion.section>

        {/* Recent Activity */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="col-span-1 sm:col-span-12 lg:col-span-7 bg-[#16161a] rounded-2xl sm:rounded-[2rem] border border-white/5 p-4 sm:p-8 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <DotsThree size={24} weight="bold" className="text-gray-500 cursor-pointer hover:text-white transition-colors" />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} weight="bold" className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500">No shipments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => window.location.href = `/admin/qc/${shipment.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-white/10">
                      <Package size={20} weight="bold" className="text-gray-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm">{shipment.tracking_number || 'No tracking'}</h4>
                      <p className="text-gray-500 text-xs">
                        {shipment.recipient_name} • {shipment.profiles?.full_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor(shipment.current_status as ShipmentStatus)}`} />
                    <span className="text-white text-xs font-medium">{getStatusLabel(shipment.current_status as ShipmentStatus)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Quick Stats Cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="col-span-1 sm:col-span-12 lg:col-span-5 bg-gradient-to-br from-[#16161a] to-[#251515] rounded-2xl sm:rounded-[2rem] border border-white/5 p-4 sm:p-8 shadow-2xl"
        >
          <h3 className="text-xl font-bold text-white mb-6">Quick Stats</h3>
          <div className="space-y-4">
            {statCards.map((stat) => (
              <div key={stat.title} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon size={20} weight="bold" className={stat.color} />
                  </div>
                  <span className="text-gray-400 text-sm font-medium">{stat.title}</span>
                </div>
                <span className="text-white text-xl font-bold">{isLoading ? '—' : stat.value}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-6">
            <button className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-500 font-bold rounded-2xl border border-red-500/30 transition-all text-sm">
              View All
            </button>
            <button className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 transition-all text-sm">
              New Shipment
            </button>
          </div>
        </motion.section>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
