import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Activity, Thermometer, Droplets, Wind, ArrowLeft, Brain, ShieldAlert,
  FileText, X, Copy, CheckCircle2, Loader2, Sparkles, TrendingUp, TrendingDown,
  Minus, AlertTriangle, Video, Zap, Syringe, Pill, HeartPulse, ShieldCheck,
  FlaskConical, CheckCheck
} from 'lucide-react';
import { patientAPI, vitalsAPI, predictAPI, createVitalsSocket, clinicalAPI } from '../services/api';
import VitalsCard from '../components/VitalsCard';
import ECGMonitor from '../components/ECGMonitor';
import RiskMeter from '../components/RiskMeter';
import DigitalTwin3D from '../components/DigitalTwin3D';
import { CardSkeleton } from '../components/LoadingSkeleton';
import TelemedicineModal from '../components/TelemedicineModal';

// ─── Clinical treatment definitions ───────────────────────────────────────
const CLINICAL_TREATMENTS = [
  {
    key: 'oxygen',
    label: 'Supplemental Oxygen',
    shortLabel: 'O₂ Therapy',
    icon: Wind,
    color: '#00d4ff',
    glowColor: 'rgba(0,212,255,0.35)',
    borderColor: 'border-cyan-400/40',
    hoverBorder: 'hover:border-cyan-400/80',
    bgColor: 'bg-cyan-400/10',
    textColor: 'text-cyan-300',
    badgeColor: 'bg-cyan-400/20 text-cyan-300',
    description: 'Titrated supplemental O₂ via non-rebreather mask. Targets SpO₂ ≥ 95%. Resolves hypoxemia.',
    targetStatus: 'recovering',
    badge: 'Hypoxemia Protocol',
  },
  {
    key: 'fluids_antibiotics',
    label: 'Fluids & Antibiotics',
    shortLabel: 'Sepsis Protocol',
    icon: FlaskConical,
    color: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.35)',
    borderColor: 'border-amber-400/40',
    hoverBorder: 'hover:border-amber-400/80',
    bgColor: 'bg-amber-400/10',
    textColor: 'text-amber-300',
    badgeColor: 'bg-amber-400/20 text-amber-300',
    description: 'Broad-spectrum IV antibiotics + aggressive 30 mL/kg crystalloid bolus. SCCM Surviving Sepsis Bundle.',
    targetStatus: 'recovering',
    badge: 'Sepsis Bundle Active',
  },
  {
    key: 'antipyretic',
    label: 'IV Antipyretic',
    shortLabel: 'Paracetamol IV',
    icon: Thermometer,
    color: '#f97316',
    glowColor: 'rgba(249,115,22,0.35)',
    borderColor: 'border-orange-400/40',
    hoverBorder: 'hover:border-orange-400/80',
    bgColor: 'bg-orange-400/10',
    textColor: 'text-orange-300',
    badgeColor: 'bg-orange-400/20 text-orange-300',
    description: 'Intravenous paracetamol 1g infusion over 15 min. Reduces pyrexia, normalises core temperature.',
    targetStatus: 'recovering',
    badge: 'Antipyretic Active',
  },
  {
    key: 'beta_blocker',
    label: 'Beta-Blocker',
    shortLabel: 'Metoprolol IV',
    icon: HeartPulse,
    color: '#a855f7',
    glowColor: 'rgba(168,85,247,0.35)',
    borderColor: 'border-purple-400/40',
    hoverBorder: 'hover:border-purple-400/80',
    bgColor: 'bg-purple-400/10',
    textColor: 'text-purple-300',
    badgeColor: 'bg-purple-400/20 text-purple-300',
    description: 'Cardio-selective β1-blocker. Reduces tachycardia & systolic load. Haemodynamic stabilisation.',
    targetStatus: 'stable',
    badge: 'Cardiac Stabilised',
  },
];

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Handover Report State
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Telemedicine State
  const [teleOpen, setTeleOpen] = useState(false);

  // SOAP Note State
  const [showSoap, setShowSoap] = useState(false);
  const [soapData, setSoapData] = useState(null);
  const [soapLoading, setSoapLoading] = useState(false);
  const [soapCopied, setSoapCopied] = useState(false);

  // Deterioration Forecast State
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Clinical Interventions State
  const [interventionLoading, setInterventionLoading] = useState(null); // key of active treatment
  const [toasts, setToasts] = useState([]);                              // [{id, type, title, message}]
  const [appliedTreatments, setAppliedTreatments] = useState([]);       // keys of applied treatments

  // Toast helpers
  const pushToast = useCallback((type, title, message) => {
    const tid = Date.now();
    setToasts(prev => [...prev, { id: tid, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 5000);
  }, []);

  useEffect(() => {
    fetchData();
    const ws = createVitalsSocket(
      id,
      (data) => setVitals(data),
      (err) => console.error('WS Error', err)
    );
    return () => ws.close();
  }, [id]);

  const fetchData = async () => {
    try {
      const [pRes, vRes, predRes] = await Promise.all([
        patientAPI.getById(id),
        vitalsAPI.snapshot(id),
        predictAPI.quick(id)
      ]);
      setPatient(pRes.data);
      setVitals(vRes.data);
      setPredictions(predRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const administerIntervention = async (treatment) => {
    if (interventionLoading) return;
    const def = CLINICAL_TREATMENTS.find(t => t.key === treatment);
    setInterventionLoading(treatment);
    try {
      const res = await clinicalAPI.intervention(id, treatment);
      const { new_status, message } = res.data;
      // Instantly update local patient status — WebSocket will follow on next tick
      setPatient(prev => ({ ...prev, status: new_status }));
      setAppliedTreatments(prev => [...new Set([...prev, treatment])]);
      pushToast(
        'success',
        `✅ Intervention Audited & Executed`,
        message || `${def?.label} administered. Status → ${new_status}.`
      );
    } catch (err) {
      pushToast(
        'error',
        '❌ Intervention Failed',
        err?.response?.data?.detail || 'Backend unreachable. Check server connection.'
      );
    } finally {
      setInterventionLoading(null);
    }
  };

  const generateReport = async () => {
    setReportLoading(true);
    setShowReport(true);
    try {
      // Simulate slight delay for "AI thinking"
      await new Promise(r => setTimeout(r, 1200));
      const res = await fetch(`http://127.0.0.1:8000/api/reports/handover/${id}`);
      const data = await res.json();
      setReportData(data.report);
    } catch (e) {
      console.error('Failed to generate report', e);
      setReportData("Error generating report. Please check backend connection.");
    } finally {
      setReportLoading(false);
    }
  };

  const copyReport = () => {
    if (reportData) {
      navigator.clipboard.writeText(reportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateSoap = async () => {
    setSoapLoading(true);
    setShowSoap(true);
    try {
      const res = await clinicalAPI.soap(id);
      setSoapData(res.data.note);
    } catch (e) {
      setSoapData('Error generating SOAP note. Please check backend connection.');
    } finally {
      setSoapLoading(false);
    }
  };

  const copySoap = () => {
    if (soapData) {
      navigator.clipboard.writeText(soapData);
      setSoapCopied(true);
      setTimeout(() => setSoapCopied(false), 2000);
    }
  };

  const loadForecast = async () => {
    setForecastLoading(true);
    try {
      const res = await clinicalAPI.forecast(id);
      setForecast(res.data);
    } catch (e) {
      console.error('Forecast error', e);
    } finally {
      setForecastLoading(false);
    }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-8"><div className="w-10 h-10 bg-slate-800 rounded-xl" /><div className="w-48 h-10 bg-slate-800 rounded-xl" /></div>
      <CardSkeleton count={4} />
      <CardSkeleton count={1} className="h-64" />
    </div>
  );

  if (!patient) return <div className="text-white text-center py-20">Patient not found</div>;

  const hr = vitals?.heart_rate || 0;
  const spo2 = vitals?.spo2 || 0;
  const temp = vitals?.temperature || 0;
  const sys = vitals?.systolic_bp || 0;
  const dia = vitals?.diastolic_bp || 0;
  const rr = vitals?.respiration_rate || 0;

  return (
    <div className="space-y-6">

      {/* ── Toast Notification Stack ── */}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={`pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border max-w-sm ${
                t.type === 'success'
                  ? 'bg-[#0d2b1f] border-emerald-400/40 shadow-emerald-500/20'
                  : 'bg-[#2b0d0d] border-red-400/40 shadow-red-500/20'
              }`}
              style={{ boxShadow: t.type === 'success' ? '0 0 32px rgba(16,185,129,0.25)' : '0 0 32px rgba(239,68,68,0.25)' }}
            >
              <div className={`mt-0.5 w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                t.type === 'success' ? 'bg-emerald-400/20' : 'bg-red-400/20'
              }`}>
                {t.type === 'success'
                  ? <ShieldCheck size={16} className="text-emerald-400" />
                  : <ShieldAlert size={16} className="text-red-400" />}
              </div>
              <div>
                <div className={`text-sm font-bold ${ t.type === 'success' ? 'text-emerald-300' : 'text-red-300' }`}>
                  {t.title}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{t.message}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-navy-800 hover:bg-navy-700 text-slate-400 hover:text-white rounded-xl transition-colors border border-cyan-400/10">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {patient.name}
            <AnimatePresence mode="wait">
              <motion.span
                key={patient.status}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className={`text-xs px-2 py-1 rounded border uppercase tracking-wider font-bold ${
                  patient.status === 'critical' ? 'bg-medical-red/20 text-medical-red border-medical-red/30 animate-pulse' :
                  patient.status === 'recovering' ? 'bg-medical-orange/20 text-medical-orange border-medical-orange/30' :
                  'bg-medical-green/20 text-medical-green border-medical-green/30'
                }`}
              >
                {patient.status}
              </motion.span>
            </AnimatePresence>
          </h1>
          <p className="text-slate-400 text-sm mt-1">ID: {patient.id} • Room: {patient.room} • {patient.age} yo {patient.gender}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTeleOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-xl transition-all text-sm font-semibold shadow-lg"
            style={{ boxShadow: '0 0 16px rgba(0,212,255,0.3)' }}
          >
            <Video size={16} /> Video Consult
          </button>
          <button 
            onClick={loadForecast}
            className="flex items-center gap-2 bg-navy-800 border border-purple-500/30 hover:border-purple-500/60 text-purple-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <TrendingUp size={16} /> Forecast
          </button>
          <button 
            onClick={generateSoap}
            className="flex items-center gap-2 bg-navy-800 border border-yellow-400/30 hover:border-yellow-400/60 text-yellow-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Sparkles size={16} /> SOAP Note
          </button>
          <button 
            onClick={generateReport}
            className="flex items-center gap-2 bg-navy-800 border border-cyan-400/20 hover:border-cyan-400/50 text-cyan-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <FileText size={16} /> AI Handover
          </button>
        </div>
      </div>

      {/* Main Vitals Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <VitalsCard 
          label="Heart Rate" value={hr} unit="bpm" icon={Heart} color="#ff3366"
          status={hr > 120 || hr < 50 ? 'critical' : hr > 100 || hr < 60 ? 'warning' : 'normal'}
          trend={hr > 90 ? 'up' : 'stable'}
        />
        <VitalsCard 
          label="SpO2" value={spo2} unit="%" icon={Wind} color="#00d4ff"
          status={spo2 < 90 ? 'critical' : spo2 < 95 ? 'warning' : 'good'}
          trend={spo2 < 95 ? 'down' : 'stable'}
        />
        <VitalsCard 
          label="Blood Pressure" value={`${sys}/${dia}`} unit="mmHg" icon={Activity} color="#8b5cf6"
          status={sys > 160 ? 'critical' : sys > 130 ? 'warning' : 'normal'}
          trend="stable"
        />
        <VitalsCard 
          label="Temperature" value={temp} unit="°C" icon={Thermometer} color="#ff8c00"
          status={temp > 39 ? 'critical' : temp > 37.5 ? 'warning' : 'normal'}
          trend={temp > 37.5 ? 'up' : 'stable'}
        />
        <VitalsCard 
          label="Respiration" value={rr} unit="br/m" icon={Droplets} color="#34d399"
          status={rr > 24 || rr < 10 ? 'warning' : 'normal'}
          trend="stable"
        />
      </div>

      {/* ECG & AI Models */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass border border-cyan-400/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2"><Activity size={18} className="text-medical-green" /> Live ECG Stream</h2>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-medical-green rounded-full animate-pulse" />
              <span className="text-medical-green font-mono">Connected</span>
            </div>
          </div>
          <ECGMonitor data={vitals?.ecg || []} color="#00ff88" height={180} />
          
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-cyan-400/10 pt-6">
            <div>
              <h3 className="text-slate-400 text-xs uppercase font-bold mb-2">Medical History</h3>
              <div className="flex flex-wrap gap-2">
                {patient.medical_history.map(m => (
                  <span key={m} className="bg-navy-800 text-slate-300 text-xs px-2 py-1 rounded border border-white/5">{m}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-slate-400 text-xs uppercase font-bold mb-2">Medications</h3>
              <div className="flex flex-wrap gap-2">
                {patient.medications.map(m => (
                  <span key={m} className="bg-cyan-400/10 text-cyan-400 text-xs px-2 py-1 rounded border border-cyan-400/20">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Digital Twin & AI Predictions Sidebar */}
        <div className="space-y-6">
          <div className="h-[350px]">
            <DigitalTwin3D vitals={vitals} />
          </div>

          <div className="glass border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
            <h2 className="text-white font-bold mb-6 flex items-center gap-2"><Brain size={18} className="text-purple-400" /> AI Risk Assessment</h2>
            
            {predictions?.heart && (
              <div className="mb-6 flex gap-4 items-center">
                <RiskMeter risk={predictions.heart.risk_percentage} label="Heart Disease Risk" size={120} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white mb-1">Heart Confidence: {predictions.heart.confidence}%</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{predictions.heart.recommendation}</p>
                </div>
              </div>
            )}
            
            {predictions?.sepsis && (
              <div className="mb-6 flex gap-4 items-center border-t border-white/5 pt-4">
                <RiskMeter risk={predictions.sepsis.risk_percentage} label="Sepsis Risk (CDSS)" size={120} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    {predictions.sepsis.risk_level === 'Critical' && <ShieldAlert size={14} className="text-medical-red" />}
                    {predictions.sepsis.risk_level} Risk
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{predictions.sepsis.recommendation}</p>
                </div>
              </div>
            )}
            
            <div className="border-t border-white/10 pt-4">
              <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Real-time Health Score</div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-cyan-400 glow-cyan">{predictions?.vitals_score?.health_score || '--'}</span>
                <span className="text-slate-500 text-sm mb-1">/ 100</span>
              </div>
              <div className="mt-2 space-y-1">
                {predictions?.vitals_score?.deductions?.map((d,i) => (
                  <div key={i} className="text-xs text-medical-red flex items-center gap-1"><ShieldAlert size={10} /> {d}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Clinical Interventions Panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-emerald-400/20 glass p-6"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(6,182,212,0.04) 100%)' }}
      >
        {/* Ambient glow blobs */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-500/8 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center">
              <Syringe size={18} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                Clinical Interventions
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400 border border-emerald-400/25 font-bold tracking-wider uppercase">LIVE</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Administer treatment · Updates vitals stream instantly · HIPAA audit logged</p>
            </div>
          </div>
          {appliedTreatments.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-xl">
              <CheckCheck size={13} />
              {appliedTreatments.length} intervention{appliedTreatments.length > 1 ? 's' : ''} applied
            </div>
          )}
        </div>

        {/* Intervention Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {CLINICAL_TREATMENTS.map((t) => {
            const Icon = t.icon;
            const isLoading = interventionLoading === t.key;
            const isApplied = appliedTreatments.includes(t.key);
            return (
              <motion.button
                key={t.key}
                id={`intervention-btn-${t.key}`}
                onClick={() => administerIntervention(t.key)}
                disabled={!!interventionLoading}
                whileHover={{ scale: interventionLoading ? 1 : 1.02, y: interventionLoading ? 0 : -2 }}
                whileTap={{ scale: 0.97 }}
                className={`relative group text-left p-4 rounded-xl border transition-all duration-300 overflow-hidden ${
                  isApplied
                    ? 'border-emerald-400/50 bg-emerald-400/8'
                    : `${t.borderColor} ${t.hoverBorder} ${t.bgColor}`
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                style={{
                  boxShadow: isApplied
                    ? '0 0 20px rgba(16,185,129,0.2)'
                    : isLoading
                    ? `0 0 24px ${t.glowColor}`
                    : 'none',
                  transition: 'box-shadow 0.3s ease, transform 0.2s ease'
                }}
              >
                {/* Hover glow sweep */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
                  style={{ background: `radial-gradient(circle at 50% 50%, ${t.glowColor} 0%, transparent 70%)` }}
                />

                {/* Loading shimmer */}
                {isLoading && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ background: `linear-gradient(90deg, transparent, ${t.glowColor}, transparent)` }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  />
                )}

                {/* Applied checkmark badge */}
                {isApplied && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center">
                    <CheckCircle2 size={11} className="text-emerald-400" />
                  </div>
                )}

                {/* Icon + Badge row */}
                <div className="flex items-start gap-3 mb-3 relative">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${t.glowColor.replace('0.35', '0.18')}`, border: `1px solid ${t.color}40` }}
                  >
                    {isLoading
                      ? <Loader2 size={16} className="animate-spin" style={{ color: t.color }} />
                      : <Icon size={16} style={{ color: t.color }} />
                    }
                  </div>
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase mt-1"
                    style={{ background: `${t.glowColor.replace('0.35', '0.18')}`, color: t.color, border: `1px solid ${t.color}35` }}
                  >
                    {t.badge}
                  </span>
                </div>

                {/* Labels */}
                <div className="relative">
                  <div className="text-white font-bold text-sm leading-tight mb-0.5">{t.label}</div>
                  <div className="text-[10px] font-semibold mb-2" style={{ color: t.color }}>{t.shortLabel}</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{t.description}</p>
                </div>

                {/* Administer CTA */}
                <div className="mt-4 relative">
                  <div
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                      isApplied
                        ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                        : 'border'
                    }`}
                    style={isApplied ? {} : {
                      background: `${t.glowColor.replace('0.35', '0.12')}`,
                      borderColor: `${t.color}50`,
                      color: t.color,
                    }}
                  >
                    {isLoading ? (
                      <><Loader2 size={12} className="animate-spin" /> Administering...</>
                    ) : isApplied ? (
                      <><CheckCircle2 size={12} /> Applied — Re-administer</>  
                    ) : (
                      <><Zap size={12} /> Administer Now</>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Footer disclaimer */}
        <div className="mt-5 flex items-center gap-2 text-[10px] text-slate-500 border-t border-white/5 pt-4">
          <ShieldCheck size={11} className="text-emerald-500/60" />
          All interventions are cryptographically timestamped and appended to the HIPAA-compliant audit trail with PII masking. Actions are irreversible in the audit log.
        </div>
      </motion.div>

      {/* Deterioration Forecast Inline Panel */}
      {(forecast || forecastLoading) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="glass border border-purple-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-400" /> Predictive Deterioration Forecast (MEWS)
            </h2>
            {forecastLoading && <Loader2 size={18} className="text-purple-400 animate-spin" />}
          </div>
          {forecast && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Score Card */}
              <div className="flex flex-col items-center justify-center glass rounded-xl p-6 border border-purple-500/20">
                <div className={`text-6xl font-black mb-2 ${
                  forecast.deterioration_forecast.color === 'red' ? 'text-medical-red' :
                  forecast.deterioration_forecast.color === 'orange' ? 'text-medical-orange' :
                  forecast.deterioration_forecast.color === 'yellow' ? 'text-yellow-400' : 'text-medical-green'
                }`}>{forecast.deterioration_forecast.deterioration_score}</div>
                <div className="text-slate-400 text-xs uppercase tracking-wider">/100 Deterioration Score</div>
                <div className={`mt-3 text-sm font-bold px-3 py-1 rounded-full ${
                  forecast.deterioration_forecast.color === 'red' ? 'bg-medical-red/20 text-medical-red' :
                  forecast.deterioration_forecast.color === 'orange' ? 'bg-medical-orange/20 text-medical-orange' :
                  forecast.deterioration_forecast.color === 'yellow' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-medical-green/20 text-medical-green'
                }`}>{forecast.deterioration_forecast.risk_level} Risk</div>
                <p className="text-center text-xs text-slate-400 mt-3 leading-relaxed">{forecast.deterioration_forecast.prediction_horizon}</p>
              </div>
              {/* Trend Details */}
              <div className="space-y-3">
                <h3 className="text-slate-400 text-xs uppercase font-bold tracking-wider">Trend Analysis</h3>
                {forecast.deterioration_forecast.trend_details.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle size={14} className="text-medical-orange mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">{d}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/5">
                  <div className="text-xs text-slate-500">MEWS Score: <span className="text-white font-bold">{forecast.deterioration_forecast.mews_raw}</span> | Trend Bonus: <span className="text-purple-400 font-bold">+{forecast.deterioration_forecast.trend_bonus}</span></div>
                </div>
              </div>
              {/* Trend Series Mini Chart */}
              <div className="space-y-2">
                <h3 className="text-slate-400 text-xs uppercase font-bold tracking-wider">6-Reading Vitals Trend</h3>
                {['heart_rate', 'spo2', 'temperature', 'systolic_bp'].map(key => {
                  const values = forecast.trend_series[key] || [];
                  const trend = values.length > 1 ? (values[values.length-1] > values[0] ? 'up' : 'down') : 'stable';
                  const labels = { heart_rate: 'HR', spo2: 'SpO2', temperature: 'Temp', systolic_bp: 'SBP' };
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs w-10">{labels[key]}</span>
                      <div className="flex-1 flex gap-0.5 items-end h-6">
                        {values.map((v, i) => {
                          const min = Math.min(...values), max = Math.max(...values);
                          const h = max > min ? ((v - min) / (max - min)) * 100 : 50;
                          return <div key={i} className="flex-1 bg-purple-400/30 rounded-sm" style={{ height: `${Math.max(10, h)}%` }} />;
                        })}
                      </div>
                      {trend === 'up' ? <TrendingUp size={12} className="text-medical-orange" /> :
                       trend === 'down' ? <TrendingDown size={12} className="text-medical-green" /> :
                       <Minus size={12} className="text-slate-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Handover Report Modal */}
      {showReport && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowReport(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div className="glass border border-cyan-400/30 rounded-3xl p-6 w-full max-w-2xl pointer-events-auto max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                    <FileText size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">AI Shift Handover</h2>
                    <p className="text-slate-400 text-xs">SBAR Format Generation</p>
                  </div>
                </div>
                <button onClick={() => setShowReport(false)} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 bg-navy-900/50 rounded-xl border border-white/5 p-4 text-sm text-slate-300">
                {reportLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 text-cyan-400">
                    <Loader2 size={32} className="animate-spin mb-4" />
                    <p className="font-semibold">Synthesizing patient history...</p>
                    <p className="text-xs text-slate-500 mt-2">Correlating live vitals with EHR data</p>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{reportData}</pre>
                )}
              </div>
              {!reportLoading && (
                <div className="mt-4 flex gap-3 flex-shrink-0">
                  <button onClick={copyReport}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/10 transition-colors font-semibold text-sm"
                  >
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied to Clipboard' : 'Copy to EHR'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* SOAP Note Modal */}
      {showSoap && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowSoap(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div className="glass border border-yellow-400/30 rounded-3xl p-6 w-full max-w-2xl pointer-events-auto max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                    <Sparkles size={20} className="text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">AI SOAP Clinical Note</h2>
                    <p className="text-slate-400 text-xs">Auto-generated Subjective • Objective • Assessment • Plan</p>
                  </div>
                </div>
                <button onClick={() => setShowSoap(false)} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-navy-900/50 rounded-xl border border-white/5 p-4 text-sm text-slate-300">
                {soapLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 text-yellow-400">
                    <Loader2 size={32} className="animate-spin mb-4" />
                    <p className="font-semibold">Generating SOAP Note...</p>
                    <p className="text-xs text-slate-500 mt-2">Analyzing vitals, risk factors & clinical history</p>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{soapData}</pre>
                )}
              </div>
              {!soapLoading && (
                <div className="mt-4 flex gap-3 flex-shrink-0">
                  <button onClick={copySoap}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/10 transition-colors font-semibold text-sm"
                  >
                    {soapCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    {soapCopied ? 'Copied to EHR' : 'Copy SOAP Note'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Telemedicine Modal */}
      <TelemedicineModal
        isOpen={teleOpen}
        onClose={() => setTeleOpen(false)}
        patientName={patient.name}
        doctorName="Dr. Aarav Sharma"
      />
    </div>
  );
}
