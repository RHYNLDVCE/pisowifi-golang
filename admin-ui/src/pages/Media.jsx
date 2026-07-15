import React, { useEffect, useState } from 'react';
import { Image, Volume2, Trash2, Upload, Activity, ChevronLeft, ChevronRight, Save } from 'lucide-react';

export default function Media() {
  const [data, setData] = useState(null);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchMedia = () => {
    fetch('/admin/api/dashboard_data')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setBanners(json.banner_files || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleUpload = async (endpoint, e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) fetchMedia();
      else alert('Upload failed');
    } catch (err) {
      alert('Error uploading');
    }
    e.target.reset();
  };

  const deleteBanner = async (filename) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await fetch('/admin/delete_banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `filename=${encodeURIComponent(filename)}`
      });
      fetchMedia();
    } catch (err) {
      alert('Failed to delete banner');
    }
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
      if (res.ok) alert('Banner order saved!');
      else alert('Failed to save order.');
    } catch (err) {
      alert('Error saving order');
    }
    setSavingOrder(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading media assets...</span>
    </div>
  );

  return (
    <div className="max-w-5xl space-y-6">
      <h2 className="text-2xl font-bold mb-6">Media & Assets</h2>
      
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Image size={20} className="text-black dark:text-white" /> Promotional Banners
          </h3>
          <button 
            onClick={saveBannerOrder}
            disabled={savingOrder || banners.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {savingOrder ? 'Saving...' : 'Save Layout'}
          </button>
        </div>
        
        <form onSubmit={(e) => handleUpload('/admin/upload_banners', e)} className="flex flex-col sm:flex-row gap-4 mb-8">
          <input 
            type="file" 
            name="files" 
            multiple 
            accept="image/*" 
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm" 
          />
          <button type="submit" className="flex items-center justify-center gap-2 px-6 py-2 border-2 border-black text-black dark:border-white dark:text-white font-bold rounded hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors">
            <Upload size={18}/> Upload
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {banners.map((file, idx) => (
            <div key={file} className="group relative border border-gray-200 dark:border-zinc-800 rounded overflow-hidden aspect-video bg-gray-100 dark:bg-zinc-900 flex flex-col">
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
            <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded">
              No banners uploaded yet.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm p-6 md:p-8">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <Volume2 size={20} className="text-black dark:text-white" /> Custom Sounds
        </h3>
        
        <form onSubmit={(e) => handleUpload('/admin/upload_sound', e)} className="flex flex-col sm:flex-row gap-4 mb-8">
          <input 
            type="file" 
            name="file" 
            accept="audio/*" 
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm" 
          />
          <button type="submit" className="flex items-center justify-center gap-2 px-6 py-2 border-2 border-black text-black dark:border-white dark:text-white font-bold rounded hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors">
            <Upload size={18}/> Upload
          </button>
        </form>

        <div className="overflow-x-auto sm:border border-gray-200 dark:border-zinc-800 sm:rounded -mx-6 sm:mx-0 border-y sm:border-t-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900/50">
                <th className="pl-4 sm:px-6 py-2 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800 whitespace-nowrap">Filename</th>
                <th className="pr-4 sm:px-6 py-2 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right border-b border-gray-200 dark:border-zinc-800 whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {data.sound_files && data.sound_files.map((file, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="pl-4 sm:px-6 py-2 sm:py-4 font-mono text-[10px] sm:text-sm whitespace-nowrap">{file}</td>
                  <td className="pr-4 sm:px-6 py-2 sm:py-4 text-right whitespace-nowrap">
                    <button 
                      className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      onClick={() => {
                        const audio = new Audio(`/static/sounds/${file}`);
                        audio.play();
                      }}
                    >
                      Play Sound
                    </button>
                  </td>
                </tr>
              ))}
              {(!data.sound_files || data.sound_files.length === 0) && (
                <tr>
                  <td colSpan="2" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No custom sounds uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
