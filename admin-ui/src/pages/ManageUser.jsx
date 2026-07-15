import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, ShieldBan, Trash2, Check, Activity } from 'lucide-react';

export default function ManageUser() {
  const { mac } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/admin/api/user/${mac}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [mac]);

  const handleAction = async (endpoint, payload) => {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, ...payload })
      });
      if (res.ok) {
        window.location.reload(); 
      } else {
        alert('Action failed.');
      }
    } catch (err) {
      alert('Error performing action.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading user details...</span>
    </div>
  );
  if (!data || data.error) return <div className="text-red-500 font-bold text-xl">User not found.</div>;

  const { user, device_name, time_formatted, history } = data;

  return (
    <div className="space-y-6 max-w-5xl">

      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 shadow-sm">
        <div>
          <div className="text-2xl font-black">{device_name || 'Unknown Device'}</div>
          <div className="text-gray-500 dark:text-gray-400 font-mono mt-1">MAC: {mac}</div>
          <div className="text-gray-500 dark:text-gray-400 font-mono">IP: {user.IP}</div>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
              user.Status === 'connected' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
              user.Status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
              'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                user.Status === 'connected' ? 'bg-green-600 dark:bg-green-400' :
                user.Status === 'paused' ? 'bg-amber-600 dark:bg-amber-400' :
                'bg-red-600 dark:bg-red-400'
              }`}></span>
              {user.Status}
            </span>
          </div>
        </div>
        
        <div className="md:text-right flex flex-col justify-center">
           <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Time Remaining</div>
           <div className="text-4xl md:text-5xl font-black font-mono tracking-tight">{time_formatted}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 pb-2 border-b border-gray-200 dark:border-zinc-800">Time Adjustments</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleAction('/admin/manage_time', Object.fromEntries(formData));
          }} className="space-y-4">
            <div className="flex gap-3">
               <select name="action" className="w-1/3 px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded outline-none focus:ring-2 focus:ring-black dark:focus:ring-white">
                 <option value="add">Add</option>
                 <option value="subtract">Deduct</option>
               </select>
               <input type="number" name="amount" placeholder="Amt" required className="w-1/3 px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
               <select name="unit" className="w-1/3 px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded outline-none focus:ring-2 focus:ring-black dark:focus:ring-white">
                 <option value="minutes">Mins</option>
                 <option value="hours">Hours</option>
                 <option value="days">Days</option>
               </select>
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
              <Clock size={18}/> Apply Time
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 pb-2 border-b border-gray-200 dark:border-zinc-800">Security Actions</h3>
          <div className="space-y-3">
            {user.Status === 'blocked' ? (
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors" onClick={() => handleAction('/admin/unblock', {})}>
                <Check size={18}/> Unblock Device
              </button>
            ) : (
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black dark:bg-black dark:text-white border-2 border-black dark:border-white font-bold rounded hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors" onClick={() => handleAction('/admin/block', {})}>
                <ShieldBan size={18}/> Block Device
              </button>
            )}
            
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-500 font-bold rounded hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors" onClick={() => {
              if (window.confirm('Are you sure you want to completely erase this user?')) {
                handleAction('/admin/delete_user', {}).then(() => window.location.href = '/admin');
              }
            }}>
              <Trash2 size={18}/> Delete User
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-zinc-800">
          <h3 className="text-base font-bold">Sales History</h3>
        </div>
        {history && history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-900/50">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 text-sm">{h.DateStr}</td>
                    <td className="px-6 py-4 font-bold">₱{h.Amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">{h.TimeAdded} mins</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No sales history found for this device.
          </div>
        )}
      </div>
    </div>
  );
}
