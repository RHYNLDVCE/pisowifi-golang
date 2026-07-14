import React, { useEffect, useState } from 'react';

export default function GlobalSettings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/admin/api/dashboard_data')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    // Checkboxes only appear in FormData if checked, so handle toggles explicitly
    payload.speed_limit_toggle = formData.get('speed_limit_toggle') ? 'on' : '';
    payload.gaming_mode = formData.get('gaming_mode') ? 'on' : '';
    payload.free_time_toggle = formData.get('free_time_toggle') ? 'on' : '';
    payload.auto_pause = formData.get('auto_pause') ? 'on' : '';

    try {
      const res = await fetch('/admin/update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings.');
      }
    } catch (err) {
      alert('Error saving settings.');
    }
    setSaving(false);
  };

  if (loading) return <div>Loading settings...</div>;
  if (!data) return <div>Error loading settings.</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Global Settings</h2>
      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Network & Timeouts</h3>
          <div className="settings-grid">
            <div className="input-group">
              <label>Coin Slot Timeout (Seconds)</label>
              <input type="number" name="timeout" defaultValue={data.slot_timeout} />
            </div>
            <div className="input-group">
              <label>Inactive Disconnect Timeout (Seconds)</label>
              <input type="number" name="inactive_timeout" defaultValue={data.inactive_timeout} />
            </div>
            <div className="input-group">
              <label>Global Speed Limit (Mbps)</label>
              <input type="number" name="speed_limit_val" defaultValue={data.global_speed_limit} />
            </div>
            <div className="input-group">
              <label>Coin Rates (e.g. 1:10,5:60)</label>
              <input type="text" name="coin_rates" defaultValue={data.coin_rates} />
            </div>
          </div>
          
          <h3 style={{ marginTop: '20px', marginBottom: '16px' }}>Features</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" name="speed_limit_toggle" defaultChecked={data.speed_limit_enabled} />
              Enable Speed Limits
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" name="auto_pause" defaultChecked={data.auto_pause_enabled} />
              Enable Auto-Pause
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" name="gaming_mode" defaultChecked={data.gaming_mode_enabled} />
              Gaming Mode (Anti-Bufferbloat)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" name="free_time_toggle" defaultChecked={data.free_time_enabled} />
              Enable Free Time
            </label>
          </div>
          
          <div className="input-group" style={{ marginTop: '16px' }}>
             <label>Free Time Duration (Minutes)</label>
             <input type="number" name="free_time_duration" defaultValue={data.free_time_duration} />
          </div>

          <div style={{ marginTop: '30px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
