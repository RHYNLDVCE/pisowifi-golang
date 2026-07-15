import React, { useEffect, useState } from 'react';
import { Activity, Search, Users } from 'lucide-react';

export default function Connections() {
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
        <span>Loading connections...</span>
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-500">Error loading data.</div>;
  }

  const { users } = data;

  const filteredMacs = Object.keys(users).filter(mac => {
    const u = users[mac];
    const term = searchQuery.toLowerCase();
    return mac.toLowerCase().includes(term) || 
           (u.ip && u.ip.toLowerCase().includes(term)) || 
           (u.device_name && u.device_name.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm flex flex-col p-6">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-500/10 hidden sm:flex">
               <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Connections</h3>
              <div className="text-sm font-medium text-gray-500">Managing live user sessions on the network</div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 ml-2">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
               {data.active_users} Active
            </span>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search MAC, IP, or Name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/50 rounded-xl outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-zinc-700 w-full sm:w-64 transition-all" 
            />
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
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

        {/* Mobile List View */}
        <div className="md:hidden flex flex-col gap-3 mt-2">
          {filteredMacs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
               {searchQuery ? "No matching devices found." : "No active devices connected."}
            </div>
          ) : (
            filteredMacs.map((mac, idx) => {
              const u = users[mac];
              return (
                <div key={mac} onClick={() => window.location.href = `/admin/user/${mac}`} className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-4 flex flex-col gap-3 border border-gray-100 dark:border-zinc-800/50 shadow-sm active:scale-[0.98] transition-transform">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-base">{u.device_name || 'Unknown Device'}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{mac}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                      u.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                    }`}>
                      {u.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-1">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{u.ip}</div>
                    <div className="flex flex-col items-end">
                      <div className="font-bold text-gray-900 dark:text-white text-lg">{u.time > 0 ? u.time_formatted : '0s'}</div>
                      {u.points > 0 && (
                        <div className="text-[10px] text-amber-500 font-bold mt-0.5 uppercase tracking-wider">★ {u.points} pts</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
