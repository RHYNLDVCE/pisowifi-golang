import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Settings, Users, Volume2, Image, Activity, ShieldAlert } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import GlobalSettings from './pages/GlobalSettings';
import ManageUser from './pages/ManageUser';
import Devices from './pages/Devices';
import Logs from './pages/Logs';
import Media from './pages/Media';

function Layout({ children }) {
  const location = useLocation();
  
  const navItems = [
    { path: '/admin', icon: <Home size={18} />, label: 'Dashboard' },
    { path: '/admin/settings', icon: <Settings size={18} />, label: 'System Settings' },
    { path: '/admin/devices', icon: <Activity size={18} />, label: 'Infrastructure' },
    { path: '/admin/media', icon: <Image size={18} />, label: 'Banners & Sounds' },
    { path: '/admin/logs', icon: <ShieldAlert size={18} />, label: 'System Logs' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header style={{ 
        height: 'var(--header-height)', background: 'var(--sidebar-bg)', 
        display: 'flex', alignItems: 'center', padding: '0 20px', 
        borderBottom: '1px solid var(--sidebar-border)' 
      }}>
        <div style={{ width: '260px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity color="white" size={18} />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, lineHeight: 1.2 }}>PisoWifi</div>
            <div style={{ color: '#475569', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Admin Panel</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        <aside style={{ 
          width: 'var(--sidebar-width)', background: 'var(--sidebar-bg)', 
          borderRight: '1px solid var(--sidebar-border)', padding: '20px 12px' 
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} style={{
                  display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', 
                  borderRadius: '8px', textDecoration: 'none',
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                  background: isActive ? 'var(--sidebar-item-active-bg)' : 'transparent',
                  fontWeight: 600, fontSize: '0.875rem'
                }}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main style={{ flex: 1, padding: '28px 32px' }}>
          {children}
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
           <Route path="/admin/settings" element={<GlobalSettings />} />
           <Route path="/admin/devices" element={<Devices />} />
           <Route path="/admin/media" element={<Media />} />
           <Route path="/admin/logs" element={<Logs />} />
           <Route path="/admin/user/:mac" element={<ManageUser />} />
         </Routes>
       </Layout>
    </BrowserRouter>
  );
}
