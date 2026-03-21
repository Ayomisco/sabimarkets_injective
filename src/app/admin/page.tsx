"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, DollarSign, Activity, Eye, TrendingUp, TrendingDown, Wallet, Globe, LogOut, Settings } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AnalyticsData {
  overview: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    totalOrders: number;
    ordersInPeriod: number;
    totalVolume: number;
    avgOrderSize: number;
    successRate: number;
    totalViews: number;
  };
  topMarketsByViews: Array<{
    marketId: string;
    marketTitle: string | null;
    _count: { marketId: number };
  }>;
  topMarketsByVolume: Array<{
    marketId: string;
    marketTitle: string | null;
    _sum: { amount: number | null };
    _count: { marketId: number };
  }>;
  recentOrders: Array<{
    id: string;
    marketTitle: string | null;
    amount: number;
    outcome: string;
    price: number;
    status: string;
    createdAt: string;
    user: { walletAddress: string };
  }>;
  languageStats: Array<{
    language: string | null;
    _count: { language: number };
  }>;
  providerStats: Array<{
    provider: string | null;
    _count: { provider: number };
  }>;
  dailyTrend: Array<{
    date: string;
    users: number;
    orders: number;
    volume: number;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [days, setDays] = useState(7);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth/me');
        if (res.ok) {
          const data = await res.json();
          setAdmin(data.admin);
        } else {
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      }
      setAuthChecking(false);
    };

    checkAuth();
  }, [router]);

  // Fetch analytics data
  useEffect(() => {
    if (!admin) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/stats?days=${days}`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [admin, days]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#080706] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D26A] mx-auto mb-4"></div>
          <p className="text-[#7A7068]">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#080706] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D26A] mx-auto mb-4"></div>
          <p className="text-[#7A7068]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const { overview, topMarketsByViews, topMarketsByVolume, recentOrders, languageStats, providerStats, dailyTrend } = data;

  return (
    <div className="min-h-screen bg-[#080706] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#080706]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[#7A7068] hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              {admin && (
                <p className="text-xs text-[#7A7068]">
                  {admin.name || admin.email} • {admin.role}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-[#0F0D0B] border border-white/[0.1] rounded-lg px-3 py-1.5 text-sm">
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0F0D0B] border border-white/[0.1] rounded-lg text-sm hover:bg-white/[0.05] transition-colors"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0F0D0B] border border-white/[0.1] rounded-lg text-sm hover:bg-white/[0.05] transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users size={20} />}
            label="Total Users"
            value={overview.totalUsers.toLocaleString()}
            subValue={`${overview.newUsers} new`}
            trend="up"
          />
          <StatCard
            icon={<Activity size={20} />}
            label="Active Users"
            value={overview.activeUsers.toLocaleString()}
            subValue={`${days} days`}
          />
          <StatCard
            icon={<DollarSign size={20} />}
            label="Total Volume"
            value={`$${overview.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subValue={`${overview.ordersInPeriod} orders`}
            trend="up"
          />
          <StatCard
            icon={<Eye size={20} />}
            label="Market Views"
            value={overview.totalViews.toLocaleString()}
            subValue={`${overview.successRate.toFixed(1)}% fill rate`}
          />
        </div>

        {/* Daily Trend Chart */}
        <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-6">Daily Trend</h2>
          <div className="space-y-4">
            {dailyTrend.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-[#7A7068]">{day.date}</div>
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#7A7068]">Users: {day.users}</span>
                    </div>
                    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00D26A]"
                        style={{ width: `${(day.users / Math.max(...dailyTrend.map(d => d.users), 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#7A7068]">Volume: ${day.volume.toFixed(0)}</span>
                    </div>
                    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00D26A]"
                        style={{ width: `${(day.volume / Math.max(...dailyTrend.map(d => d.volume), 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Top Markets by Views */}
          <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Top Markets by Views</h2>
            <div className="space-y-3">
              {topMarketsByViews.slice(0, 10).map((market, i) => (
                <div key={market.marketId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm text-[#7A7068] w-5">{i + 1}</span>
                    <span className="text-sm truncate">{market.marketTitle || market.marketId.slice(0, 20)}</span>
                  </div>
                  <span className="text-sm font-mono text-[#00D26A]">{market._count.marketId} views</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Markets by Volume */}
          <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Top Markets by Volume</h2>
            <div className="space-y-3">
              {topMarketsByVolume.slice(0, 10).map((market, i) => (
                <div key={market.marketId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm text-[#7A7068] w-5">{i + 1}</span>
                    <span className="text-sm truncate">{market.marketTitle || market.marketId.slice(0, 20)}</span>
                  </div>
                  <span className="text-sm font-mono text-[#00D26A]">${market._sum.amount?.toFixed(0) || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Language Stats */}
          <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Globe size={18} /> Languages
            </h2>
            <div className="space-y-3">
              {languageStats.map((lang) => (
                <div key={lang.language} className="flex items-center justify-between">
                  <span className="text-sm">{lang.language || 'Unknown'}</span>
                  <span className="text-sm font-mono text-[#00D26A]">{lang._count.language} users</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wallet Providers */}
          <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Wallet size={18} /> Wallet Providers
            </h2>
            <div className="space-y-3">
              {providerStats.map((prov) => (
                <div key={prov.provider} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{prov.provider || 'Unknown'}</span>
                  <span className="text-sm font-mono text-[#00D26A]">{prov._count.provider} users</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="text-left py-3 px-2 font-medium text-[#7A7068]">Market</th>
                  <th className="text-left py-3 px-2 font-medium text-[#7A7068]">User</th>
                  <th className="text-left py-3 px-2 font-medium text-[#7A7068]">Outcome</th>
                  <th className="text-right py-3 px-2 font-medium text-[#7A7068]">Amount</th>
                  <th className="text-right py-3 px-2 font-medium text-[#7A7068]">Price</th>
                  <th className="text-center py-3 px-2 font-medium text-[#7A7068]">Status</th>
                  <th className="text-right py-3 px-2 font-medium text-[#7A7068]">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="py-3 px-2 max-w-[200px] truncate">{order.marketTitle || 'Unknown Market'}</td>
                    <td className="py-3 px-2 font-mono text-xs">{order.user.walletAddress.slice(0, 6)}...{order.user.walletAddress.slice(-4)}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${order.outcome === 'YES' ? 'bg-[#00D26A]/10 text-[#00D26A]' : 'bg-red-500/10 text-red-400'}`}>
                        {order.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono">${order.amount.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-mono">{(order.price * 100).toFixed(1)}¢</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        order.status === 'filled' ? 'bg-[#00D26A]/10 text-[#00D26A]' :
                        order.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                        order.status === 'cancelled' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-white/5 text-[#7A7068]'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-[#7A7068] text-xs">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#7A7068] text-sm">{label}</span>
        <span className="text-[#00D26A]">{icon}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subValue && (
        <div className="flex items-center gap-1.5 text-xs text-[#7A7068]">
          {trend === 'up' && <TrendingUp size={12} className="text-[#00D26A]" />}
          {trend === 'down' && <TrendingDown size={12} className="text-red-400" />}
          <span>{subValue}</span>
        </div>
      )}
    </div>
  );
}
