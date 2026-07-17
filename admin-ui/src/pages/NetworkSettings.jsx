import React, { useEffect, useState } from 'react';
import { Save, Activity, Clock, Timer, PauseCircle, Gift, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function NetworkSettings() {
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
    
    payload.speed_limit_toggle = formData.get('speed_limit_toggle') ? 'on' : '';
    payload.gaming_mode = formData.get('gaming_mode') ? 'on' : '';
    payload.open_nat = formData.get('open_nat') ? 'on' : '';
    payload.free_time_toggle = formData.get('free_time_toggle') ? 'on' : '';
    payload.auto_pause = formData.get('auto_pause') ? 'on' : '';
    payload.custom_ttl = formData.get('custom_ttl') || (data.custom_ttl ?? 1);
    
    payload.coin_rates = data.coin_rates || '';
    payload.banner_text = data.banner_text || '';
    payload.banner_link = data.banner_link || '';

    try {
      const res = await fetch('/admin/update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) toast.success('Network settings saved successfully!');
      else toast.error('Failed to save settings.');
    } catch (err) {
      toast.error('Error saving settings.');
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
        


        {/* Speed Limit */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                  <Gauge size={20} />
               </div>
               <div>
                 <h3 className="text-base font-bold text-gray-900 dark:text-white">Global Speed Limit</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Enforce global bandwidth cap</p>
               </div>
             </div>
             <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
               <input type="checkbox" name="speed_limit_toggle" defaultChecked={data.speed_limit_enabled} className="peer sr-only" />
               <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
             </label>
          </div>
          <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
             <div className="space-y-2 max-w-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Speed Limit (Mbps)</label>
                <input 
                  type="number" 
                  name="speed_limit_val" 
                  defaultValue={data.global_speed_limit} 
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 outline-none shadow-sm"
                />
             </div>
          </div>
        </div>

        {/* Smart Queue Management (SQM) */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  <Gauge size={20} />
               </div>
               <div>
                 <h3 className="text-base font-bold text-gray-900 dark:text-white">Smart Queue Management (SQM)</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Prevent bufferbloat on WAN</p>
               </div>
             </div>
             <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
               <input type="checkbox" name="sqm_enabled" defaultChecked={data.sqm_enabled} className="peer sr-only" />
               <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
             </label>
          </div>
          <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">ISP Download Speed (Mbps)</label>
                 <input 
                   type="number" 
                   name="sqm_download_mbps" 
                   defaultValue={data.sqm_download_mbps} 
                   className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 outline-none shadow-sm"
                 />
                 <p className="text-[10px] text-gray-500 mt-1">Set to 95% of your true maximum ISP download speed.</p>
               </div>
               <div className="space-y-2">
                 <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">ISP Upload Speed (Mbps)</label>
                 <input 
                   type="number" 
                   name="sqm_upload_mbps" 
                   defaultValue={data.sqm_upload_mbps} 
                   className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 outline-none shadow-sm"
                 />
                 <p className="text-[10px] text-gray-500 mt-1">Set to 95% of your true maximum ISP upload speed.</p>
               </div>
             </div>
          </div>
        </div>

        {/* Gaming Mode */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                  <Activity size={20} />
               </div>
               <div>
                 <h3 className="text-base font-bold text-gray-900 dark:text-white">Gaming Mode</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Anti-Bufferbloat QoS optimization</p>
               </div>
             </div>
             <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
               <input type="checkbox" name="gaming_mode" defaultChecked={data.gaming_mode_enabled} className="peer sr-only" />
               <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
             </label>
          </div>
        </div>

        {/* Open NAT (Gaming) */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Activity size={20} />
               </div>
               <div>
                 <h3 className="text-base font-bold text-gray-900 dark:text-white">Open NAT (Gaming)</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Enable UPnP for consoles</p>
               </div>
             </div>
             <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
               <input type="checkbox" name="open_nat" defaultChecked={data.open_nat_enabled} className="peer sr-only" />
               <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
             </label>
          </div>
        </div>

        {/* Tethering Override (TTL) */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  <Activity size={20} />
               </div>
               <div>
                 <h3 className="text-base font-bold text-gray-900 dark:text-white">Tethering Override (TTL)</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Set to 1 to block tethering, 0 to disable</p>
               </div>
             </div>
          </div>
          <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
             <div className="space-y-2 max-w-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">TTL Value</label>
                <input 
                  type="number" 
                  name="custom_ttl" 
                  defaultValue={data.custom_ttl ?? 1} 
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 outline-none shadow-sm"
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
