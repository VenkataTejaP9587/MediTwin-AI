import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bell, BellOff, AlertTriangle, CheckCircle2, Clock,
  ShieldAlert, Trash2, Check,
} from 'lucide-react';
import { useAlertStore } from '../store/uiStore';

export default function NotificationsDrawer({ open, onClose }) {
  const { alerts, resolveAlert, clearAll } = useAlertStore();

  const unresolved = alerts.filter((a) => !a.resolved);
  const resolved   = alerts.filter((a) => a.resolved);

  const severityStyle = (sev) => {
    if (sev === 'critical')
      return 'bg-red-500/10 border-red-500/30 text-red-400';
    if (sev === 'warning')
      return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
    return 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400';
  };

  const SeverityIcon = ({ sev }) => {
    if (sev === 'critical') return <ShieldAlert size={14} className="text-red-400 flex-shrink-0" />;
    if (sev === 'warning')  return <AlertTriangle size={14} className="text-orange-400 flex-shrink-0" />;
    return <Bell size={14} className="text-cyan-400 flex-shrink-0" />;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="notif-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
          />

          {/* Drawer */}
          <motion.div
            key="notif-drawer"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm z-[90] flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #0d1526 0%, #0a1020 100%)',
              borderLeft: '1px solid rgba(0,212,255,0.15)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                  <Bell size={16} className="text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Notifications</h2>
                  {unresolved.length > 0 ? (
                    <p className="text-xs text-red-400">{unresolved.length} unresolved alert{unresolved.length > 1 ? 's' : ''}</p>
                  ) : (
                    <p className="text-xs text-slate-500">All clear</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {alerts.length > 0 && (
                  <button
                    onClick={clearAll}
                    title="Clear all"
                    className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 flex-shrink-0">
              <div className="flex-1 py-2.5 text-center text-xs font-semibold text-cyan-400 border-b-2 border-cyan-400">
                Active ({unresolved.length})
              </div>
              <div className="flex-1 py-2.5 text-center text-xs font-semibold text-slate-500">
                Resolved ({resolved.length})
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {unresolved.length === 0 && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-48 text-slate-500"
                  >
                    <CheckCircle2 size={40} className="mb-3 text-medical-green/40" />
                    <p className="text-sm">No active alerts</p>
                    <p className="text-xs mt-1">All patients are stable</p>
                  </motion.div>
                )}

                {unresolved.map((alert) => (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    className={`border rounded-xl p-3 ${severityStyle(alert.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      <SeverityIcon sev={alert.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white text-xs font-bold truncate">
                            {alert.patient_name || 'Patient'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0 ${
                            alert.severity === 'critical'
                              ? 'bg-red-500/20 text-red-400'
                              : alert.severity === 'warning'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-cyan-400/20 text-cyan-400'
                          }`}>
                            {alert.severity || 'info'}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs mt-0.5 leading-relaxed">{alert.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock size={10} />
                            {alert.timestamp
                              ? new Date(alert.timestamp).toLocaleTimeString()
                              : 'Now'}
                          </div>
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                          >
                            <Check size={10} /> Acknowledge
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Resolved section */}
                {resolved.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 px-1 mb-2">
                      Resolved
                    </div>
                    {resolved.slice(0, 10).map((alert) => (
                      <div
                        key={alert.id}
                        className="border border-white/5 rounded-xl p-3 mb-2 opacity-40"
                      >
                        <div className="flex items-center gap-2">
                          <BellOff size={12} className="text-slate-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-400 text-xs font-medium truncate">{alert.patient_name}</div>
                            <div className="text-slate-500 text-[11px] truncate">{alert.message}</div>
                          </div>
                          <CheckCircle2 size={14} className="text-medical-green flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer — real-world escalation note */}
            <div className="px-4 py-3 border-t border-white/5 flex-shrink-0">
              <div className="flex items-start gap-2 bg-cyan-400/5 border border-cyan-400/15 rounded-xl p-3">
                <ShieldAlert size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Critical alerts are auto-escalated to the on-call team via SMS/pager.
                  Acknowledge to confirm receipt and stop escalation.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
