import { motion } from 'framer-motion';

export default function RiskMeter({ risk = 0, label = 'Risk', size = 140 }) {
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference - (risk / 100) * circumference;

  const color = risk < 25 ? '#00ff88' : risk < 50 ? '#00d4ff' : risk < 75 ? '#ff8c00' : '#ff3366';
  const level = risk < 25 ? 'LOW' : risk < 50 ? 'MODERATE' : risk < 75 ? 'HIGH' : 'CRITICAL';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg width={size} height={size / 2 + 10} style={{ overflow: 'visible' }}>
          {/* Background arc */}
          <path
            d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
            fill="none" stroke="#1e3a5f" strokeWidth="10" strokeLinecap="round"
          />
          {/* Animated risk arc */}
          <motion.path
            d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
            fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          {/* Center text */}
          <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
            style={{ fill: color, fontSize: 28, fontWeight: 900, fontFamily: 'Inter' }}>
            {risk}%
          </text>
          <text x={size / 2} y={size / 2 + 14} textAnchor="middle"
            style={{ fill: color, fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>
            {level}
          </text>
        </svg>
      </div>
      <p className="text-slate-400 text-xs font-medium mt-1">{label}</p>
    </div>
  );
}
