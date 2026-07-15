import React, { useEffect, useState } from 'react';
import { Users, Coins, Activity, Clock, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/api/dashboard_data')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch dashboard data", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <Activity className="animate-spin w-8 h-8 mr-3" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-500">Error loading data.</div>;
  }

  const { stats } = data;

  return (
    <div className="space-y-6">
      
      {/* 6 KPI Cards (Enterprise Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total All Time', value: stats.total, color: 'text-gray-900 dark:text-white', icon: <Coins size={20}/>, iconBg: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10' },
          { label: 'Yesterday', value: stats.yesterday, color: 'text-gray-900 dark:text-white', icon: <Clock size={20}/>, iconBg: 'bg-purple-50 text-purple-500 dark:bg-purple-500/10' },
          { label: 'Today', value: stats.daily, color: 'text-gray-900 dark:text-white', icon: <Activity size={20}/>, iconBg: 'bg-green-50 text-green-500 dark:bg-green-500/10', compareTo: stats.yesterday },
          { label: 'This Week', value: stats.weekly, color: 'text-gray-900 dark:text-white', icon: <Activity size={20}/>, iconBg: 'bg-orange-50 text-orange-500 dark:bg-orange-500/10' },
          { label: 'This Month', value: stats.monthly, color: 'text-gray-900 dark:text-white', icon: <Activity size={20}/>, iconBg: 'bg-red-50 text-red-500 dark:bg-red-500/10' },
          { label: 'This Year', value: stats.yearly, color: 'text-gray-900 dark:text-white', icon: <Activity size={20}/>, iconBg: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10' },
        ].map((kpi, idx) => {
          let trend = null;
          if (kpi.compareTo !== undefined) {
             const diff = (kpi.value || 0) - (kpi.compareTo || 0);
             const pct = kpi.compareTo > 0 ? (diff / kpi.compareTo) * 100 : ((kpi.value || 0) > 0 ? 100 : 0);
             const isUp = diff >= 0;
             trend = (
               <div className={`flex items-center gap-1 text-xs font-bold mt-3 ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                 {isUp ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                 <span>{Math.abs(pct).toFixed(1)}% vs yesterday</span>
               </div>
             );
          }
          return (
          <div key={idx} className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
               <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</div>
               <div className={`p-2.5 rounded-xl ${kpi.iconBg}`}>
                 {kpi.icon}
               </div>
            </div>
            <div>
              <div className={`text-3xl font-bold ${kpi.color}`}>₱{kpi.value ? kpi.value.toFixed(2) : "0.00"}</div>
              {trend}
            </div>
          </div>
        )})}
      </div>

      {/* Revenue Graph */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm flex flex-col p-6 mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <BarChart2 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Revenue Overview</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">Income over the last 7 days</div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.chart_data || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(value) => `₱${value}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-white)' }}
                itemStyle={{ color: '#111827', fontWeight: 'bold' }}
                formatter={(value) => [`₱${value}`, 'Income']}
              />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
