import React, { useEffect, useState } from 'react';
import { Server, Wifi, RefreshCw } from 'lucide-react';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDevices = () => {
    setRefreshing(true);
    fetch('/admin/get_infrastructure_devices')
      .then(res => res.json())
      .then(json => {
        setDevices(json.devices || []);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRename = async (mac, currentName) => {
    const newName = window.prompt(`Enter new name for device ${mac}:`, currentName);
    if (newName !== null && newName !== currentName) {
      try {
        await fetch('/admin/rename_device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mac, name: newName })
        });
        fetchDevices();
      } catch (err) {
        alert('Failed to rename device');
      }
    }
  };

  if (loading) return <div>Loading infrastructure devices...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Network Infrastructure</h2>
        <button className="btn btn-outline btn-sm" onClick={fetchDevices} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? "spin" : ""} /> Refresh
        </button>
      </div>

      <div className="card">
        {devices.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No infrastructure devices detected.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Device Info</th>
                <th>MAC Address</th>
                <th>IP Address</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev, idx) => (
                <tr key={idx}>
                  <td>
                    {dev.IsRouter ? (
                      <span className="status-badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--primary-dark)' }}><Server size={14} style={{ marginRight: '4px' }}/> Gateway</span>
                    ) : (
                      <span className="status-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#059669' }}><Wifi size={14} style={{ marginRight: '4px' }}/> AP / Switch</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{dev.Name || dev.Vendor || 'Unknown Device'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{dev.MAC}</td>
                  <td>{dev.IP}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => handleRename(dev.MAC, dev.Name)}>Rename</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
