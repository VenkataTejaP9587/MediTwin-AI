import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Phone, CheckCircle2 } from 'lucide-react';
import { useAlertStore } from '../store/uiStore';
import toast from 'react-hot-toast';

export default function EmergencyAlert({ alerts }) {
  const { dismissEmergency } = useAlertStore();
  const [calledICU, setCalledICU] = useState({});

  const handleCallICU = (alert) => {
    // Mark this alert as having triggered an ICU call
    setCalledICU((prev) => ({ ...prev, [alert.id]: true }));
    toast.success(
      `🚨 ICU Team alerted for ${alert.patient_name || 'patient'}!\nOn-call physician notified via pager.`,
      { duration: 5000, icon: '📟' }
    );
    // In a real deployment: POST /api/alerts/{id}/escalate
    // which triggers SMS/pager to on-call doctor
    console.info('[Real-world] Would trigger SMS/pager escalation for alert:', alert.id);
  };

  return (
    <AnimatePresence>
      {alerts.map((alert, i) => (
        <motion.div
          key={alert.id || i}
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="fixed right-6 z-[100] max-w-sm w-full"
          style={{ top: `${88 + i * 130}px` }}
        >
          <div className="glass border border-medical-red/60 rounded-2xl p-4 glow-red">
            {/* Pulsing top bar */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-medical-red animate-pulse" />

            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-medical-red/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-medical-red" />
                </div>
                <div className="absolute inset-0 rounded-full bg-medical-red/20 ping-slow" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-medical-red font-bold text-xs uppercase tracking-wide animate-pulse">
                    🚨 CRITICAL ALERT
                  </span>
                </div>
                <p className="text-white font-semibold text-sm">{alert.patient_name || 'Patient'}</p>
                <p className="text-slate-300 text-xs mt-0.5">{alert.message}</p>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3">
                  {calledICU[alert.id] ? (
                    <div className="flex items-center gap-1 text-medical-green text-xs font-semibold">
                      <CheckCircle2 size={12} />
                      ICU Notified
                    </div>
                  ) : (
                    <button
                      id={`call-icu-${alert.id}`}
                      onClick={() => handleCallICU(alert)}
                      className="flex items-center gap-1 bg-medical-red/20 hover:bg-medical-red/40 text-medical-red text-xs px-3 py-1.5 rounded-lg transition-colors font-semibold"
                    >
                      <Phone size={12} /> Call ICU
                    </button>
                  )}
                  <button
                    id={`dismiss-alert-${alert.id}`}
                    onClick={() => dismissEmergency(alert.id)}
                    className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {/* Close */}
              <button
                onClick={() => dismissEmergency(alert.id)}
                className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
