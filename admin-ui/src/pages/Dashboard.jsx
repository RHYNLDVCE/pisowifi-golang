import React, { useEffect, useState } from 'react';
import { Users, Coins, Activity, Clock, Server } from 'lucide-react';
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stat Card 1 */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-zinc-900 flex items-center justify-center">
             <Users className="w-6 h-6 text-black dark:text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Users</div>
            <div className="text-3xl font-black mt-1">{data.active_users}</div>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-zinc-900 flex items-center justify-center">
             <Coins className="w-6 h-6 text-black dark:text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Sales</div>
            <div className="text-3xl font-black mt-1">₱{stats.total ? stats.total.toFixed(2) : "0.00"}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800">
          <h3 className="text-lg font-bold">Connected Devices</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP / MAC</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time Left</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {Object.keys(users).length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No active devices connected.
                  </td>
                </tr>
              ) : (
                Object.keys(users).map(mac => {
                  const u = users[mac];
                  return (
                    <tr key={mac} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm">{u.device_name || 'Unknown Device'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{u.ip}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{mac}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                          u.status === 'connected' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                          u.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                          'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'connected' ? 'bg-green-600 dark:bg-green-400' :
                            u.status === 'paused' ? 'bg-amber-600 dark:bg-amber-400' :
                            'bg-red-600 dark:bg-red-400'
                          }`}></span>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm font-mono">{u.time_formatted}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/admin/user/${mac}`} 
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Manage
                        </Link>
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
