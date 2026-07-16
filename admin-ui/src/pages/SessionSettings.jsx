import React, { useEffect, useState } from 'react';
import { Save, Activity, PauseCircle, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function SessionSettings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });

  const confirmAction = (title, message, onConfirm, type = 'danger') => {
    setModalConfig({ isOpen: true, title, message, onConfirm, type });
  };
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

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
    
    payload.free_time_toggle = formData.get('free_time_toggle') ? 'on' : '';
    payload.auto_pause = formData.get('auto_pause') ? 'on' : '';
    
    // Pass existing values for omitted fields
    payload.speed_limit_toggle = data.speed_limit_enabled ? 'on' : '';
    payload.gaming_mode = data.gaming_mode_enabled ? 'on' : '';
    payload.open_nat = data.open_nat_enabled ? 'on' : '';
    payload.custom_ttl = data.custom_ttl ?? 1;
    payload.speed_limit_val = data.global_speed_limit || 0;
    payload.coin_rates = data.coin_rates || '';
    payload.banner_text = data.banner_text || '';
    payload.banner_link = data.banner_link || '';
    payload.timeout = data.slot_timeout || 60;

    try {
      const res = await fetch('/admin/update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) toast.success('Session settings saved successfully!');
      else toast.error('Failed to save settings.');
    } catch (err) {
      toast.error('Error saving settings.');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading session settings...</span>
    </div>
  );

  if (!data) return <div className="text-red-500">Error loading settings.</div>;

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onClose={closeModal}
      />
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Session & Auto-Pause */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center gap-3">
             <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <PauseCircle size={20} />
             </div>
             <div>
               <h3 className="text-base font-bold text-gray-900 dark:text-white">Session & Auto-Pause</h3>
               <p className="text-xs text-gray-500 dark:text-gray-400">Automatically manage inactive connections</p>
             </div>
          </div>
          <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20 grid grid-cols-1 md:grid-cols-2 gap-6">
             <label className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl cursor-pointer shadow-sm">
                <div>
                   <div className="text-sm font-bold text-gray-900 dark:text-white">Enable Auto-Pause</div>
                   <div className="text-xs text-gray-500 mt-0.5">Pause a user's time when disconnected.</div>
                </div>
                <div className="relative flex items-center shrink-0 ml-4">
                  <input type="checkbox" name="auto_pause" defaultChecked={data.auto_pause_enabled} className="peer sr-only" />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
             </label>

             <div className="flex flex-col justify-center space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Inactive Disconnect (Seconds)</label>
                <input 
                  type="number" 
                  name="inactive_timeout" 
                  defaultValue={data.inactive_timeout} 
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none shadow-sm"
                />
             </div>
          </div>
        </div>

        {/* Free Time Trial */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center gap-3">
             <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Gift size={20} />
             </div>
             <div>
               <h3 className="text-base font-bold text-gray-900 dark:text-white">Free Time Trial</h3>
               <p className="text-xs text-gray-500 dark:text-gray-400">Offer free internet to new devices</p>
             </div>
          </div>
          <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20 grid grid-cols-1 md:grid-cols-2 gap-6">
             <label className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl cursor-pointer shadow-sm">
                <div>
                   <div className="text-sm font-bold text-gray-900 dark:text-white">Enable Free Trial</div>
                </div>
                <div className="relative flex items-center shrink-0 ml-4">
                  <input type="checkbox" name="free_time_toggle" defaultChecked={data.free_time_enabled} className="peer sr-only" />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </div>
             </label>

             <div className="flex flex-col justify-center space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Free Time Duration (Minutes)</label>
                <input 
                  type="number" 
                  name="free_time_duration" 
                  defaultValue={data.free_time_duration} 
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 outline-none shadow-sm" 
                />
             </div>
          </div>
        </div>
        
        <div className="pt-6 pb-10 flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center shadow-lg">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
