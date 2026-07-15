import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Users, Image, Activity, ShieldAlert, Sun, Moon, Menu, Wifi, MonitorSmartphone, Coins, Award } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ManageUser from './pages/ManageUser';
import Devices from './pages/Devices';
import Logs from './pages/Logs';
import Media from './pages/Media';
import NetworkSettings from './pages/NetworkSettings';
import PortalSettings from './pages/PortalSettings';
import CoinSettings from './pages/CoinSettings';
import LoyaltySettings from './pages/LoyaltySettings';

function Layout({ children }) {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const navItems = [
    { path: '/admin', icon: <Home size={20} />, label: 'Dashboard' },
    { path: '/admin/network', icon: <Wifi size={20} />, label: 'Network Settings' },
    { path: '/admin/portal', icon: <MonitorSmartphone size={20} />, label: 'Portal UI & Sounds' },
    { path: '/admin/coins', icon: <Coins size={20} />, label: 'Coin Configuration' },
    { path: '/admin/loyalty', icon: <Award size={20} />, label: 'Loyalty & Rewards' },
    { path: '/admin/devices', icon: <Activity size={20} />, label: 'Infrastructure' },
    { path: '/admin/media', icon: <Image size={20} />, label: 'Media & Assets' },
    { path: '/admin/logs', icon: <ShieldAlert size={20} />, label: 'System Logs' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 dark:bg-black dark:text-white transition-colors duration-200">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
              <Activity className="text-white dark:text-black w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">PisoWifi</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-md"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold hidden sm:block">Control Center</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={20} className="text-gray-400 hover:text-white" /> : <Moon size={20} className="text-gray-600 hover:text-black" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
       <Layout>
         <Routes>
           <Route path="/admin" element={<Dashboard />} />
           <Route path="/admin/network" element={<NetworkSettings />} />
           <Route path="/admin/portal" element={<PortalSettings />} />
           <Route path="/admin/coins" element={<CoinSettings />} />
           <Route path="/admin/loyalty" element={<LoyaltySettings />} />
           <Route path="/admin/devices" element={<Devices />} />
           <Route path="/admin/media" element={<Media />} />
           <Route path="/admin/logs" element={<Logs />} />
           <Route path="/admin/user/:mac" element={<ManageUser />} />
         </Routes>
       </Layout>
    </BrowserRouter>
  );
}
