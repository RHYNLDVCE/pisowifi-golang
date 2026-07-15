import React, { useEffect, useState } from 'react';
import { Users, Coins, Activity, Clock, Server, Search } from 'lucide-react';
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

  const { stats, users } = data;

  return (
    <div className="space-y-6">
      
      {/* 6 KPI Cards (Enterprise Style) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'All Time', value: stats.total, color: 'text-green-600 dark:text-green-500' },
          { label: 'Yesterday', value: stats.yesterday, color: 'text-gray-900 dark:text-white' },
          { label: 'Today', value: stats.daily, color: 'text-gray-900 dark:text-white' },
          { label: 'This Week', value: stats.weekly, color: 'text-gray-900 dark:text-white' },
          { label: 'This Month', value: stats.monthly, color: 'text-gray-900 dark:text-white' },
          { label: 'This Year', value: stats.yearly, color: 'text-gray-900 dark:text-white' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md p-4 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">{kpi.label}</div>
            <div className={`text-xl md:text-2xl font-black ${kpi.color}`}>₱{kpi.value ? kpi.value.toFixed(2) : "0.00"}</div>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800 flex flex-wrap gap-4 justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold">Connections</h3>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/30">
               <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
               {data.active_users} Active
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search MAC address..." className="pl-9 pr-4 py-1.5 text-sm bg-white dark:bg-black border border-gray-300 dark:border-zinc-700 rounded outline-none focus:ring-1 focus:ring-black dark:focus:ring-white w-full sm:w-64" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800">
                <th className="px-3 sm:px-5 py-2 sm:py-3 text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-white dark:bg-zinc-950 whitespace-nowrap">Device</th>
                <th className="px-3 sm:px-5 py-2 sm:py-3 text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-white dark:bg-zinc-950 whitespace-nowrap">IP / MAC</th>
                <th className="px-3 sm:px-5 py-2 sm:py-3 text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-white dark:bg-zinc-950 whitespace-nowrap">Status</th>
                <th className="px-3 sm:px-5 py-2 sm:py-3 text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-white dark:bg-zinc-950 whitespace-nowrap">Time Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {Object.keys(users).length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    No active devices connected.
                  </td>
                </tr>
              ) : (
                Object.keys(users).map(mac => {
                  const u = users[mac];
                  return (
                    <tr key={mac} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/admin/user/${mac}`}>
                      <td className="px-3 sm:px-5 py-2 sm:py-3">
                        <div className="font-semibold text-[11px] sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">{u.device_name || 'Unknown Device'}</div>
                      </td>
                      <td className="px-3 sm:px-5 py-2 sm:py-3">
                        <div className="text-[11px] sm:text-sm font-medium whitespace-nowrap">{u.ip}</div>
                        <div className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5 whitespace-nowrap">{mac}</div>
                      </td>
                      <td className="px-3 sm:px-5 py-2 sm:py-3">
                        <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                          u.status === 'connected' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                          u.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                          'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                        }`}>
                          <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                            u.status === 'connected' ? 'bg-green-600 dark:bg-green-400' :
                            u.status === 'paused' ? 'bg-amber-600 dark:bg-amber-400' :
                            'bg-red-600 dark:bg-red-400'
                          }`}></span>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-2 sm:py-3">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                           <div className="font-semibold text-[11px] sm:text-sm font-mono whitespace-nowrap">{u.time > 0 ? u.time_formatted : '0s'}</div>
                           {u.points > 0 && (
                             <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold border border-amber-200 dark:border-amber-500/30 whitespace-nowrap">
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
