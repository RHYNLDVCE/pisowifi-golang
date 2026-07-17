import React, { useEffect, useState } from 'react';
import { Save, Activity, Info, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const InfoTooltip = ({ text }) => (
  <div className="group relative ml-2 flex items-center justify-center">
    <Info size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
    </div>
  </div>
);

export default function NetworkSettings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [toggles, setToggles] = useState({});

  const confirmAction = (title, message, onConfirm, type = 'danger') => {
    setModalConfig({ isOpen: true, title, message, onConfirm, type });
  };
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  useEffect(() => {
    fetch('/admin/api/dashboard_data')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setToggles({
          speedLimit: json.speed_limit_enabled,
          sqm: json.sqm_enabled,
          gamingMode: json.gaming_mode_enabled,
          udpPriority: json.udp_priority_enabled,
          openNat: json.open_nat_enabled
        });
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
    
    payload.speed_limit_toggle = toggles.speedLimit ? 'on' : '';
    payload.sqm_enabled = toggles.sqm ? 'on' : '';
    payload.gaming_mode = toggles.gamingMode ? 'on' : '';
    payload.udp_priority = toggles.udpPriority ? 'on' : '';
    payload.open_nat = toggles.openNat ? 'on' : '';

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

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
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
                 <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    Global Speed Limit
                    <InfoTooltip text="Limits the maximum total internet bandwidth allowed for an individual user's device. Prevents a single user from hogging the connection." />
                 </h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Enforce global bandwidth cap</p>
               </div>
             </div>
             <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
               <input type="checkbox" checked={toggles.speedLimit} onChange={() => handleToggle('speedLimit')} className="peer sr-only" />
               <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
             </label>
          </div>
          <div className={`p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20 transition-opacity duration-200 ${!toggles.speedLimit ? 'opacity-50 pointer-events-none' : ''}`}>
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
                 <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    Smart Queue Management (SQM)
                    <InfoTooltip text="Prevents bufferbloat by smoothly managing your overall WAN hardware traffic. Keeps your network ping low even when overall usage is high." />
                 </h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Prevent bufferbloat on WAN</p>
               </div>
             </div>
             <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
               <input type="checkbox" checked={toggles.sqm} onChange={() => handleToggle('sqm')} className="peer sr-only" />
               <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
             </label>
          </div>
          <div className={`p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20 transition-opacity duration-200 ${!toggles.sqm ? 'opacity-50 pointer-events-none' : ''}`}>
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
                 <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    Gaming Mode
                    <InfoTooltip text="Creates priority lanes for each individual user's internet connection. Ensures that gaming traffic skips ahead of downloads inside their own speed limit." />
                 </h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Individual Anti-Bufferbloat optimization</p>
               </div>
             </div>
             <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
               <input type="checkbox" checked={toggles.gamingMode} onChange={() => handleToggle('gamingMode')} className="peer sr-only" />
               <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
             </label>
          </div>
        </div>

        {/* UDP Priority */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Activity size={20} />
               </div>
               <div>
                 <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    UDP Priority Optimization
                    <InfoTooltip text="Automatically tags real-time UDP traffic (like Voice Calls and Games) with VIP priority labels, while tagging Torrent traffic with lowest priority labels. Highly recommended." />
                 </h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Tag Real-time UDP packets (Gaming/Voice)</p>
               </div>
             </div>
             <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
               <input type="checkbox" checked={toggles.udpPriority} onChange={() => handleToggle('udpPriority')} className="peer sr-only" />
               <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
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
                 <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    Open NAT (Gaming)
                    <InfoTooltip text="Opens up UPnP routing to allow Console gaming (Playstation, Xbox) to connect more freely without Strict NAT type issues." />
                 </h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Enable UPnP for consoles</p>
               </div>
             </div>
             <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
               <input type="checkbox" checked={toggles.openNat} onChange={() => handleToggle('openNat')} className="peer sr-only" />
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
                 <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    Tethering Override (TTL)
                    <InfoTooltip text="Modifies the TTL (Time To Live) of packets leaving the router. Set to 1 to attempt blocking users from tethering/hotspotting their connection to other devices." />
                 </h3>
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
