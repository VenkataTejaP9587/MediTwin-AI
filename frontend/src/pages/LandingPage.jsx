import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Activity, Shield, Zap, Brain, BarChart3, ArrowRight, Check } from 'lucide-react';

const features = [
  { icon: Activity, title: 'Real-Time IoT Simulation', desc: 'Live ECG, SpO2, heart rate, and BP streaming via WebSockets every 2 seconds.' },
  { icon: Brain, title: 'AI Health Predictions', desc: 'Scikit-learn models for heart disease and diabetes risk assessment with confidence scores.' },
  { icon: Shield, title: 'Emergency Alert System', desc: 'Instant critical alerts with threshold-based detection and push notifications.' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Daily/weekly PDF reports with trend charts and health score analysis.' },
  { icon: Zap, title: 'ICU-Style Dashboard', desc: 'Professional hospital monitoring UI with multi-patient simultaneous tracking.' },
  { icon: Heart, title: 'Multi-Role Access', desc: 'Doctor, Admin, and Patient portals with JWT-secured role-based access control.' },
];

const stats = [
  { label: 'Patients Monitored', value: '10,000+' },
  { label: 'Vitals/Second', value: '3M+' },
  { label: 'Alert Accuracy', value: '99.2%' },
  { label: 'Uptime', value: '99.97%' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-900 bg-grid text-white overflow-x-hidden">
      {/* Ambient glow orbs */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-cyan-400/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center glow-cyan">
              <Heart size={20} className="text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-xl">MediSync</span>
              <span className="text-cyan-400 font-light ml-1">AI</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')}
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
              Sign In
            </button>
            <button onClick={() => navigate('/login')}
              className="bg-cyan-400 hover:bg-cyan-500 text-navy-900 font-bold px-5 py-2 rounded-xl transition-all duration-200 text-sm glow-cyan">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-xs font-semibold px-4 py-2 rounded-full mb-8 animate-pulse">
              <div className="w-2 h-2 bg-medical-green rounded-full" />
              LIVE SYSTEM — AI-POWERED HEALTHCARE MONITORING
            </div>

            <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
              <span className="text-white">The Future of </span>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent text-glow-cyan">
                Patient Care
              </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              MediSync AI simulates real-time IoT patient monitoring with AI-powered health predictions,
              live ECG streams, emergency alerts, and a professional ICU-grade dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all duration-200 glow-cyan"
              >
                Launch Dashboard <ArrowRight size={20} />
              </motion.button>
              <button onClick={() => navigate('/login')}
                className="flex items-center gap-2 glass border border-cyan-400/30 text-cyan-400 font-semibold px-8 py-4 rounded-2xl text-lg hover:bg-cyan-400/5 transition-all">
                Demo Login
              </button>
            </div>
          </motion.div>

          {/* Animated vitals preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {[
              { label: 'Heart Rate', value: '72', unit: 'bpm', color: '#ff3366', icon: '❤️' },
              { label: 'SpO2', value: '98', unit: '%', color: '#00d4ff', icon: '🫁' },
              { label: 'Temperature', value: '36.8', unit: '°C', color: '#ff8c00', icon: '🌡️' },
              { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', color: '#8b5cf6', icon: '🩺' },
            ].map((vital, i) => (
              <motion.div
                key={vital.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="glass border border-white/5 rounded-2xl p-4 text-center card-hover"
                style={{ borderTopColor: vital.color + '40' }}
              >
                <div className="text-2xl mb-1">{vital.icon}</div>
                <div className="text-2xl font-black" style={{ color: vital.color }}>{vital.value}</div>
                <div className="text-slate-500 text-xs">{vital.unit}</div>
                <div className="text-slate-400 text-xs mt-1">{vital.label}</div>
                <motion.div
                  animate={{ scaleX: [0.8, 1.1, 0.9, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 + i * 0.2 }}
                  className="h-0.5 rounded-full mt-2"
                  style={{ backgroundColor: vital.color, opacity: 0.6 }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-cyan-400/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="text-slate-400 text-sm mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Everything You Need for{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Modern Healthcare
              </span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A complete IoT healthcare platform with AI, real-time monitoring, and enterprise-grade security.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass border border-cyan-400/10 rounded-2xl p-6 card-hover"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-600/10 flex items-center justify-center mb-4">
                  <f.icon size={24} className="text-cyan-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="glass border border-cyan-400/20 rounded-3xl p-12"
          >
            <h2 className="text-4xl font-black text-white mb-4">
              Ready to Monitor?
            </h2>
            <p className="text-slate-400 mb-8">
              Log in with demo credentials or create an account to explore the full platform.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8 text-sm text-left">
              {[
                { role: '🩺 Doctor', email: 'doctor@medisync.ai', pass: 'doctor123' },
                { role: '⚙️ Admin', email: 'admin@medisync.ai', pass: 'admin123' },
                { role: '🏥 Patient', email: 'patient@medisync.ai', pass: 'patient123' },
              ].map(r => (
                <div key={r.role} className="bg-navy-800 border border-cyan-400/10 rounded-xl p-4">
                  <div className="font-bold text-white mb-2">{r.role}</div>
                  <div className="text-slate-400 text-xs">{r.email}</div>
                  <div className="text-cyan-400 text-xs">{r.pass}</div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold px-10 py-4 rounded-2xl text-lg glow-cyan hover:opacity-90 transition-opacity">
              Enter MediSync AI <ArrowRight size={20} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cyan-400/10 py-8 px-6 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart size={16} className="text-medical-red" />
          <span className="text-white font-semibold">MediSync AI</span>
        </div>
        <p>Smart Virtual Patient Monitoring System • Built for Healthcare IoT Hackathons</p>
      </footer>
    </div>
  );
}
