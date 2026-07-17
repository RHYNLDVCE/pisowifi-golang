import React, { useEffect, useState } from 'react';
import { Server, Wifi, RefreshCw, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDevices = () => {
    setRefreshing(true);
    fetch('/admin/get_infrastructure_devices')
      .then(res => res.json())
      .then(json => {
        setDevices(json.devices || []);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRename = async (mac, currentName) => {
    const newName = window.prompt(`Enter new name for device ${mac}:`, currentName);
    if (newName !== null && newName !== currentName) {
      try {
        const res = await fetch('/admin/rename_device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mac, name: newName })
        });
        if (res.ok) {
          toast.success('Device renamed');
          fetchDevices();
        } else {
          toast.error('Failed to rename device');
        }
      } catch (err) {
        toast.error('Failed to rename device');
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Activity className="animate-spin w-8 h-8 mr-3" />
      <span>Loading infrastructure...</span>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white text-black dark:bg-black dark:text-white border border-gray-300 dark:border-zinc-700 font-bold rounded hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50" 
          onClick={fetchDevices} 
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-950 sm:border border-gray-200 dark:border-zinc-800 sm:rounded-md sm:shadow-sm overflow-hidden flex flex-col -mx-4 sm:mx-0">
        {devices.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 border-t sm:border-t-0 border-gray-200 dark:border-zinc-800">
            No infrastructure devices detected.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-900/50 border-y sm:border-t-0 border-gray-200 dark:border-zinc-800">
                  <th className="pl-4 sm:px-6 py-2 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Device Info</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">MAC Address</th>
                  <th className="px-3 sm:px-6 py-2 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">IP Address</th>
                  <th className="pr-4 sm:px-6 py-2 sm:py-4 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {devices.map((dev, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="pl-4 sm:px-6 py-2 sm:py-4 font-bold text-[11px] sm:text-sm whitespace-nowrap">{dev.vendor || 'Unknown Device'}</td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">{dev.mac}</td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 text-[11px] sm:text-sm font-medium whitespace-nowrap">
                      <a href={`http://${dev.ip}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                        {dev.ip}
                      </a>
                    </td>
                    <td className="pr-4 sm:px-6 py-2 sm:py-4 text-right whitespace-nowrap">
                      <button 
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        onClick={() => handleRename(dev.mac, dev.vendor)}
                      >
                        Rename
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
