import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Shield, PaintBucket, Save, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore, useAlertStore } from '../store/uiStore';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'appearance',    label: 'Appearance',    icon: PaintBucket },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab]     = useState('profile');
  const [saving, setSaving]           = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [nameVal, setNameVal]         = useState('');
  const [oldPass, setOldPass]         = useState('');
  const [newPass, setNewPass]         = useState('');
  const [notifPrefs, setNotifPrefs]   = useState({
    criticalAlerts: true,
    warningAlerts: true,
    emailDigest: false,
    smsAlerts: true,
    soundEnabled: true,
  });

  const { user, updateUser }          = useAuthStore();
  const { isDark, toggle }            = useThemeStore();
  const { alerts, clearAll }          = useAlertStore();

  // Initialise name from store once
  const displayName = nameVal || user?.name || '';

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800)); // simulate API
    updateUser({ name: displayName });
    toast.success('Profile updated successfully!');
    setSaving(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPass || !newPass) { toast.error('Please fill in both password fields'); return; }
    if (newPass.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success('Password changed successfully!');
    setOldPass(''); setNewPass('');
    setSaving(false);
  };

  const handleSaveNotifs = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    toast.success('Notification preferences saved!');
    setSaving(false);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm">Manage your account and preferences</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Tab list */}
        <div className="space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`settings-tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === id
                  ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            {/* ── Profile ── */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass border border-cyan-400/10 rounded-2xl p-6"
              >
                <h2 className="text-white font-bold mb-6 flex items-center gap-2"><User size={18} /> Profile Details</h2>

                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                    {user?.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{user?.name}</p>
                    <p className="text-cyan-400 text-sm capitalize">{user?.role}</p>
                    <p className="text-slate-500 text-xs mt-1">{user?.email}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setNameVal(e.target.value)}
                        className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-cyan-400/50 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        disabled
                        className="w-full bg-navy-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                      <input
                        type="text"
                        defaultValue={user?.role}
                        disabled
                        className="w-full bg-navy-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed capitalize text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      id="save-profile-btn"
                      className="flex items-center gap-2 bg-cyan-400 text-navy-900 font-bold px-6 py-2.5 rounded-xl text-sm glow-cyan hover:bg-cyan-500 transition-colors disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── Notifications ── */}
            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="glass border border-cyan-400/10 rounded-2xl p-6">
                  <h2 className="text-white font-bold mb-6 flex items-center gap-2"><Bell size={18} /> Alert Preferences</h2>

                  <div className="space-y-4">
                    {[
                      { key: 'criticalAlerts', label: 'Critical Alerts', desc: 'Receive pop-up alerts for critical vitals' },
                      { key: 'warningAlerts',  label: 'Warning Alerts',  desc: 'Receive warnings for elevated readings' },
                      { key: 'emailDigest',    label: 'Email Digest',    desc: 'Daily email summary of patient status' },
                      { key: 'smsAlerts',      label: 'SMS Alerts',      desc: 'Text message for critical emergencies' },
                      { key: 'soundEnabled',   label: 'Alert Sounds',    desc: 'Play audio tone for new alerts' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-navy-900/50 rounded-xl border border-white/5">
                        <div>
                          <div className="text-white font-medium text-sm">{label}</div>
                          <div className="text-slate-400 text-xs mt-0.5">{desc}</div>
                        </div>
                        <button
                          onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                            notifPrefs[key] ? 'bg-cyan-400' : 'bg-navy-800 border border-white/10'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                            notifPrefs[key] ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                    <div className="text-xs text-slate-500">
                      {alerts.length} alert{alerts.length !== 1 ? 's' : ''} in history
                      {alerts.length > 0 && (
                        <button onClick={clearAll} className="ml-2 text-red-400 hover:underline">Clear all</button>
                      )}
                    </div>
                    <button
                      id="save-notif-btn"
                      onClick={handleSaveNotifs}
                      disabled={saving}
                      className="flex items-center gap-2 bg-cyan-400 text-navy-900 font-bold px-5 py-2 rounded-xl text-sm glow-cyan hover:bg-cyan-500 transition-colors disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Save
                    </button>
                  </div>
                </div>

                {/* Real-world note */}
                <div className="glass border border-cyan-400/10 rounded-2xl p-4 text-xs text-slate-400 leading-relaxed">
                  <span className="text-cyan-400 font-semibold">Real-world escalation: </span>
                  In a production hospital system, SMS alerts integrate with a pager gateway (e.g. PagerDuty or Twilio).
                  Email digests are sent via SendGrid with HL7-compliant patient summaries. All notification logs are
                  audit-trailed for HIPAA compliance.
                </div>
              </motion.div>
            )}

            {/* ── Security ── */}
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="glass border border-cyan-400/10 rounded-2xl p-6">
                  <h2 className="text-white font-bold mb-6 flex items-center gap-2"><Shield size={18} /> Security Settings</h2>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="relative">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Current Password</label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={oldPass}
                        onChange={(e) => setOldPass(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 pr-10 py-2.5 text-white focus:border-cyan-400/50 outline-none text-sm"
                      />
                      <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-8 text-slate-500 hover:text-white transition-colors">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full bg-navy-900 border border-white/10 rounded-xl px-4 pr-10 py-2.5 text-white focus:border-cyan-400/50 outline-none text-sm"
                      />
                      <button type="button" onClick={() => setShowNewPass((v) => !v)} className="absolute right-3 top-8 text-slate-500 hover:text-white transition-colors">
                        {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        id="change-password-btn"
                        className="flex items-center gap-2 bg-cyan-400 text-navy-900 font-bold px-6 py-2.5 rounded-xl text-sm glow-cyan hover:bg-cyan-500 transition-colors disabled:opacity-60"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                        Change Password
                      </button>
                    </div>
                  </form>
                </div>

                <div className="glass border border-cyan-400/10 rounded-2xl p-4 space-y-3">
                  <h3 className="text-white font-semibold text-sm">Active Sessions</h3>
                  <div className="flex items-center justify-between p-3 bg-navy-900/50 rounded-xl border border-white/5">
                    <div>
                      <div className="text-white text-sm font-medium">Current session</div>
                      <div className="text-slate-500 text-xs">Browser · {new Date().toLocaleDateString()}</div>
                    </div>
                    <span className="text-xs text-medical-green font-semibold bg-medical-green/10 px-2 py-1 rounded">Active</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Appearance ── */}
            {activeTab === 'appearance' && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass border border-cyan-400/10 rounded-2xl p-6"
              >
                <h2 className="text-white font-bold mb-6 flex items-center gap-2"><PaintBucket size={18} /> Appearance</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-navy-900/50 rounded-xl border border-white/5">
                    <div>
                      <div className="text-white font-medium text-sm">Theme Mode</div>
                      <div className="text-slate-400 text-xs">Currently: {isDark ? '🌙 Dark' : '☀️ Light'}</div>
                    </div>
                    <button
                      id="theme-toggle-settings"
                      onClick={toggle}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isDark ? 'bg-cyan-400' : 'bg-navy-800 border border-white/10'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-navy-900/50 rounded-xl border border-white/5">
                    <div>
                      <div className="text-white font-medium text-sm">Compact Mode</div>
                      <div className="text-slate-400 text-xs">Reduce spacing for more information density</div>
                    </div>
                    <button className="relative w-12 h-6 rounded-full bg-navy-800 border border-white/10 transition-colors">
                      <div className="absolute top-0.5 translate-x-0.5 w-5 h-5 rounded-full bg-white/30 shadow" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
