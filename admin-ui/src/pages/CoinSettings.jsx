import React, { useEffect, useState } from 'react';
import { Save, Activity, Coins } from 'lucide-react';

export default function CoinSettings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coinRates, setCoinRates] = useState({ 1: '', 5: '', 10: '', 20: '' });

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
        alert('Coin configuration saved successfully!');
        // Update local data context to not lose the string
        setData({...data, coin_rates: payload.coin_rates});
      } else {
        alert('Failed to save coin configuration.');
      }
    } catch (err) {
      alert('Error saving settings.');
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
    <div className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold mb-6">Coin Configuration</h2>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 md:p-8">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <Coins size={20} /> Pricing Structure
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Define exactly how many minutes of internet access each coin denomination grants.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 5, 10, 20].map(coin => (
            <div key={coin} className="border border-gray-200 dark:border-zinc-800 rounded-md p-4 flex items-center gap-4 bg-gray-50 dark:bg-zinc-900/50">
              <div className="w-12 h-12 flex items-center justify-center font-bold text-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shrink-0 shadow-sm">
                ₱{coin}
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{coin} Peso</div>
                <div className="flex items-center">
                  <input 
                    type="number" 
                    value={coinRates[coin]}
                    onChange={(e) => setCoinRates({...coinRates, [coin]: e.target.value})}
                    placeholder="0"
                    className="w-full bg-transparent font-bold text-lg outline-none"
                  />
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">MINS</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-10 flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Pricing'}
          </button>
        </div>
      </form>
    </div>
  );
}
