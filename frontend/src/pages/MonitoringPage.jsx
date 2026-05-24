import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, ShieldAlert, CheckCircle, BellOff, Trash2 } from 'lucide-react';
import { patientAPI, createAllVitalsSocket } from '../services/api';
import ECGMonitor from '../components/ECGMonitor';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function MonitoringPage() {
  const [patients, setPatients]       = useState([]);
  const [liveVitals, setLiveVitals]   = useState({});
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading]         = useState(true);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const acknowledgeAlert = useCallback((id) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAlerts = () => setActiveAlerts([]);

  // ── Data + WebSocket ───────────────────────────────────────────────────────
  useEffect(() => {
    patientAPI.getAll().then((res) => {
      // Only show critical/recovering patients on the ICU monitor
      setPatients(res.data.filter((p) => ['critical', 'recovering'].includes(p.status)));
      setLoading(false);
    });

    const ws = createAllVitalsSocket((data) => {
      const newVitals = {};
      const newAlerts = [];
      data.patients.forEach((p) => {
        newVitals[p.patient_id] = p;
        if (p.alerts && p.alerts.length > 0) {
          p.alerts.forEach((a) =>
            newAlerts.push({
              ...a,
              patient_id:   p.patient_id,
              patient_name: p.patient_name,
              id:           Math.random().toString(36).substr(2, 9),
            })
          );
        }
      });
      setLiveVitals(newVitals);
      setActiveAlerts((prev) => [...newAlerts, ...prev].slice(0, 20));
    });

    return () => ws.close();
  }, []);

  if (loading) return <CardSkeleton count={6} />;

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      {/* Page header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-medical-red rounded-full animate-pulse" />
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">ICU Central Monitor</h1>
        </div>
        <div className="bg-navy-800 border border-cyan-400/20 px-4 py-2 rounded-xl text-cyan-400 font-mono text-sm flex items-center gap-2">
          <Activity size={16} /> LIVE FEED
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        {/* ── Main Monitoring Grid ── */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {patients.map((p) => {
            const vitals     = liveVitals[p.id] || {};
            const isCritical = p.status === 'critical';
            return (
              <div
                key={p.id}
                className={`glass border rounded-2xl p-4 flex flex-col ${
                  isCritical
                    ? 'border-medical-red/40 bg-medical-red/5 glow-red'
                    : 'border-cyan-400/20'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-white font-bold text-lg">{p.name}</h3>
                    <p className="text-slate-400 text-xs font-mono">{p.room} • {p.condition}</p>
                  </div>
                  {isCritical && <AlertTriangle className="text-medical-red animate-pulse" size={24} />}
                </div>

                <div className="flex-1 mb-3 bg-navy-900/50 rounded-xl overflow-hidden border border-white/5 relative">
                  <ECGMonitor data={vitals.ecg || []} color={isCritical ? '#ff3366' : '#00ff88'} height={100} />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'HR',   val: vitals.heart_rate,  color: '#ff3366' },
                    { label: 'SpO2', val: vitals.spo2,         color: '#00d4ff' },
                    { label: 'NIBP', val: `${vitals.systolic_bp || 0}/${vitals.diastolic_bp || 0}`, color: '#8b5cf6' },
                    { label: 'TEMP', val: vitals.temperature,  color: '#ff8c00' },
                  ].map((v) => (
                    <div key={v.label} className="bg-navy-900/50 rounded-lg p-2 text-center border border-white/5">
                      <div className="text-[10px] text-slate-500 font-bold">{v.label}</div>
                      <div className="text-sm font-black mt-1" style={{ color: v.color }}>{v.val || '--'}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {patients.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center text-slate-500 glass border-dashed border-cyan-400/20 rounded-2xl h-64">
              <CheckCircle size={48} className="mb-4 text-medical-green/50" />
              <p className="text-lg">No critical patients in ICU</p>
            </div>
          )}
        </div>

        {/* ── Alerts Sidebar ── */}
        <div className="glass border border-medical-red/20 rounded-2xl flex flex-col overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-medical-red animate-pulse" />

          {/* Sidebar header */}
          <div className="p-4 border-b border-white/5 bg-medical-red/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-medical-red" size={18} />
              <h2 className="text-white font-bold uppercase text-sm">
                Active Alerts
                {activeAlerts.length > 0 && (
                  <span className="ml-2 bg-medical-red text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {activeAlerts.length}
                  </span>
                )}
              </h2>
            </div>
            {activeAlerts.length > 0 && (
              <button
                id="clear-all-alerts"
                onClick={clearAlerts}
                title="Clear all alerts"
                className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Alert list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <AnimatePresence>
              {activeAlerts.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className={`p-3 rounded-xl border ${
                    a.severity === 'critical'
                      ? 'bg-medical-red/10 border-medical-red/30 text-medical-red'
                      : 'bg-medical-orange/10 border-medical-orange/30 text-medical-orange'
                  }`}
                >
                  <div className="text-xs font-bold mb-1">{a.patient_name}</div>
                  <div className="text-sm text-white/90">{a.message}</div>
                  <div className="text-[10px] mt-2 opacity-60 font-mono flex justify-between items-center">
                    <span>{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Now'}</span>
                    <button
                      id={`ack-alert-${a.id}`}
                      onClick={() => acknowledgeAlert(a.id)}
                      className="hover:text-white uppercase tracking-wider flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-white/10"
                    >
                      <BellOff size={10} /> ACK
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {activeAlerts.length === 0 && (
              <div className="text-center text-slate-500 py-10 text-sm flex flex-col items-center gap-2">
                <CheckCircle size={32} className="text-medical-green/30" />
                Queue empty
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
