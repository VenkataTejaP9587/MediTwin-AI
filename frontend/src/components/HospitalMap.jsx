import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Heart, Activity, User, MapPin, Zap } from 'lucide-react';

// Hospital floor plan configuration
const HOSPITAL_ROOMS = [
  // ICU Wing
  { id: 'ICU-101', label: 'ICU-101', x: 4, y: 4, w: 14, h: 10, wing: 'ICU', patientId: 'p1' },
  { id: 'ICU-102', label: 'ICU-102', x: 20, y: 4, w: 14, h: 10, wing: 'ICU', patientId: 'p2' },
  { id: 'ICU-103', label: 'ICU-103', x: 36, y: 4, w: 14, h: 10, wing: 'ICU', patientId: 'p3' },
  // Ward Wing
  { id: 'Ward-201', label: 'Ward-201', x: 4, y: 24, w: 12, h: 9, wing: 'Ward', patientId: 'p4' },
  { id: 'Ward-202', label: 'Ward-202', x: 18, y: 24, w: 12, h: 9, wing: 'Ward', patientId: 'p5' },
  { id: 'Ward-203', label: 'Ward-203', x: 32, y: 24, w: 12, h: 9, wing: 'Ward', patientId: 'p6' },
  // Shared areas
  { id: 'Nurses-Station', label: "Nurse's Station", x: 52, y: 4, w: 16, h: 14, wing: 'Staff', patientId: null },
  { id: 'Corridor', label: 'Corridor', x: 4, y: 16, w: 64, h: 6, wing: 'Corridor', patientId: null },
  { id: 'Supply', label: 'Supply Room', x: 52, y: 22, w: 16, h: 11, wing: 'Staff', patientId: null },
];

import { patientAPI, createAllVitalsSocket } from '../services/api';

const DEFAULT_PATIENTS_META = {
  p1: { name: 'Rajesh Kumar', status: 'stable' },
  p2: { name: 'Priyanka Rao', status: 'critical' },
  p3: { name: 'Harpreet Singh', status: 'critical' },
  p4: { name: 'Priya Patel', status: 'stable' },
  p5: { name: 'Vikram Malhotra', status: 'recovering' },
  p6: { name: 'Kavita Reddy', status: 'stable' },
};

function getRoomColor(room, alerts, patientsMeta) {
  if (!room.patientId) return { fill: 'rgba(22, 32, 64, 0.8)', stroke: 'rgba(0, 212, 255, 0.15)' };
  const patient = patientsMeta[room.patientId];
  const hasAlert = alerts.includes(room.patientId);
  if (hasAlert || patient?.status === 'critical') {
    return { fill: 'rgba(255, 51, 102, 0.15)', stroke: 'rgba(255, 51, 102, 0.7)' };
  }
  if (patient?.status === 'recovering') {
    return { fill: 'rgba(255, 140, 0, 0.12)', stroke: 'rgba(255, 140, 0, 0.5)' };
  }
  return { fill: 'rgba(0, 255, 136, 0.08)', stroke: 'rgba(0, 255, 136, 0.35)' };
}

function StatusDot({ status }) {
  const colors = {
    critical: 'bg-medical-red',
    recovering: 'bg-medical-orange',
    stable: 'bg-medical-green',
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-slate-500'} animate-pulse`} />;
}

export default function HospitalMap({ patients = [] }) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [patientsMeta, setPatientsMeta] = useState(DEFAULT_PATIENTS_META);

  useEffect(() => {
    // Fetch initial patients for meta
    patientAPI.getAll().then(res => {
      const meta = {};
      res.data.forEach(p => {
        meta[p.id] = { name: p.name, status: p.status };
      });
      setPatientsMeta(meta);
    }).catch(console.error);

    // Connect to WebSocket for real-time alerts
    const ws = createAllVitalsSocket(
      (data) => {
        if (data && data.patients) {
          const activeAlertIds = data.patients
            .filter(p => p.alerts && p.alerts.length > 0)
            .map(p => p.patient_id);
          setCriticalAlerts(activeAlertIds);
          
          // Optionally update patient statuses if they change
          setPatientsMeta(prev => {
            const next = { ...prev };
            data.patients.forEach(p => {
              if (next[p.patient_id] && p.status && next[p.patient_id].status !== p.status) {
                 next[p.patient_id] = { ...next[p.patient_id], status: p.status };
              }
            });
            return next;
          });
        }
      },
      (err) => console.error("WS Map error:", err)
    );

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const viewBox = '0 0 72 36';

  return (
    <div className="glass border border-cyan-400/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-400/10 flex items-center justify-center">
            <MapPin size={18} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-white font-bold">Live Hospital Floor Map</h2>
            <p className="text-slate-400 text-xs">Real-time room status & patient tracking</p>
          </div>
        </div>
        {/* Legend */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-medical-red/50 border border-medical-red" /><span className="text-slate-400">Critical Alert</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-medical-orange/40 border border-medical-orange/70" /><span className="text-slate-400">Recovering</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-medical-green/20 border border-medical-green/50" /><span className="text-slate-400">Stable</span></div>
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative rounded-xl overflow-hidden bg-navy-900 border border-cyan-400/10">
        <svg
          viewBox={viewBox}
          className="w-full"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Wing labels */}
          <text x="26" y="2.5" fill="rgba(0,212,255,0.5)" fontSize="1.5" textAnchor="middle" fontWeight="600">— ICU WING —</text>
          <text x="26" y="22.5" fill="rgba(0,212,255,0.3)" fontSize="1.5" textAnchor="middle" fontWeight="600">— WARD WING —</text>

          {HOSPITAL_ROOMS.map(room => {
            const colors = getRoomColor(room, criticalAlerts, patientsMeta);
            const isSelected = selectedRoom?.id === room.id;
            const patient = room.patientId ? patientsMeta[room.patientId] : null;
            const isCritical = criticalAlerts.includes(room.patientId) || patient?.status === 'critical';

            return (
              <g key={room.id} onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)} style={{ cursor: room.patientId ? 'pointer' : 'default' }}>
                {/* Pulsing glow for critical rooms */}
                {isCritical && (
                  <rect
                    x={room.x - 0.5} y={room.y - 0.5}
                    width={room.w + 1} height={room.h + 1}
                    rx="1" ry="1"
                    fill="none"
                    stroke="rgba(255,51,102,0.5)"
                    strokeWidth="0.8"
                    style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                  />
                )}
                {/* Room rectangle */}
                <rect
                  x={room.x} y={room.y}
                  width={room.w} height={room.h}
                  rx="0.8" ry="0.8"
                  fill={isSelected ? 'rgba(0,212,255,0.2)' : colors.fill}
                  stroke={isSelected ? 'rgba(0,212,255,0.9)' : colors.stroke}
                  strokeWidth={isSelected ? '0.5' : '0.3'}
                />
                {/* Room label */}
                <text
                  x={room.x + room.w / 2} y={room.y + room.h / 2 - (patient ? 1.2 : 0)}
                  fill={isCritical ? '#ff3366' : 'rgba(226,232,240,0.9)'}
                  fontSize="1.4" textAnchor="middle" fontWeight={isCritical ? '700' : '500'}
                >
                  {room.label}
                </text>
                {/* Patient name */}
                {patient && (
                  <text
                    x={room.x + room.w / 2} y={room.y + room.h / 2 + 1.5}
                    fill={isCritical ? 'rgba(255,51,102,0.8)' : 'rgba(148,163,184,0.7)'}
                    fontSize="1.1" textAnchor="middle"
                  >
                    {patient.name.split(' ')[0]}
                  </text>
                )}
                {/* Alert icon for critical */}
                {isCritical && (
                  <text x={room.x + room.w - 2.5} y={room.y + 2.5} fill="#ff3366" fontSize="2">⚠</text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating alert pulse overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-medical-red/20 border border-medical-red/40 px-3 py-1.5 rounded-full">
          <Zap size={12} className="text-medical-red animate-pulse" />
          <span className="text-medical-red text-xs font-bold">{criticalAlerts.length} ACTIVE ALERTS</span>
        </div>
      </div>

      {/* Room Detail Panel */}
      <AnimatePresence>
        {selectedRoom && selectedRoom.patientId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 glass border border-cyan-400/20 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                <User size={18} className="text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{patientsMeta[selectedRoom.patientId]?.name}</span>
                  <StatusDot status={patientsMeta[selectedRoom.patientId]?.status} />
                  <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                    patientsMeta[selectedRoom.patientId]?.status === 'critical'
                      ? 'bg-medical-red/20 text-medical-red'
                      : patientsMeta[selectedRoom.patientId]?.status === 'recovering'
                      ? 'bg-medical-orange/20 text-medical-orange'
                      : 'bg-medical-green/20 text-medical-green'
                  }`}>{patientsMeta[selectedRoom.patientId]?.status}</span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">Room {selectedRoom.id} · {selectedRoom.wing} Wing</p>
              </div>
            </div>
            {criticalAlerts.includes(selectedRoom.patientId) && (
              <div className="flex items-center gap-2 bg-medical-red/10 border border-medical-red/30 px-3 py-2 rounded-xl">
                <AlertTriangle size={16} className="text-medical-red" />
                <span className="text-medical-red text-sm font-bold">CRITICAL ALERT ACTIVE</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
