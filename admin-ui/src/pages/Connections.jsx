import React, { useEffect, useState } from 'react';
import { Activity, Search, Users, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';

export default function Connections() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'status';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const setSearchQuery = (val) => {
    setSearchParams(prev => {
      prev.set('page', '1');
      if (val) prev.set('q', val);
      else prev.delete('q');
      return prev;
    }, { replace: true });
  };

  const setSortBy = (val) => {
    setSearchParams(prev => {
      prev.set('page', '1');
      if (val !== 'status') prev.set('sort', val);
      else prev.delete('sort');
      return prev;
    }, { replace: true });
  };

  const setCurrentPage = (val) => {
    setSearchParams(prev => {
      prev.set('page', val.toString());
      return prev;
    }, { replace: true });
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', currentPage);
      params.set('sort', sortBy);
      
      fetch(`/admin/api/dashboard_data?${params.toString()}`)
        .then(res => res.json())
        .then(json => {
          setData(json);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch dashboard data", err);
          setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, sortBy, currentPage]);

  if (loading && !data) {
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

  const { users, total_pages, current_page, total_filtered, total_users, active_users } = data;

  const statusOrder = { connected: 1, paused: 2, expired: 3, new: 4 };
  const getStatusWeight = (status) => statusOrder[status?.toLowerCase()] || 5;

  // The backend already filtered and paginated the data, so we only have ~10 users here.
  // We still need to sort them because JS objects (users map) don't guarantee key order.
  const displayMacs = Object.keys(users).sort((a, b) => {
    const ua = users[a];
    const ub = users[b];
    if (sortBy === 'status') {
      const weightA = getStatusWeight(ua.status);
      const weightB = getStatusWeight(ub.status);
      if (weightA !== weightB) return weightA - weightB;
      return (ub.time || 0) - (ua.time || 0);
    }
    if (sortBy === 'points') {
      return (ub.points || 0) - (ua.points || 0);
    }
    return (ub.time || 0) - (ua.time || 0);
  });

  const ITEMS_PER_PAGE = 10;
  // Ensure total_filtered falls back safely
  const totalItems = total_filtered !== undefined ? total_filtered : total_users;
  const safeTotalPages = total_pages || 1;
  const safeCurrentPage = current_page || 1;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm flex flex-col p-6">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-500/10 hidden sm:flex">
               <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Active Connections</h3>
              <div className="text-sm font-medium text-gray-500">Managing live user sessions on the network</div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 ml-2 shrink-0 whitespace-nowrap">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
               {active_users} Active
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              options={[
                { value: 'status', label: 'Order by Status' },
                { value: 'time', label: 'Order by Time' },
                { value: 'points', label: 'Order by Points' }
              ]}
              className="w-full sm:w-48"
            />
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
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 bg-white dark:bg-zinc-950 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="pr-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 w-8">#</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">Device</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">IP / MAC</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">Status</th>
                <th className="pl-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 text-right">Time Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-900/50">
              {displayMacs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    {searchQuery ? "No matching devices found." : "No active devices connected."}
                  </td>
                </tr>
              ) : (
                displayMacs.map((mac, idx) => {
                  const u = users[mac];
                  const absoluteIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  return (
                    <tr key={mac} className={`transition-colors group cursor-pointer ${
                      u.status === 'connected' ? 'bg-green-50/50 dark:bg-green-500/5 hover:bg-green-100/50 dark:hover:bg-green-500/10' :
                      u.status === 'paused' ? 'bg-amber-50/50 dark:bg-amber-500/5 hover:bg-amber-100/50 dark:hover:bg-amber-500/10' :
                      'hover:bg-gray-50/50 dark:hover:bg-zinc-900/20'
                    }`} onClick={() => navigate(`/admin/user/${mac}`)}>
                      <td className="pr-4 py-4 text-sm font-medium text-gray-400">
                        {absoluteIdx}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">{u.device_name || 'Unknown Device'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{u.ip}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{mac}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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

        {/* Mobile List View (Flat, Edge-to-Edge) */}
        <div className="md:hidden flex flex-col -mx-4 mt-4 border-t border-gray-100 dark:border-zinc-800">
          {displayMacs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
               {searchQuery ? "No matching devices found." : "No active devices connected."}
            </div>
          ) : (
            displayMacs.map((mac, idx) => {
              const u = users[mac];
              const absoluteIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE + idx + 1;
              return (
                <div key={mac} onClick={() => navigate(`/admin/user/${mac}`)} className={`flex flex-col py-3 px-6 border-b border-gray-100 dark:border-zinc-800/50 transition-colors cursor-pointer ${
                  u.status === 'connected' ? 'bg-green-50/50 dark:bg-green-500/5 active:bg-green-100/50 dark:active:bg-green-500/10' :
                  u.status === 'paused' ? 'bg-amber-50/50 dark:bg-amber-500/5 active:bg-amber-100/50 dark:active:bg-amber-500/10' :
                  'active:bg-gray-50 dark:active:bg-zinc-900'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="text-gray-400 font-medium text-xs">{absoluteIdx}.</div>
                      <div className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight truncate max-w-[160px]">{u.device_name || 'Unknown Device'}</div>
                    </div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                      u.status === 'connected' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' :
                      u.status === 'paused' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' :
                      'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
                    }`}>
                      {u.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-1.5 pl-[22px]">
                    <div className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{u.ip}</div>
                    <div className="flex items-center gap-2">
                      {u.points > 0 && (
                        <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">★ {u.points}</div>
                      )}
                      <div className="font-bold text-gray-900 dark:text-gray-100 text-[15px]">{u.time > 0 ? u.time_formatted : '0s'}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 dark:border-zinc-800/50 pt-4 mt-4 gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{totalItems > 0 ? (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(safeCurrentPage * ITEMS_PER_PAGE, totalItems)}</span> of <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
              Page {safeCurrentPage} of {safeTotalPages}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(safeTotalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage >= safeTotalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
