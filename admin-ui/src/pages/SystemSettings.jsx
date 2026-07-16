import React, { useEffect, useState } from 'react';
import { Power, CalendarClock, DatabaseBackup, Database, UploadCloud, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function SystemSettings() {
  const [schedule, setSchedule] = useState({ enabled: false, time: '03:00' });
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });

  useEffect(() => {
    fetch('/admin/get_restart_schedule')
      .then(res => res.json())
      .then(json => {
        setSchedule(json);
        setLoadingSchedule(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingSchedule(false);
      });
  }, []);

  const confirmAction = (title, message, onConfirm, type = 'danger') => {
    setModalConfig({ isOpen: true, title, message, onConfirm, type });
  };
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  const handleSaveSchedule = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      enabled: formData.get('enabled') === 'on',
      time: formData.get('time')
    };

    confirmAction(
      'Update Schedule',
      'Are you sure you want to update the automated reboot schedule?',
      async () => {
        setSavingSchedule(true);
        try {
          const res = await fetch('/admin/set_restart_schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) toast.success('Restart schedule saved successfully!');
          else toast.error('Failed to save schedule.');
        } catch (err) {
          toast.error('Error saving schedule.');
        }
        setSavingSchedule(false);
      },
      'info'
    );
  };

  const handleReboot = () => {
    confirmAction(
      'System Reboot',
      'Are you sure you want to reboot the system? All active connections will be temporarily dropped.',
      async () => {
        setRebooting(true);
        try {
          const res = await fetch('/admin/reboot', { method: 'POST' });
          if (res.ok) {
             toast.success('System is rebooting... Please wait.');
             setTimeout(() => window.location.reload(), 30000); // Reload after 30s
          } else {
             toast.error('Failed to initiate reboot.');
             setRebooting(false);
          }
        } catch (err) {
          toast.error('Error initiating reboot.');
          setRebooting(false);
        }
      }
    );
  };

  const handleReset = () => {
    confirmAction(
      'Factory Reset Settings',
      'WARNING: This will erase all custom portal settings, network rates, and time slots, restoring them to factory defaults. Your database (users/sales) will remain untouched. The system will reboot immediately. Proceed?',
      async () => {
        try {
          const res = await fetch('/admin/reset_settings', { method: 'POST' });
          if (res.ok) {
             toast.success('Settings reset! System is rebooting...');
             setTimeout(() => window.location.reload(), 30000);
          } else {
             toast.error('Failed to reset settings.');
          }
        } catch (err) {
          toast.error('Error resetting settings.');
        }
      }
    );
  };

  const handleRestore = (e) => {
    e.preventDefault();
    const fileInput = e.target.elements.backup_file;
    if (!fileInput.files[0]) {
       toast.error('Please select a backup zip file first.');
       return;
    }
    const formData = new FormData(e.target);
    
    confirmAction(
      'Restore Backup',
      'WARNING: Restoring a backup will overwrite all current users, sales, and settings, and immediately reboot the router. Proceed?',
      async () => {
        setRestoring(true);
        try {
          const res = await fetch('/admin/restore', {
            method: 'POST',
            body: formData
          });
          if (res.ok) {
             toast.success('Backup restored! Rebooting system to apply changes...');
             setTimeout(() => window.location.reload(), 30000);
          } else {
             const data = await res.json();
             toast.error(data.message || 'Failed to restore backup.');
             setRestoring(false);
          }
        } catch (err) {
          toast.error('Error uploading backup file.');
          setRestoring(false);
        }
      }
    );
  };

  const handleDownloadBackup = (e) => {
    e.preventDefault();
    confirmAction(
      'Download Backup',
      'Are you sure you want to generate and download a backup zip of your database and settings?',
      () => {
         window.location.href = '/admin/backup';
      },
      'info'
    );
  };

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

      {/* Reboot Operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm p-6">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                 <Power size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Manual Reboot</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Restart the hardware immediately</p>
              </div>
           </div>
           <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
             Rebooting will temporarily disconnect all users and restart the network interfaces. Use this if the system feels sluggish or unresponsive.
           </p>
           <button 
             onClick={handleReboot}
             disabled={rebooting}
             className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
           >
             <Power size={18} /> {rebooting ? 'Rebooting...' : 'Reboot Now'}
           </button>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-gray-100 dark:border-zinc-800/50 flex-1">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                     <CalendarClock size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Scheduled Reboot</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Daily automated maintenance</p>
                  </div>
                </div>
             </div>
             
             {loadingSchedule ? (
               <div className="text-sm text-gray-500">Loading schedule...</div>
             ) : (
               <form id="schedule-form" onSubmit={handleSaveSchedule} className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900/30 rounded-xl border border-gray-100 dark:border-zinc-800/50">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Enable Daily Reboot</span>
                    <label className="relative flex items-center shrink-0 cursor-pointer">
                      <input type="checkbox" name="enabled" defaultChecked={schedule.enabled} className="peer sr-only" />
                      <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                 </div>
                 <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Reboot Time (24H Format)</label>
                    <input 
                      type="time" 
                      name="time" 
                      defaultValue={schedule.time} 
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none shadow-sm font-mono"
                    />
                 </div>
               </form>
             )}
           </div>
           <div className="p-4 bg-gray-50/50 dark:bg-zinc-900/20">
             <button 
               form="schedule-form"
               type="submit" 
               disabled={savingSchedule || loadingSchedule}
               className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
             >
               <Save size={18} /> {savingSchedule ? 'Saving...' : 'Save Schedule'}
             </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6">
        <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6">
           <div>
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                   <Power size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-900 dark:text-red-400">Factory Reset Settings</h3>
                </div>
             </div>
             <p className="text-sm text-red-700 dark:text-red-300">
               Reset all network, portal, and coin configurations to their original factory defaults. This will NOT delete your database, users, or sales.
             </p>
           </div>
           <button 
             onClick={handleReset}
             className="w-full md:w-auto whitespace-nowrap flex justify-center items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm shrink-0"
           >
             <Power size={18} /> Reset Defaults
           </button>
        </div>
      </div>

      <hr className="my-8 border-gray-200 dark:border-zinc-800" />

      {/* Backup and Restore */}
      <h2 className="text-lg font-bold mb-4">Database Backup & Restore</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Backup Card */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
           <div>
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                   <DatabaseBackup size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Download Backup</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Export database and config</p>
                </div>
             </div>
             <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
               This will download a secure <code>.zip</code> file containing your current <code>pisowifi.db</code> (all users, balances, and history) and <code>config.json</code> (system settings). Store this safely.
             </p>
           </div>
           <button 
             onClick={handleDownloadBackup}
             className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
           >
             <Database size={18} /> Download Backup Zip
           </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm flex flex-col overflow-hidden">
           <div className="p-6 border-b border-gray-100 dark:border-zinc-800/50 flex-1">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                   <UploadCloud size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Restore Backup</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Upload a previous zip backup</p>
                </div>
             </div>
             
             <form id="restore-form" onSubmit={handleRestore} className="space-y-4">
                <div className="space-y-2">
                   <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Backup Archive (.zip)</label>
                   <input 
                     type="file" 
                     name="backup_file" 
                     accept=".zip"
                     required
                     className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm shadow-sm" 
                   />
                </div>
             </form>
           </div>
           <div className="p-4 bg-gray-50/50 dark:bg-zinc-900/20">
             <button 
               form="restore-form"
               type="submit" 
               disabled={restoring}
               className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
             >
               <UploadCloud size={18} /> {restoring ? 'Restoring & Rebooting...' : 'Restore Backup'}
             </button>
           </div>
        </div>

      </div>

    </div>
  );
}
