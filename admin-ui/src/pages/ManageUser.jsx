import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, ShieldBan, Trash2, Edit3, Check } from 'lucide-react';

export default function ManageUser() {
  const { mac } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/admin/api/user/${mac}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [mac]);

  const handleAction = async (endpoint, payload) => {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, ...payload })
      });
      if (res.ok) {
        window.location.reload(); // Simple reload for now to get fresh data
      } else {
        alert('Action failed.');
      }
    } catch (err) {
      alert('Error performing action.');
    }
  };

  if (loading) return <div>Loading user details...</div>;
  if (!data || data.error) return <div>User not found.</div>;

  const { user, device_name, time_formatted, history } = data;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Link to="/admin" className="btn btn-outline btn-sm"><ArrowLeft size={16}/> Back</Link>
        <h2 style={{ margin: 0 }}>Manage User</h2>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{device_name || 'Unknown Device'}</div>
          <div style={{ color: 'var(--text-muted)' }}>MAC: {mac}</div>
          <div style={{ color: 'var(--text-muted)' }}>IP: {user.IP}</div>
          <div style={{ marginTop: '10px' }}>
             <span className={`status-badge status-${user.Status}`}>{user.Status}</span>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Time Remaining</div>
           <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{time_formatted}</div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Manage Time</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleAction('/admin/manage_time', Object.fromEntries(formData));
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
               <select name="action" style={{ width: '100px' }}>
                 <option value="add">Add</option>
                 <option value="subtract">Subtract</option>
               </select>
               <input type="number" name="amount" placeholder="Amount" required />
               <select name="unit" style={{ width: '120px' }}>
                 <option value="minutes">Minutes</option>
                 <option value="hours">Hours</option>
                 <option value="days">Days</option>
               </select>
            </div>
            <button type="submit" className="btn btn-primary"><Clock size={16}/> Apply Time</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {user.Status === 'blocked' ? (
              <button className="btn btn-success" onClick={() => handleAction('/admin/unblock', {})}>
                <Check size={16}/> Unblock Device
              </button>
            ) : (
              <button className="btn btn-warning" onClick={() => handleAction('/admin/block', {})}>
                <ShieldBan size={16}/> Block Device
              </button>
            )}
            
            <button className="btn btn-danger" onClick={() => {
              if (window.confirm('Are you sure you want to delete this user?')) {
                handleAction('/admin/delete_user', {}).then(() => window.location.href = '/admin');
              }
            }}>
              <Trash2 size={16}/> Delete User
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Sales History</h3>
        {history && history.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Time Added</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td>{h.DateStr}</td>
                  <td style={{ fontWeight: 600 }}>₱{h.Amount.toFixed(2)}</td>
                  <td>{h.TimeAdded} mins</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>No sales history found for this device.</div>
        )}
      </div>
    </div>
  );
}
