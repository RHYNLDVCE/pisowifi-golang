import React, { useEffect, useState } from 'react';
import { Image, Volume2, Trash2, Upload } from 'lucide-react';

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

  if (loading) return <div>Loading media settings...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Media & Assets</h2>
      
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Image size={20} color="var(--primary)" /> Promotional Banners
        </h3>
        
        <form onSubmit={(e) => handleUpload('/admin/upload_banners', e)} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input type="file" name="files" multiple accept="image/*" className="btn btn-outline" style={{ flex: 1, height: '42px', padding: '8px' }} />
          <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}><Upload size={16}/> Upload Banners</button>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
          {data.banner_files && data.banner_files.map((file, idx) => (
            <div key={idx} style={{ position: 'relative', border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <img src={`/static/banners/set/${file}`} alt="Banner" style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }} />
              <button 
                onClick={() => deleteBanner(file)}
                style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Volume2 size={20} color="var(--primary)" /> Custom Sounds
        </h3>
        
        <form onSubmit={(e) => handleUpload('/admin/upload_sound', e)} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input type="file" name="file" accept="audio/*" className="btn btn-outline" style={{ flex: 1, height: '42px', padding: '8px' }} />
          <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}><Upload size={16}/> Upload Sound</button>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.sound_files && data.sound_files.map((file, idx) => (
              <tr key={idx}>
                <td>{file}</td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => {
                    const audio = new Audio(`/static/sounds/${file}`);
                    audio.play();
                  }}>Play</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
