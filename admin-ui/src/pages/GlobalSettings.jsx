import React, { useEffect, useState } from 'react';
import { Save, Activity } from 'lucide-react';

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

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading settings...</span>
    </div>
  );

  if (!data) return <div className="text-red-500">Error loading settings.</div>;

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">System Settings</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 md:p-8">
          
          <h3 className="text-lg font-bold mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">Network & Timeouts</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Coin Slot Timeout (Seconds)</label>
              <input 
                type="number" 
                name="timeout" 
                defaultValue={data.slot_timeout} 
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Inactive Disconnect Timeout (Seconds)</label>
              <input 
                type="number" 
                name="inactive_timeout" 
                defaultValue={data.inactive_timeout} 
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Global Speed Limit (Mbps)</label>
              <input 
                type="number" 
                name="speed_limit_val" 
                defaultValue={data.global_speed_limit} 
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Coin Rates (e.g. 1:10,5:60)</label>
              <input 
                type="text" 
                name="coin_rates" 
                defaultValue={data.coin_rates} 
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>
          
          <h3 className="text-lg font-bold mt-10 mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">Feature Toggles</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'speed_limit_toggle', label: 'Enable Speed Limits', default: data.speed_limit_enabled },
              { name: 'auto_pause', label: 'Enable Auto-Pause', default: data.auto_pause_enabled },
              { name: 'gaming_mode', label: 'Gaming Mode (Anti-Bufferbloat)', default: data.gaming_mode_enabled },
              { name: 'free_time_toggle', label: 'Enable Free Time', default: data.free_time_enabled },
            ].map((toggle, i) => (
              <label key={i} className="flex items-center gap-3 p-4 border border-gray-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    name={toggle.name} 
                    defaultChecked={toggle.default} 
                    className="peer sr-only"
                  />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-black/20 dark:peer-focus:ring-white/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black dark:peer-checked:bg-white"></div>
                </div>
                <span className="text-sm font-semibold">{toggle.label}</span>
              </label>
            ))}
          </div>
          
          <div className="mt-6 space-y-2 max-w-md">
             <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Free Time Duration (Minutes)</label>
             <input 
               type="number" 
               name="free_time_duration" 
               defaultValue={data.free_time_duration} 
               className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all outline-none"
             />
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-zinc-800 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
