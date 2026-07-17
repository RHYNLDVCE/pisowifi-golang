import React, { useEffect, useState } from 'react';
import { Power, CalendarClock, DatabaseBackup, Database, UploadCloud, Save, Info } from 'lucide-react';
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
      enabled: schedule.enabled,
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
    <div className="space-y-4 sm:space-y-6 relative">
      
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
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
           <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex-1">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    <Power size={20} />
                 </div>
                 <div>
                   <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                     Manual Reboot
                     <InfoTooltip text="Rebooting will temporarily disconnect all users and restart the network interfaces. Use this if the system feels sluggish or unresponsive." />
                   </h3>
                   <p className="text-xs text-gray-500 dark:text-gray-400">Restart the hardware immediately</p>
                 </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Force a manual hardware restart of the router.
              </p>
           </div>
           <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
             <button 
               onClick={handleReboot}
               disabled={rebooting}
               className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg"
             >
               <Power size={18} /> {rebooting ? 'Rebooting...' : 'Reboot Now'}
             </button>
           </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
           <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                   <CalendarClock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                     Scheduled Reboot
                     <InfoTooltip text="Daily automated maintenance restart to keep the system fresh." />
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Daily automated maintenance</p>
                </div>
              </div>
              <label className="relative flex items-center shrink-0 ml-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={schedule.enabled} 
                  onChange={(e) => setSchedule({...schedule, enabled: e.target.checked})}
                  className="peer sr-only" 
                />
                <div className="w-11 h-6 bg-gray-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
           </div>
           
           <div className={`p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20 transition-opacity duration-200 ${!schedule.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
             {loadingSchedule ? (
               <div className="text-sm text-gray-500">Loading schedule...</div>
             ) : (
               <form id="schedule-form" onSubmit={handleSaveSchedule} className="space-y-4">
                 <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Reboot Time (24H Format)</label>
                    <input 
                      type="time" 
                      name="time" 
                      defaultValue={schedule.time} 
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none shadow-sm font-mono"
                    />
                 </div>
               </form>
             )}
           </div>
           <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-zinc-800/50 flex justify-end">
             <button 
               form="schedule-form"
               type="submit" 
               disabled={savingSchedule || loadingSchedule}
               className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-lg"
             >
               <Save size={18} /> {savingSchedule ? 'Saving...' : 'Save Schedule'}
             </button>
           </div>
        </div>
      </div>

      {/* Backup and Restore */}
      <h2 className="text-lg font-bold mb-4 pt-4">Database Backup & Restore</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Backup Card */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
           <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex-1">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <DatabaseBackup size={20} />
                 </div>
                 <div>
                   <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                     Download Backup
                     <InfoTooltip text="This will download a secure .zip file containing your current pisowifi.db (all users, balances, and history) and config.json (system settings). Store this safely." />
                   </h3>
                   <p className="text-xs text-gray-500 dark:text-gray-400">Export database and config</p>
                 </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Keep your data safe by downloading a complete backup of your system.
              </p>
           </div>
           <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
             <button 
               onClick={handleDownloadBackup}
               className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg"
             >
               <Database size={18} /> Download Backup Zip
             </button>
           </div>
        </div>

        {/* Restore Card */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
           <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-zinc-800/50 flex-1">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                    <UploadCloud size={20} />
                 </div>
                 <div>
                   <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                     Restore Backup
                     <InfoTooltip text="Upload a previously saved .zip backup. WARNING: This will overwrite all current users, sales, and settings." />
                   </h3>
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
                      className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm shadow-sm" 
                    />
                 </div>
              </form>
           </div>
           <div className="p-5 sm:p-6 bg-gray-50/50 dark:bg-zinc-900/20">
             <button 
               form="restore-form"
               type="submit" 
               disabled={restoring}
               className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-lg"
             >
               <UploadCloud size={18} /> {restoring ? 'Restoring & Rebooting...' : 'Restore Backup'}
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

    </div>
  );
}
