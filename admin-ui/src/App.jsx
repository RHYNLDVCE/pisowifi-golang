import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Users, Image, Activity, ShieldAlert, Sun, Moon, Menu, Wifi, MonitorSmartphone, Coins, Award, Server, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import ManageUser from './pages/ManageUser';
import Devices from './pages/Devices';
import Logs from './pages/Logs';
import Media from './pages/Media';
import NetworkSettings from './pages/NetworkSettings';
import PortalSettings from './pages/PortalSettings';
import CoinSettings from './pages/CoinSettings';
import LoyaltySettings from './pages/LoyaltySettings';
import SystemStats from './pages/SystemStats';

function Layout({ children }) {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const navItems = [
    { path: '/admin', icon: <Home size={20} />, label: 'Analytics' },
    { path: '/admin/connections', icon: <Users size={20} />, label: 'Active Connections' },
    { path: '/admin/system', icon: <Server size={20} />, label: 'System Stats' },
    { path: '/admin/network', icon: <Wifi size={20} />, label: 'Network Settings' },
    { path: '/admin/portal', icon: <MonitorSmartphone size={20} />, label: 'Portal UI & Sounds' },
    { path: '/admin/coins', icon: <Coins size={20} />, label: 'Coin Configuration' },
    { path: '/admin/loyalty', icon: <Award size={20} />, label: 'Loyalty & Rewards' },
    { path: '/admin/devices', icon: <Activity size={20} />, label: 'Infrastructure' },
    { path: '/admin/media', icon: <Image size={20} />, label: 'Media & Assets' },
    { path: '/admin/logs', icon: <ShieldAlert size={20} />, label: 'System Logs' },
  ];

  const currentNavItem = navItems.find(item => item.path === location.pathname);
  const pageTitle = currentNavItem ? currentNavItem.label : (location.pathname.startsWith('/admin/user') ? 'User Details' : 'Control Center');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 dark:bg-black dark:text-zinc-300 transition-colors duration-200">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-zinc-800 shrink-0">
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
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-gray-200 text-black dark:bg-zinc-800 dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-900 dark:hover:text-gray-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800 shrink-0">
          <a href="/admin/logout" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-500 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
            <LogOut size={16} />
            Logout
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-gray-50 dark:bg-black flex items-center justify-between px-4 sm:px-8 z-10 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <button 
              className="md:hidden p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-md shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h1 className="text-[15px] sm:text-xl font-bold truncate max-w-[130px] sm:max-w-none">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[11px] sm:text-sm font-bold">{formatTime(currentTime)}</span>
              <span className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest">{formatDate(currentTime)}</span>
            </div>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-800"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={18} className="text-gray-400 hover:text-white" /> : <Moon size={18} className="text-gray-600 hover:text-black" />}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 pb-8 overflow-y-auto">
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
           <Route path="/admin/connections" element={<Connections />} />
           <Route path="/admin/system" element={<SystemStats />} />
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
