import React, { useEffect, useState, useRef } from 'react';
import { Terminal } from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    fetch('/admin/api/logs?limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.logs) {
          setLogs(data.logs.reverse());
        }
      });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/admin/ws/logs`;
    
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const log = JSON.parse(event.data);
        setLogs(prev => [...prev, log].slice(-200)); 
      };
    } catch (e) {
      console.error("WebSocket connection failed", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Keep colors strictly monochromatic/minimalist per user request,
  // except for subtle text colors for severe warnings to keep logs readable.
  const getLogColorClass = (type) => {
    switch (type) {
      case 'ERROR': return 'text-red-500 font-bold';
      case 'WARNING': return 'text-amber-500 font-bold';
      case 'SUCCESS': return 'text-green-500 font-bold';
      case 'SECURITY_ALERT': return 'text-fuchsia-500 font-bold';
      default: return 'text-gray-500 dark:text-gray-400 font-semibold';
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Terminal size={28} className="text-black dark:text-white" />
        <h2 className="text-2xl font-bold">System Logs</h2>
      </div>

      <div className="bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-2">
          {/* Grayscale terminal dots to match the chromatic theme */}
          <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-zinc-700"></div>
          <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-zinc-600"></div>
          <div className="w-3 h-3 rounded-full bg-gray-500 dark:bg-zinc-500"></div>
          <div className="ml-3 text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest uppercase">Live Terminal</div>
        </div>

        <div className="h-[600px] overflow-y-auto p-2 sm:p-4 bg-gray-50 dark:bg-zinc-950 font-mono text-[10px] sm:text-sm leading-relaxed">
          {logs.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500 italic">Waiting for system events...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:gap-4 mb-2 sm:mb-1.5 hover:bg-white dark:hover:bg-zinc-900 px-1 sm:px-2 py-0.5 rounded transition-colors border-b border-gray-200 dark:border-zinc-800 sm:border-0 pb-1 sm:pb-0">
                <div className="flex gap-2 sm:gap-4">
                  <span className="text-gray-400 dark:text-gray-500 shrink-0 sm:w-40">[{log.timestamp}]</span>
                  <span className={`shrink-0 sm:w-24 ${getLogColorClass(log.type)}`}>[{log.type}]</span>
                </div>
                <span className="text-gray-800 dark:text-gray-200 break-words mt-0.5 sm:mt-0">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
