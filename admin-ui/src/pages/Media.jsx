import React, { useEffect, useState } from 'react';
import { Image, Volume2, Trash2, Upload, Activity } from 'lucide-react';

export default function Media() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMedia = () => {
    fetch('/admin/api/dashboard_data')
      .then(res => res.json())
      .then(json => {
        setData(json);
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

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading media assets...</span>
    </div>
  );

  return (
    <div className="max-w-5xl space-y-6">
      <h2 className="text-2xl font-bold mb-6">Media & Assets</h2>
      
      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 md:p-8">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <Image size={20} className="text-black dark:text-white" /> Promotional Banners
        </h3>
        
        <form onSubmit={(e) => handleUpload('/admin/upload_banners', e)} className="flex flex-col sm:flex-row gap-4 mb-8">
          <input 
            type="file" 
            name="files" 
            multiple 
            accept="image/*" 
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm" 
          />
          <button type="submit" className="flex items-center justify-center gap-2 px-6 py-2 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
            <Upload size={18}/> Upload
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {data.banner_files && data.banner_files.map((file, idx) => (
            <div key={idx} className="group relative border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-zinc-900">
              <img src={`/static/banners/set/${file}`} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  onClick={() => deleteBanner(file)}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors transform hover:scale-110"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {(!data.banner_files || data.banner_files.length === 0) && (
            <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl">
              No banners uploaded yet.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 md:p-8">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-6 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <Volume2 size={20} className="text-black dark:text-white" /> Custom Sounds
        </h3>
        
        <form onSubmit={(e) => handleUpload('/admin/upload_sound', e)} className="flex flex-col sm:flex-row gap-4 mb-8">
          <input 
            type="file" 
            name="file" 
            accept="audio/*" 
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm" 
          />
          <button type="submit" className="flex items-center justify-center gap-2 px-6 py-2 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
            <Upload size={18}/> Upload
          </button>
        </form>

        <div className="overflow-x-auto border border-gray-200 dark:border-zinc-800 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800">Filename</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right border-b border-gray-200 dark:border-zinc-800">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {data.sound_files && data.sound_files.map((file, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{file}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
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
