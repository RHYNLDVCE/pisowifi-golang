import React, { useEffect, useState } from 'react';
import { Server, Wifi, RefreshCw, Activity } from 'lucide-react';

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
        await fetch('/admin/rename_device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mac, name: newName })
        });
        fetchDevices();
      } catch (err) {
        alert('Failed to rename device');
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
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Network Infrastructure</h2>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white text-black dark:bg-black dark:text-white border border-gray-300 dark:border-zinc-700 font-bold rounded hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50" 
          onClick={fetchDevices} 
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm overflow-hidden">
        {devices.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No infrastructure devices detected.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-900/50">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device Info</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">MAC Address</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {devices.map((dev, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      {dev.IsRouter ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-gray-100 text-black dark:bg-zinc-800 dark:text-white border border-gray-200 dark:border-zinc-700">
                          <Server size={14} /> Gateway
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-gray-100 text-black dark:bg-zinc-800 dark:text-white border border-gray-200 dark:border-zinc-700">
                          <Wifi size={14} /> AP / Switch
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm">{dev.Name || dev.Vendor || 'Unknown Device'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{dev.MAC}</td>
                    <td className="px-6 py-4 text-sm font-medium">{dev.IP}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        onClick={() => handleRename(dev.MAC, dev.Name)}
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
