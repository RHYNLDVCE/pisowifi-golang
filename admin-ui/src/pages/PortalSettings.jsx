import React, { useEffect, useState } from 'react';
import { Save, Activity, MonitorSmartphone, Volume2, Timer, Image, Trash2, Upload, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function PortalSettings() {
  const [data, setData] = useState(null);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });

  const confirmAction = (title, message, onConfirm, type = 'danger') => {
    setModalConfig({ isOpen: true, title, message, onConfirm, type });
  };
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  const fetchData = () => {
    fetch('/admin/api/dashboard_data')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setBanners(json.banner_files || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    // Pass existing values to prevent overwriting with null
    payload.speed_limit_toggle = data.speed_limit_enabled ? 'on' : '';
    payload.gaming_mode = data.gaming_mode_enabled ? 'on' : '';
    payload.open_nat = data.open_nat_enabled ? 'on' : '';
    payload.custom_ttl = data.custom_ttl ?? 1;
    payload.free_time_toggle = data.free_time_enabled ? 'on' : '';
    payload.auto_pause = data.auto_pause_enabled ? 'on' : '';
    payload.coin_rates = data.coin_rates || '';
    payload.inactive_timeout = data.inactive_timeout || 300;
    payload.speed_limit_val = data.global_speed_limit || 0;
    payload.free_time_duration = data.free_time_duration || 0;

    try {
      const res = await fetch('/admin/update_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) toast.success('Portal settings saved successfully!');
      else toast.error('Failed to save portal settings.');
    } catch (err) {
      toast.error('Error saving settings.');
    }
    setSavingSettings(false);
  };

  const handleUpload = async (endpoint, e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        toast.success('Upload successful');
        fetchData();
      } else {
        toast.error('Upload failed');
      }
    } catch (err) {
      toast.error('Error uploading');
    }
    e.target.reset();
  };

  const deleteBanner = (filename) => {
    confirmAction(
      'Delete Banner',
      'Are you sure you want to delete this promotional banner? This action cannot be undone.',
      async () => {
        try {
          await fetch('/admin/delete_banner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `filename=${encodeURIComponent(filename)}`
          });
          toast.success('Banner deleted');
          fetchData();
        } catch (err) {
          toast.error('Failed to delete banner');
        }
      }
    );
  };

  const deleteSound = (filename) => {
    confirmAction(
      'Delete Sound',
      'Are you sure you want to delete this custom audio file? Make sure it is not currently selected in the settings.',
      async () => {
        try {
          await fetch('/admin/delete_sound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `filename=${encodeURIComponent(filename)}`
          });
          toast.success('Sound deleted');
          fetchData();
        } catch (err) {
          toast.error('Failed to delete sound');
        }
      }
    );
  };

  const moveBanner = (index, direction) => {
    const newBanners = [...banners];
    if (direction === -1 && index > 0) {
      const temp = newBanners[index - 1];
      newBanners[index - 1] = newBanners[index];
      newBanners[index] = temp;
    } else if (direction === 1 && index < newBanners.length - 1) {
      const temp = newBanners[index + 1];
      newBanners[index + 1] = newBanners[index];
      newBanners[index] = temp;
    }
    setBanners(newBanners);
  };

  const saveBannerOrder = async () => {
    setSavingOrder(true);
    const formData = new FormData();
    formData.append('order', JSON.stringify(banners));
    try {
      const res = await fetch('/admin/save_banner_order', {
        method: 'POST',
        body: formData
      });
      if (res.ok) toast.success('Banner order saved!');
      else toast.error('Failed to save order.');
    } catch (err) {
      toast.error('Error saving order');
    }
    setSavingOrder(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading portal settings...</span>
    </div>
  );

  if (!data) return <div className="text-red-500">Error loading settings.</div>;

  return (
    <div className="space-y-6 relative">
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onClose={closeModal}
      />
      
      {/* --- MEDIA UPLOADS --- */}

      {/* Promotional Banners */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400">
                <Image size={20} />
             </div>
             <div>
               <h3 className="text-base font-bold text-gray-900 dark:text-white">Promotional Banners</h3>
               <p className="text-xs text-gray-500 dark:text-gray-400">Upload images for the captive portal slider</p>
             </div>
          </div>
          <button 
            onClick={saveBannerOrder}
            disabled={savingOrder || banners.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm shadow-sm"
          >
            <Save size={16} /> {savingOrder ? 'Saving...' : 'Save Order Layout'}
          </button>
        </div>
        
        <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
          <form onSubmit={(e) => handleUpload('/admin/upload_banners', e)} className="flex flex-col sm:flex-row gap-4 mb-8">
            <input 
              type="file" 
              name="files" 
              multiple 
              accept="image/*" 
              className="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm shadow-sm" 
            />
            <button type="submit" className="flex items-center justify-center gap-2 px-6 py-2 border-2 border-black text-black dark:border-white dark:text-white font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors">
              <Upload size={18}/> Upload
            </button>
          </form>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {banners.map((file, idx) => (
              <div key={file} className="group relative border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-zinc-900 flex flex-col shadow-sm">
                <div className="flex-1 relative overflow-hidden">
                  <img src={`/static/banners/set/${file}`} alt="Banner" className="w-full h-full object-cover" />
                </div>
                <div className="flex border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                  <button 
                    onClick={() => moveBanner(idx, -1)}
                    disabled={idx === 0}
                    className="flex-1 py-1.5 flex justify-center text-gray-500 hover:text-black hover:bg-gray-100 dark:hover:bg-zinc-900 dark:hover:text-white disabled:opacity-30 transition-colors border-r border-gray-200 dark:border-zinc-800"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={() => deleteBanner(file)}
                    className="flex-1 py-1.5 flex justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-r border-gray-200 dark:border-zinc-800"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={() => moveBanner(idx, 1)}
                    disabled={idx === banners.length - 1}
                    className="flex-1 py-1.5 flex justify-center text-gray-500 hover:text-black hover:bg-gray-100 dark:hover:bg-zinc-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ))}
            {banners.length === 0 && (
              <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
                No banners uploaded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Audio Uploads */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden pb-8 w-full">
        <div className="flex items-center gap-3 p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50">
           <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Volume2 size={20} />
           </div>
           <div>
             <h3 className="text-base font-bold text-gray-900 dark:text-white">Custom Audio Assets</h3>
             <p className="text-xs text-gray-500 dark:text-gray-400">Upload new `.mp3` or `.wav` sounds</p>
           </div>
        </div>
        
        <div className="p-5 sm:p-6">
          <form onSubmit={(e) => handleUpload('/admin/upload_sound', e)} className="flex flex-col sm:flex-row gap-4 mb-8">
            <input 
              type="file" 
              name="file" 
              accept="audio/*" 
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm shadow-sm" 
            />
            <button type="submit" className="flex items-center justify-center gap-2 px-6 py-2 border-2 border-black text-black dark:border-white dark:text-white font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors">
              <Upload size={18}/> Upload
            </button>
          </form>

          <div className="overflow-x-auto sm:border border-gray-200 dark:border-zinc-800 sm:rounded-xl -mx-5 sm:mx-0 border-y sm:border-t-0 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-900/50">
                  <th className="pl-5 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800 whitespace-nowrap">Filename</th>
                  <th className="pr-5 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right border-b border-gray-200 dark:border-zinc-800 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {data.sound_files && data.sound_files.map((file, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="pl-5 sm:px-6 py-3 sm:py-4 font-mono text-[10px] sm:text-sm whitespace-nowrap">{file}</td>
                    <td className="pr-5 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            const audio = new Audio(`/static/sounds/${file}`);
                            audio.play();
                          }}
                        >
                          Play Sound
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            deleteSound(file);
                          }}
                          className="inline-flex items-center justify-center p-1.5 sm:p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!data.sound_files || data.sound_files.length === 0) && (
                  <tr>
                    <td colSpan="2" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-zinc-900/20">
                      No custom sounds uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <hr className="my-10 border-gray-200 dark:border-zinc-800" />

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Coin Slot Settings */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden w-full">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center gap-3">
             <div className="p-2 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                <Timer size={20} />
             </div>
             <div>
               <h3 className="text-base font-bold text-gray-900 dark:text-white">Coin Slot Configuration</h3>
               <p className="text-xs text-gray-500 dark:text-gray-400">Manage hardware timeouts</p>
             </div>
          </div>
          <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
             <div className="space-y-2 max-w-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Slot Timeout (Seconds)</label>
                <input 
                  type="number" 
                  name="timeout" 
                  defaultValue={data.slot_timeout || 60} 
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none shadow-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Time before the physical coin slot accepts another coin.</p>
             </div>
          </div>
        </div>

        {/* Portal Customization */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden w-full">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center gap-3">
             <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <MonitorSmartphone size={20} />
             </div>
             <div>
               <h3 className="text-base font-bold text-gray-900 dark:text-white">Interface Configuration</h3>
               <p className="text-xs text-gray-500 dark:text-gray-400">Customize the captive portal banner</p>
             </div>
          </div>
          <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Portal Title</label>
                <input type="text" name="portal_title" defaultValue={data.portal_title} placeholder="e.g. PISOWIFI" className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Portal Subtitle</label>
                <input type="text" name="portal_subtitle" defaultValue={data.portal_subtitle} placeholder="e.g. Premium internet connectivity" className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none shadow-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Banner Button Text</label>
                <input type="text" name="banner_text" defaultValue={data.banner_text} placeholder="e.g. Open App" className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Banner Button URL</label>
                <input type="text" name="banner_link" defaultValue={data.banner_link} placeholder="http://..." className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none shadow-sm" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Event Sounds (Selection) */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden w-full">
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center gap-3">
             <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <Volume2 size={20} />
             </div>
             <div>
               <h3 className="text-base font-bold text-gray-900 dark:text-white">Event Sounds Configuration</h3>
               <p className="text-xs text-gray-500 dark:text-gray-400">Select sounds for coin insertion</p>
             </div>
          </div>
          <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Insert Coin Sound (Looping)</label>
                <select name="sound_insert" defaultValue={data.sound_insert_selected} className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none shadow-sm">
                  {data.sound_files && data.sound_files.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Coin Received Sound (Success)</label>
                <select name="sound_coin" defaultValue={data.sound_coin_selected} className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none shadow-sm">
                  {data.sound_files && data.sound_files.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end w-full">
          <button type="submit" disabled={savingSettings} className="flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center shadow-lg">
            <Save size={18} /> {savingSettings ? 'Saving...' : 'Save General Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
