import React, { useEffect, useState, useRef } from 'react';
import { Terminal } from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    // Initial fetch to get history
    fetch('/admin/api/logs?limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.logs) {
          setLogs(data.logs.reverse());
        }
      });

    // Setup WebSocket for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/admin/ws/logs`;
    
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const log = JSON.parse(event.data);
        setLogs(prev => [...prev, log].slice(-200)); // Keep last 200 logs
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

  const getLogColor = (type) => {
    switch (type) {
      case 'ERROR': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      case 'SUCCESS': return '#10b981';
      case 'SECURITY_ALERT': return '#ec4899';
      default: return '#94a3b8';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Terminal size={24} color="var(--primary)" />
        <h2 style={{ margin: 0 }}>System Logs</h2>
      </div>

      <div className="card" style={{ background: '#0f172a', padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
          <div style={{ marginLeft: '10px', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>LIVE TERMINAL FEED</div>
        </div>

        <div style={{ 
          height: '600px', overflowY: 'auto', padding: '16px', 
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '0.85rem', lineHeight: '1.5'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#475569' }}>Waiting for system events...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '4px', display: 'flex', gap: '12px' }}>
                <span style={{ color: '#64748b', minWidth: '160px' }}>[{log.timestamp}]</span>
                <span style={{ color: getLogColor(log.type), minWidth: '80px', fontWeight: 600 }}>[{log.type}]</span>
                <span style={{ color: '#e2e8f0' }}>{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
