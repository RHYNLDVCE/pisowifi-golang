import React, { useEffect, useState } from 'react';
import { Save, Activity, Wifi } from 'lucide-react';

export default function NetworkSettings() {
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
    
    payload.speed_limit_toggle = formData.get('speed_limit_toggle') ? 'on' : '';
    payload.gaming_mode = formData.get('gaming_mode') ? 'on' : '';
    payload.free_time_toggle = formData.get('free_time_toggle') ? 'on' : '';
    payload.auto_pause = formData.get('auto_pause') ? 'on' : '';
    
    // We must pass the existing coin_rates back so they aren't lost if the backend expects them
    // Ideally the backend shouldn't override omitted fields, but we pass it just in case
    payload.coin_rates = data.coin_rates || '';
    payload.banner_text = data.banner_text || '';
    payload.banner_link = data.banner_link || '';

    try {
      const res = await fetch('/admin/update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert('Network settings saved successfully!');
      else alert('Failed to save settings.');
    } catch (err) {
      alert('Error saving settings.');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading network settings...</span>
    </div>
  );

  if (!data) return <div className="text-red-500">Error loading settings.</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold mb-6">Network & Operations</h2>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 md:p-8">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <Wifi size={20} /> Connection Rules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Coin Slot Timeout (Seconds)</label>
            <input 
              type="number" 
              name="timeout" 
              defaultValue={data.slot_timeout} 
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Inactive Disconnect (Seconds)</label>
            <input 
              type="number" 
              name="inactive_timeout" 
              defaultValue={data.inactive_timeout} 
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Global Speed Limit (Mbps)</label>
            <input 
              type="number" 
              name="speed_limit_val" 
              defaultValue={data.global_speed_limit} 
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Free Time Duration (Minutes)</label>
            <input 
              type="number" 
              name="free_time_duration" 
              defaultValue={data.free_time_duration} 
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:ring-2 focus:ring-black dark:focus:ring-white outline-none" 
            />
          </div>
        </div>

        <h3 className="text-sm font-bold mt-10 mb-4 uppercase tracking-widest text-gray-500">Feature Toggles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: 'speed_limit_toggle', label: 'Enable Speed Limits', default: data.speed_limit_enabled },
            { name: 'auto_pause', label: 'Enable Auto-Pause', default: data.auto_pause_enabled },
            { name: 'gaming_mode', label: 'Gaming Mode (Anti-Bufferbloat)', default: data.gaming_mode_enabled },
            { name: 'free_time_toggle', label: 'Enable Free Time Trial', default: data.free_time_enabled },
          ].map((toggle, i) => (
            <label key={i} className="flex items-center gap-3 p-4 border border-gray-200 dark:border-zinc-800 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="relative flex items-center">
                <input type="checkbox" name={toggle.name} defaultChecked={toggle.default} className="peer sr-only" />
                <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-black/20 dark:peer-focus:ring-white/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black dark:peer-checked:bg-white"></div>
              </div>
              <span className="text-sm font-semibold">{toggle.label}</span>
            </label>
          ))}
        </div>
        
        <div className="mt-10 flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Network Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
