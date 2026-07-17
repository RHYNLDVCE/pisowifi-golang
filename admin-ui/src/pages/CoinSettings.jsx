import React, { useEffect, useState } from 'react';
import { Save, Activity, Coins, Info } from 'lucide-react';
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

export default function CoinSettings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coinRates, setCoinRates] = useState({ 1: '', 5: '', 10: '', 20: '' });
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
        
        const parsedRates = { 1: '', 5: '', 10: '', 20: '' };
        if (json.coin_rates) {
          json.coin_rates.split(',').forEach(part => {
            const [coin, mins] = part.split(':');
            if (parsedRates[coin] !== undefined) {
              parsedRates[coin] = mins;
            }
          });
        }
        setCoinRates(parsedRates);
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
    
    // We only want to update coin_rates, but we have to pass other stuff so it isn't overwritten
    const payload = {};
    payload.speed_limit_toggle = data.speed_limit_enabled ? 'on' : '';
    payload.gaming_mode = data.gaming_mode_enabled ? 'on' : '';
    payload.udp_priority = data.udp_priority_enabled ? 'on' : '';
    payload.open_nat = data.open_nat_enabled ? 'on' : '';
    payload.custom_ttl = data.custom_ttl ?? 1;
    payload.free_time_toggle = data.free_time_enabled ? 'on' : '';
    payload.auto_pause = data.auto_pause_enabled ? 'on' : '';
    payload.timeout = data.slot_timeout || 60;
    payload.inactive_timeout = data.inactive_timeout || 300;
    payload.speed_limit_val = data.global_speed_limit || 0;
    payload.free_time_duration = data.free_time_duration || 0;
    payload.banner_text = data.banner_text || '';
    payload.banner_link = data.banner_link || '';

    // Reconstruct coin_rates string
    const ratesArray = [];
    Object.keys(coinRates).forEach(coin => {
      if (coinRates[coin]) ratesArray.push(`${coin}:${coinRates[coin]}`);
    });
    payload.coin_rates = ratesArray.join(',');

    try {
      const res = await fetch('/admin/update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Coin configuration saved successfully!');
        // Update local data context to not lose the string
        setData({...data, coin_rates: payload.coin_rates});
      } else {
        toast.error('Failed to save coin configuration.');
      }
    } catch (err) {
      toast.error('Error saving settings.');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading coin settings...</span>
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
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  <Coins size={20} />
               </div>
               <div>
                 <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    Coin Machine Pricing
                    <InfoTooltip text="Configure how many minutes of internet access are granted per coin denomination." />
                 </h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Set time conversion rates</p>
               </div>
             </div>
          </div>
          
          <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Time Conversion (Coins to Minutes)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 5, 10, 20].map(coin => (
                <div key={coin} className="space-y-1 bg-white dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">₱{coin} Coin → Minutes</label>
                  <input 
                    type="number" 
                    value={coinRates[coin]}
                    onChange={(e) => setCoinRates({...coinRates, [coin]: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 text-sm font-bold"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="pt-6 pb-10 flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center shadow-lg">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Pricing'}
          </button>
        </div>
      </form>
    </div>
  );
}
