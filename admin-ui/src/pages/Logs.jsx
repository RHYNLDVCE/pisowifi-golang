import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Search } from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const logsEndRef = useRef(null);

  useEffect(() => {
    fetch('/admin/api/logs?limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.logs) {
          // If data.logs comes newest-first, we just use it, or if oldest-first we reverse it.
          // Since it used to reverse() to get oldest-first, it means natively it is newest-first.
          setLogs(data.logs);
        }
      });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/admin/ws/logs`;
    
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const log = JSON.parse(event.data);
        setLogs(prev => [log, ...prev].slice(0, 100)); 
      };
    } catch (e) {
      console.error("WebSocket connection failed", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Keep colors strictly monochromatic/minimalist per user request,
  // except for subtle text colors for severe warnings to keep logs readable.
  const getLogColorClass = (type) => {
    switch (type) {
      case 'ERROR': return 'text-red-500 font-bold';
      case 'WARNING': return 'text-amber-500 font-bold';
      case 'SUCCESS': return 'text-green-500 font-bold';
      case 'SECURITY_ALERT': return 'text-red-500 font-bold'; // Changed to red to match security
      default: return 'text-gray-500 dark:text-gray-400 font-semibold';
    }
  };

  const getLogCategory = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('COIN')) return 'Coin';
    if (t.includes('PORTAL')) return 'Portal';
    if (t.includes('ADMIN') || t.includes('LOGIN') || t.includes('LOGOUT') || t.includes('CONFIG') || t.includes('USER') || t.includes('DEVICE') || t.includes('UPDATE')) return 'Admin';
    if (t.includes('SECURITY') || t.includes('FIREWALL') || t.includes('ERROR')) return 'Security';
    return 'System';
  };

  const categories = ['All', 'Coin', 'Portal', 'Admin', 'Security', 'System'];
  
  const filteredLogs = logs.filter(log => {
    // 1. Filter by category
    if (activeFilter !== 'All') {
      if (getLogCategory(log.type) !== activeFilter) return false;
    }
    // 2. Filter by search
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!((log.type || '').toLowerCase().includes(s) || (log.message || '').toLowerCase().includes(s))) {
        return false;
      }
    }
    return true;
  });

  const getCategoryCount = (cat) => {
    if (cat === 'All') return logs.length;
    return logs.filter(l => getLogCategory(l.type) === cat).length;
  };

  const getFilterStyle = (cat, isActive) => {
    if (cat === 'All') return isActive ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20';
    if (cat === 'Coin') return isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-500';
    if (cat === 'Portal') return isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-500';
    if (cat === 'Admin') return isActive ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-500';
    if (cat === 'Security') return isActive ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-500';
    if (cat === 'System') return isActive ? 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-400';
    return '';
  };

  const getFilterDotClass = (cat) => {
    if (cat === 'Coin') return 'bg-green-500';
    if (cat === 'Portal') return 'bg-blue-500';
    if (cat === 'Admin') return 'bg-orange-500';
    if (cat === 'Security') return 'bg-red-500';
    if (cat === 'System') return 'bg-gray-500';
    return '';
  };

  return (
    <div className="max-w-5xl">
      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase shrink-0">Filter:</span>
          <div className="flex items-center gap-2">
            {categories.map(cat => {
              const isActive = activeFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${getFilterStyle(cat, isActive)}`}
                >
                  {cat !== 'All' && (
                    <span className={`w-1.5 h-1.5 rounded-full ${getFilterDotClass(cat)}`}></span>
                  )}
                  {cat}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive && cat === 'All' ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'}`}>
                    {getCategoryCount(cat)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative shrink-0 md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-full text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-black sm:border border-gray-200 dark:border-zinc-800 sm:rounded-md sm:shadow-sm overflow-hidden flex flex-col -mx-6 sm:mx-0 border-y sm:border-t-0">
        <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-2">
          {/* Grayscale terminal dots to match the chromatic theme */}
          <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-zinc-700"></div>
          <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-zinc-600"></div>
          <div className="w-3 h-3 rounded-full bg-gray-500 dark:bg-zinc-500"></div>
          <div className="ml-3 text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase">Live Terminal</div>
        </div>

        <div className="h-[600px] overflow-y-auto p-2 sm:p-4 bg-gray-50 dark:bg-zinc-950 font-mono text-[10px] sm:text-sm leading-relaxed">
          {filteredLogs.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500 italic">No logs found matching filters.</div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:gap-4 mb-2 sm:mb-1.5 hover:bg-white dark:hover:bg-zinc-900 px-1 sm:px-2 py-0.5 rounded transition-colors border-b border-gray-200 dark:border-zinc-800 sm:border-0 pb-1 sm:pb-0">
                <div className="flex gap-2 sm:gap-4">
                  <span className="text-gray-400 dark:text-gray-500 shrink-0 sm:w-40">[{log.timestamp}]</span>
                  <span className={`shrink-0 sm:w-24 ${getLogColorClass(log.type)}`}>[{log.type}]</span>
                </div>
                <span className="text-gray-800 dark:text-gray-200 break-words mt-0.5 sm:mt-0">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
