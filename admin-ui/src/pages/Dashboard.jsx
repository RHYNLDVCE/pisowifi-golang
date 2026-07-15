import React, { useEffect, useState } from 'react';
import { Users, Coins, Activity, Clock, Server, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const { stats, users } = data;

  const filteredMacs = Object.keys(users).filter(mac => {
    const u = users[mac];
    const term = searchQuery.toLowerCase();
    return mac.toLowerCase().includes(term) || 
           (u.ip && u.ip.toLowerCase().includes(term)) || 
           (u.device_name && u.device_name.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      
      {/* 6 KPI Cards (Enterprise Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total All Time', value: stats.total, color: 'text-gray-900 dark:text-white', icon: <Coins size={20}/>, iconBg: 'bg-blue-50 text-blue-500 dark:bg-blue-500/10' },
          { label: 'Yesterday', value: stats.yesterday, color: 'text-gray-900 dark:text-white', icon: <Clock size={20}/>, iconBg: 'bg-purple-50 text-purple-500 dark:bg-purple-500/10' },
          { label: 'Today', value: stats.daily, color: 'text-gray-900 dark:text-white', icon: <Activity size={20}/>, iconBg: 'bg-green-50 text-green-500 dark:bg-green-500/10' },
          { label: 'This Week', value: stats.weekly, color: 'text-gray-900 dark:text-white', icon: <Activity size={20}/>, iconBg: 'bg-orange-50 text-orange-500 dark:bg-orange-500/10' },
          { label: 'This Month', value: stats.monthly, color: 'text-gray-900 dark:text-white', icon: <Activity size={20}/>, iconBg: 'bg-red-50 text-red-500 dark:bg-red-500/10' },
          { label: 'This Year', value: stats.yearly, color: 'text-gray-900 dark:text-white', icon: <Activity size={20}/>, iconBg: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
               <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</div>
               <div className={`p-2.5 rounded-xl ${kpi.iconBg}`}>
                 {kpi.icon}
               </div>
            </div>
            <div className={`text-3xl font-bold ${kpi.color}`}>₱{kpi.value ? kpi.value.toFixed(2) : "0.00"}</div>
          </div>
        ))}
      </div>

      {/* Main Table Card (FinTech Style) */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm flex flex-col p-6 mt-8">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Connections</h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
               {data.active_users} Active
            </span>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/50 rounded-xl outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-zinc-700 w-full sm:w-64 transition-all" 
            />
          </div>
        </div>
        
        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="pr-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 w-8">#</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">Device</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">IP / MAC</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">Status</th>
                <th className="pl-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 text-right">Time Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-900/50">
              {filteredMacs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    {searchQuery ? "No matching devices found." : "No active devices connected."}
                  </td>
                </tr>
              ) : (
                filteredMacs.map((mac, idx) => {
                  const u = users[mac];
                  return (
                    <tr key={mac} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/20 transition-colors group cursor-pointer" onClick={() => window.location.href = `/admin/user/${mac}`}>
                      <td className="pr-4 py-4 text-sm font-medium text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">{u.device_name || 'Unknown Device'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{u.ip}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{mac}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.status === 'connected' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' :
                          u.status === 'paused' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                          'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="pl-4 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                           <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{u.time > 0 ? u.time_formatted : '0s'}</div>
                           {u.points > 0 && (
                             <span className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-1 rounded-md text-xs font-bold">
                               ★ {u.points}
                             </span>
                           )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
