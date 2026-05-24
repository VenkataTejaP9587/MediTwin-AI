import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Activity, BarChart3, Settings,
  Shield, Heart, Bell, Sun, Moon, LogOut, Menu,
  ChevronLeft, ChevronRight, Zap,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore, useAlertStore } from '../store/uiStore';
import ChatbotWidget from './ChatbotWidget';
import NotificationsDrawer from './NotificationsDrawer';

const navItems = [
  { path: '/dashboard',      label: 'Dashboard',   icon: LayoutDashboard, roles: ['doctor','admin'] },
  { path: '/patients',       label: 'Patients',    icon: Users,           roles: ['doctor','admin'] },
  { path: '/monitoring',     label: 'ICU Monitor', icon: Activity,        roles: ['doctor','admin'] },
  { path: '/analytics',      label: 'Analytics',   icon: BarChart3,       roles: ['doctor','admin'] },
  { path: '/admin',          label: 'Admin Panel', icon: Shield,          roles: ['admin'] },
  { path: '/patient-portal', label: 'My Health',   icon: Heart,           roles: ['patient'] },
  { path: '/settings',       label: 'Settings',    icon: Settings,        roles: ['doctor','admin','patient'] },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed]         = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const { user, logout }                  = useAuthStore();
  const { isDark, toggle }                = useThemeStore();
  const { alerts, emergencyAlerts }          = useAlertStore();
  const navigate                          = useNavigate();

  const unresolved      = alerts.filter((a) => !a.resolved);
  const activeAlertCount = unresolved.length;
  const filteredNav     = navItems.filter((item) => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 p-6 border-b border-cyan-400/10 ${collapsed ? 'justify-center px-3' : ''}`}>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center glow-cyan">
            <Heart size={20} className="text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-medical-green rounded-full animate-pulse" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-white font-bold text-lg leading-none">MediSync</h1>
            <p className="text-cyan-400 text-xs font-medium">AI Monitor</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
               ${isActive
                 ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30'
                 : 'text-slate-400 hover:text-white hover:bg-white/5'
               }
               ${collapsed ? 'justify-center' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-cyan-400/10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <item.icon size={20} className="flex-shrink-0 relative z-10" />
                {!collapsed && (
                  <span className="font-medium text-sm relative z-10">{item.label}</span>
                )}
                {item.path === '/monitoring' && activeAlertCount > 0 && !collapsed && (
                  <span className="ml-auto bg-medical-red text-white text-xs px-2 py-0.5 rounded-full font-bold relative z-10 animate-pulse">
                    {activeAlertCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className={`p-4 border-t border-cyan-400/10 ${collapsed ? 'items-center' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.avatar || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-cyan-400 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-slate-400 hover:text-medical-red hover:bg-medical-red/10 transition-all duration-200 text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-navy-900 bg-grid overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="hidden lg:flex flex-col glass border-r border-cyan-400/10 relative z-20 flex-shrink-0"
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-navy-800 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 hover:bg-cyan-400/10 transition-colors z-30"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-72 glass z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="glass border-b border-cyan-400/10 px-6 py-4 flex items-center gap-4 flex-shrink-0 z-10">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={22} />
          </button>

          <div className="flex-1" />

          {/* Active Alert Badge */}
          {activeAlertCount > 0 && (
            <motion.button
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              onClick={() => setNotifOpen(true)}
              className="flex items-center gap-2 bg-medical-red/15 border border-medical-red/40 px-3 py-1.5 rounded-full hover:bg-medical-red/25 transition-colors cursor-pointer"
            >
              <Zap size={14} className="text-medical-red" />
              <span className="text-medical-red text-xs font-bold">{activeAlertCount} ALERTS</span>
            </motion.button>
          )}

          {/* Theme toggle */}
          <button
            id="theme-toggle"
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-yellow-400 transition-all duration-200"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications Bell */}
          <button
            id="notifications-bell"
            onClick={() => setNotifOpen(true)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <Bell size={18} />
            {activeAlertCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-medical-red rounded-full animate-pulse" />
            )}
          </button>

          {/* Avatar */}
          <div
            id="user-avatar"
            className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer"
            onClick={() => navigate('/settings')}
            title="Go to Settings"
          >
            {user?.avatar || 'U'}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Notifications Drawer (all alerts) */}
      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Chatbot */}
      <ChatbotWidget />
    </div>
  );
}
