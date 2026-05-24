import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, User, Eye, EyeOff, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const DEMO_ACCOUNTS = [
  { role: 'doctor', label: '🩺 Doctor', color: '#00d4ff' },
  { role: 'admin', label: '⚙️ Admin', color: '#8b5cf6' },
  { role: 'patient', label: '🏥 Patient', color: '#00ff88' },
];

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'doctor' });
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await authAPI.login(form.email, form.password);
      } else {
        res = await authAPI.register(form);
      }
      login(res.data.user, res.data.access_token);
      toast.success(`Welcome, ${res.data.user.name.split(' ')[0]}! 👋`);
      navigate(res.data.user.role === 'patient' ? '/patient-portal' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (role) => {
    setLoading(true);
    try {
      const res = await authAPI.demoLogin(role);
      login(res.data.user, res.data.access_token);
      toast.success(`Demo login as ${role} 🚀`);
      navigate(role === 'patient' ? '/patient-portal' : '/dashboard');
    } catch {
      toast.error('Demo login failed — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-cyan-400/5 rounded-full blur-3xl" />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mx-auto mb-4 glow-cyan">
            <Heart size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">MediSync <span className="text-cyan-400">AI</span></h1>
          <p className="text-slate-400 text-sm mt-1">Smart Virtual Patient Monitoring</p>
        </div>

        {/* Card */}
        <div className="glass border border-cyan-400/15 rounded-3xl p-8">
          {/* Mode tabs */}
          <div className="flex bg-navy-800 rounded-xl p-1 mb-6">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === m ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30' : 'text-slate-400 hover:text-white'
                }`}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" placeholder="Full Name" required
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-navy-800 border border-cyan-400/15 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 text-sm transition-colors"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email" placeholder="Email address" required
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-navy-800 border border-cyan-400/15 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 text-sm transition-colors"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'} placeholder="Password" required
                value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full bg-navy-800 border border-cyan-400/15 rounded-xl pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 text-sm transition-colors"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {mode === 'register' && (
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full bg-navy-800 border border-cyan-400/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 text-sm transition-colors">
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
                <option value="patient">Patient</option>
              </select>
            )}

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold py-3 rounded-xl transition-all glow-cyan disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">or try demo</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Demo login buttons */}
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map(({ role, label, color }) => (
              <motion.button
                key={role}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => demoLogin(role)}
                disabled={loading}
                className="py-2 rounded-xl text-xs font-semibold transition-all border"
                style={{
                  backgroundColor: color + '15',
                  borderColor: color + '40',
                  color: color,
                }}
              >
                <Zap size={12} className="inline mr-1" />
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2024 MediSync AI — Healthcare IoT Platform
        </p>
      </motion.div>
    </div>
  );
}
