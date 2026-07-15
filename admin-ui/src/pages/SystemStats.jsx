import React, { useEffect, useState, useRef } from 'react';
import { Cpu, MemoryStick, HardDrive, Network, Timer, ArrowDownToLine, ArrowUpToLine, Usb, ArrowRightLeft } from 'lucide-react';

export default function SystemStats() {
  const [stats, setStats] = useState({
    cpu: '0', temp: '--',
    ram: '0', ram_used: '0', ram_total: '0',
    disk: '0', disk_free: '0',
    uptime: '--',
    ips: 'Loading...',
    interfaces: null,
    wan_rx_total: 0,
    wan_tx_total: 0
  });

  const [speeds, setSpeeds] = useState({ rx: 0, tx: 0 });
  const lastState = useRef({ rx: 0, tx: 0, time: Date.now() });

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use window.location.host, but fallback to localhost:8080 during dev if needed
    const host = process.env.NODE_ENV === 'development' ? 'localhost:8080' : window.location.host;
    const wsUrl = `${protocol}//${host}/admin/ws/system_stats`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStats(prev => ({ ...prev, ...data }));
        
        const now = Date.now();
        const timeDiff = (now - lastState.current.time) / 1000;
        
        if (timeDiff > 0 && data.interfaces) {
          if (lastState.current.rx > 0 && data.wan_rx_total !== undefined) {
             const rxSpeed = Math.max(0, (data.wan_rx_total - lastState.current.rx) / timeDiff);
             const txSpeed = Math.max(0, (data.wan_tx_total - lastState.current.tx) / timeDiff);
             setSpeeds({ rx: rxSpeed, tx: txSpeed });
          }
        }
        
        lastState.current = {
           rx: data.wan_rx_total || lastState.current.rx,
           tx: data.wan_tx_total || lastState.current.tx,
           time: now
        };
      } catch (err) {
        console.error("Error parsing WS data", err);
      }
    };

    return () => ws.close();
  }, []);

  const formatSpeed = (bytesPerSec) => {
    if (bytesPerSec === 0 || isNaN(bytesPerSec)) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-5xl space-y-6">
      <h2 className="text-2xl font-bold mb-6">Realtime System Status</h2>

      {/* Network Flow Panel */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6">Network Flow</h3>
        <div className="flex flex-col md:flex-row items-center gap-4 bg-gray-50 dark:bg-zinc-900/50 p-6 rounded-md border border-gray-200 dark:border-zinc-800 relative overflow-hidden">
           
           {/* Background Grid Pattern */}
           <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
           
           {/* WAN Node */}
           <div className="flex-1 w-full flex items-center gap-4 relative z-10">
             <div className="w-14 h-14 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md flex items-center justify-center shrink-0 shadow-sm">
               <Usb size={28} className="text-blue-500" />
             </div>
             <div>
               <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">WAN Access</div>
               <div className="flex gap-4">
                 <div className="flex items-center gap-1.5 text-green-500 font-mono text-sm font-bold">
                   <ArrowDownToLine size={16} /> {formatSpeed(speeds.rx)}
                 </div>
                 <div className="flex items-center gap-1.5 text-amber-500 font-mono text-sm font-bold">
                   <ArrowUpToLine size={16} /> {formatSpeed(speeds.tx)}
                 </div>
               </div>
             </div>
           </div>

           <div className="hidden md:flex shrink-0 px-4 relative z-10 text-gray-300 dark:text-zinc-700">
              <ArrowRightLeft size={24} />
           </div>

           {/* LAN Node Placeholder */}
           <div className="flex-1 w-full flex items-center gap-4 relative z-10">
             <div className="w-14 h-14 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md flex items-center justify-center shrink-0 shadow-sm">
               <Usb size={28} className="text-emerald-500" />
             </div>
             <div>
               <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">LAN Router</div>
               <div className="text-xs text-gray-400 font-medium">Traffic distributed to users</div>
             </div>
           </div>
        </div>
      </div>

      {/* Hardware Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-md"></div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <Cpu size={16} className="text-blue-500" /> 
            <span className="text-sm font-bold uppercase tracking-widest">CPU Load</span>
          </div>
          <div className="text-3xl font-black mb-1">{stats.cpu}%</div>
          <div className="text-xs font-bold text-gray-500">Temp: {stats.temp}°C</div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l-md"></div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <MemoryStick size={16} className="text-purple-500" /> 
            <span className="text-sm font-bold uppercase tracking-widest">Memory</span>
          </div>
          <div className="text-3xl font-black mb-1">{stats.ram}%</div>
          <div className="text-xs font-bold text-gray-500">Used: {stats.ram_used}GB / Total: {stats.ram_total}GB</div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-md"></div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <HardDrive size={16} className="text-amber-500" /> 
            <span className="text-sm font-bold uppercase tracking-widest">Storage</span>
          </div>
          <div className="text-3xl font-black mb-1">{stats.disk}%</div>
          <div className="text-xs font-bold text-gray-500">Free: {stats.disk_free}GB</div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 relative overflow-hidden group lg:col-span-2">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-md"></div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <Network size={16} className="text-emerald-500" /> 
            <span className="text-sm font-bold uppercase tracking-widest">IP Addresses</span>
          </div>
          <div className="text-lg font-mono font-bold mb-1 break-all text-gray-900 dark:text-white leading-relaxed">{stats.ips}</div>
          <div className="text-xs font-bold text-gray-500">Local Network</div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-l-md"></div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <Timer size={16} className="text-cyan-500" /> 
            <span className="text-sm font-bold uppercase tracking-widest">Uptime</span>
          </div>
          <div className="text-xl sm:text-2xl font-black mb-1 truncate">{stats.uptime}</div>
          <div className="text-xs font-bold text-gray-500">Since Last Boot</div>
        </div>

      </div>
    </div>
  );
}
