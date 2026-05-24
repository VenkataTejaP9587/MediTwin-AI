import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const STATUS_CONFIG = {
  critical: { bg: 'rgba(255,51,102,0.12)', border: 'rgba(255,51,102,0.5)', glow: 'rgba(255,51,102,0.3)', badge: '#ff3366' },
  warning:  { bg: 'rgba(255,140,0,0.12)',  border: 'rgba(255,140,0,0.5)',  glow: 'rgba(255,140,0,0.3)',  badge: '#ff8c00' },
  normal:   { bg: 'rgba(0,212,255,0.06)',  border: 'rgba(0,212,255,0.2)',  glow: 'rgba(0,212,255,0.1)', badge: '#00d4ff' },
  good:     { bg: 'rgba(0,255,136,0.06)',  border: 'rgba(0,255,136,0.2)',  glow: 'rgba(0,255,136,0.1)', badge: '#00ff88' },
};

function MiniSparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function VitalsCard({ label, value, unit, icon: Icon, color, status = 'normal', trend, sparkline }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.normal;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#ff3366' : trend === 'down' ? '#00d4ff' : '#94a3b8';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-5 relative overflow-hidden card-hover cursor-default"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 20px ${cfg.glow}`,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-slate-400 text-xs font-medium">{label}</span>
        </div>
        {status !== 'normal' && status !== 'good' && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ color: cfg.badge, backgroundColor: cfg.badge + '20' }}
          >
            {status}
          </motion.span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div>
          <motion.span
            key={value}
            initial={{ scale: 1.1, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-black"
            style={{ color }}
          >
            {value}
          </motion.span>
          <span className="text-slate-500 text-sm ml-1.5">{unit}</span>
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon size={12} style={{ color: trendColor }} />
            <span className="text-xs" style={{ color: trendColor }}>
              {trend === 'up' ? 'Rising' : trend === 'down' ? 'Falling' : 'Stable'}
            </span>
          </div>
        </div>
        {sparkline && <MiniSparkline data={sparkline} color={color} />}
      </div>

      {/* Decorative pulse dot */}
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: cfg.badge }}>
        <div className="w-2 h-2 rounded-full animate-ping absolute" style={{ backgroundColor: cfg.badge, opacity: 0.5 }} />
      </div>
    </motion.div>
  );
}
