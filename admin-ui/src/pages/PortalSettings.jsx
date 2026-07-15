import React, { useEffect, useState } from 'react';
import { Save, Activity, MonitorSmartphone, Volume2 } from 'lucide-react';

export default function PortalSettings() {
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
    
    // Pass existing values to prevent overwriting with null
    payload.speed_limit_toggle = data.speed_limit_enabled ? 'on' : '';
    payload.gaming_mode = data.gaming_mode_enabled ? 'on' : '';
    payload.free_time_toggle = data.free_time_enabled ? 'on' : '';
    payload.auto_pause = data.auto_pause_enabled ? 'on' : '';
    payload.coin_rates = data.coin_rates || '';
    payload.timeout = data.slot_timeout || 60;
    payload.inactive_timeout = data.inactive_timeout || 300;
    payload.speed_limit_val = data.global_speed_limit || 0;
    payload.free_time_duration = data.free_time_duration || 0;

    try {
      const res = await fetch('/admin/update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) alert('Portal settings saved successfully!');
      else alert('Failed to save portal settings.');
    } catch (err) {
      alert('Error saving settings.');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading portal settings...</span>
    </div>
  );

  if (!data) return <div className="text-red-500">Error loading settings.</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold mb-6">Portal UI & Sounds</h2>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 md:p-8">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <MonitorSmartphone size={20} /> Interface Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Banner Button Text</label>
            <input type="text" name="banner_text" defaultValue={data.banner_text} placeholder="e.g. Open App" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:ring-2 focus:ring-black dark:focus:ring-white outline-none" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Banner Button URL</label>
            <input type="text" name="banner_link" defaultValue={data.banner_link} placeholder="http://..." className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:ring-2 focus:ring-black dark:focus:ring-white outline-none" />
          </div>
        </div>

        <h3 className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <Volume2 size={20} /> Event Sounds
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Insert Coin Sound (Looping)</label>
            <select name="sound_insert" defaultValue={data.sound_insert_selected} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:ring-2 focus:ring-black dark:focus:ring-white outline-none">
              {data.sound_files && data.sound_files.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Coin Received Sound (Success)</label>
            <select name="sound_coin" defaultValue={data.sound_coin_selected} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:ring-2 focus:ring-black dark:focus:ring-white outline-none">
              {data.sound_files && data.sound_files.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        
        <div className="mt-10 flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Portal Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
