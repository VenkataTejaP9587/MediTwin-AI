import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Activity, AlertTriangle, Users, Search, Plus, ExternalLink } from 'lucide-react';
import VitalsCard from '../components/VitalsCard';
import { patientAPI, createAllVitalsSocket } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useAlertStore } from '../store/uiStore';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [liveVitals, setLiveVitals] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { addAlert } = useAlertStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    const ws = createAllVitalsSocket(
      (data) => {
        const newVitals = {};
        data.patients.forEach(p => {
          newVitals[p.patient_id] = p;
          if (p.alerts && p.alerts.length > 0) {
             p.alerts.forEach(a => addAlert({ ...a, patient_id: p.patient_id, patient_name: p.patient_name, id: Math.random().toString(36).substr(2, 9) }));
          }
        });
        setLiveVitals(newVitals);
      },
      (err) => console.error("WS Error", err)
    );
    return () => ws.close();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([patientAPI.getAll(), patientAPI.stats()]);
      setPatients(pRes.data);
      setStats(sRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="space-y-6">
      <CardSkeleton count={4} />
      <CardSkeleton count={1} className="h-64" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm">Real-time patient monitoring and alerts</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-navy-800 border border-cyan-400/20 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50"
            />
          </div>
          <button onClick={() => navigate('/patients')} className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-500 text-navy-900 font-semibold px-4 py-2 rounded-xl transition-colors glow-cyan text-sm whitespace-nowrap">
            <Plus size={16} /> Add Patient
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={stats?.total || 0} icon={Users} color="#00d4ff" />
        <StatCard title="Critical" value={stats?.critical || 0} icon={AlertTriangle} color="#ff3366" glow />
        <StatCard title="Recovering" value={stats?.recovering || 0} icon={Activity} color="#ff8c00" />
        <StatCard title="Stable" value={stats?.stable || 0} icon={Heart} color="#00ff88" />
      </div>

      {/* Patient Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Active Monitoring</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredPatients.map(p => {
              const vitals = liveVitals[p.id] || {};
              const hr = vitals.heart_rate || '--';
              const spo2 = vitals.spo2 || '--';
              const sbp = vitals.systolic_bp || '--';
              const dbp = vitals.diastolic_bp || '--';
              
              const isCritical = p.status === 'critical';
              const cardBg = isCritical ? 'bg-medical-red/5 border-medical-red/30 glow-red' : 'bg-navy-800/50 border-cyan-400/10 hover:border-cyan-400/30';

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className={`border rounded-2xl p-5 cursor-pointer transition-all duration-300 ${cardBg}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-white font-bold">{p.name}</h3>
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <span className="text-slate-400">{p.room}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">{p.age} yo {p.gender}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${
                      isCritical ? 'bg-medical-red/20 border-medical-red text-medical-red animate-pulse' : 
                      p.status === 'recovering' ? 'bg-medical-orange/20 border-medical-orange/50 text-medical-orange' :
                      'bg-medical-green/20 border-medical-green/50 text-medical-green'
                    }`}>
                      {p.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-navy-900/50 rounded-lg p-2 text-center border border-white/5">
                      <div className="text-[10px] text-slate-500 mb-1">HR (bpm)</div>
                      <div className={`text-lg font-bold ${hr > 100 || hr < 60 ? 'text-medical-red' : 'text-cyan-400'}`}>
                        {hr}
                      </div>
                    </div>
                    <div className="bg-navy-900/50 rounded-lg p-2 text-center border border-white/5">
                      <div className="text-[10px] text-slate-500 mb-1">SpO2 (%)</div>
                      <div className={`text-lg font-bold ${spo2 < 95 ? 'text-medical-red' : 'text-medical-green'}`}>
                        {spo2}
                      </div>
                    </div>
                    <div className="bg-navy-900/50 rounded-lg p-2 text-center border border-white/5">
                      <div className="text-[10px] text-slate-500 mb-1">BP (mmHg)</div>
                      <div className="text-sm font-bold text-purple-400 mt-1">
                        {sbp}/{dbp}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="text-xs text-slate-400 truncate pr-2">
                      <span className="text-slate-500">Cond:</span> {p.condition}
                    </div>
                    <ExternalLink size={14} className="text-slate-500" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, glow }) {
  return (
    <div className={`glass border rounded-2xl p-4 flex items-center gap-4 ${glow ? 'border-medical-red/30 glow-red' : 'border-cyan-400/10'}`}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
        <Icon size={24} style={{ color }} />
      </div>
      <div>
        <div className="text-slate-400 text-xs font-medium">{title}</div>
        <div className="text-2xl font-bold text-white leading-tight">{value}</div>
      </div>
    </div>
  );
}
