import React, { useEffect, useState } from 'react';
import { Users, Coins, Activity, Clock } from 'lucide-react';

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
    return <div>Loading dashboard...</div>;
  }

  if (!data) {
    return <div>Error loading data.</div>;
  }

  const { stats, users } = data;

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>System Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '12px' }}>
             <Users color="var(--primary)" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Users</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{data.active_users}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16,185,129,0.15)', padding: '12px', borderRadius: '12px' }}>
             <Coins color="var(--success)" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Sales</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>₱{stats.total_sales.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Connected Devices</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Device</th>
              <th>IP / MAC</th>
              <th>Status</th>
              <th>Time Left</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(users).map(mac => {
              const u = users[mac];
              return (
                <tr key={mac}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.device_name || 'Unknown Device'}</div>
                  </td>
                  <td>
                    <div>{u.ip}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mac}</div>
                  </td>
                  <td>
                    <span className={`status-badge status-${u.status}`}>{u.status}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {u.time_formatted}
                  </td>
                  <td>
                    <a href={`/admin/user/${mac}`} className="btn btn-outline btn-sm">Manage</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
