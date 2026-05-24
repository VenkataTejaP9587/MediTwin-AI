import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, Calendar, Filter } from 'lucide-react';
import { reportAPI } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportAPI.overview().then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <CardSkeleton count={4} />;

  // Format data for Recharts
  const alertsData = data.days.map((day, i) => ({
    name: day,
    alerts: Math.max(0, 15 - Math.abs(i - 15) / 2 + (Math.random() * 5 - 2.5)), // bell curve shape mock
    admissions: data.daily_admissions[i]
  }));

  const conditionData = Object.entries(data.condition_distribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
          <p className="text-slate-400 text-sm">30-day health trends and system statistics</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-navy-800 border border-cyan-400/20 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm transition-colors">
            <Calendar size={16} /> Last 30 Days
          </button>
          <button className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-500 text-navy-900 font-semibold px-4 py-2 rounded-xl transition-colors glow-cyan text-sm">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Avg Health Score', val: data.avg_health_score, unit: '/100', color: '#00ff88' },
          { label: 'Total Alerts (30d)', val: data.total_alerts_30d, unit: '', color: '#ff3366' },
          { label: 'Critical Cases', val: data.critical_count, unit: `/${data.total_patients}`, color: '#ff8c00' },
          { label: 'Avg Length of Stay', val: '4.2', unit: 'days', color: '#00d4ff' },
        ].map(k => (
          <div key={k.label} className="glass border border-cyan-400/10 rounded-2xl p-4">
            <div className="text-slate-400 text-xs font-medium mb-1">{k.label}</div>
            <div className="text-2xl font-black" style={{ color: k.color }}>
              {k.val} <span className="text-sm font-normal text-slate-500">{k.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 glass border border-cyan-400/10 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-6">Alerts vs Admissions (30 Days)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={alertsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff3366" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff3366" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAdm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickMargin={10} minTickGap={20} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d1526', borderColor: 'rgba(0,212,255,0.2)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="alerts" name="Critical Alerts" stroke="#ff3366" fillOpacity={1} fill="url(#colorAlerts)" strokeWidth={2} />
                <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#00d4ff" fillOpacity={1} fill="url(#colorAdm)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Condition Dist */}
        <div className="glass border border-cyan-400/10 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-6">Patient Conditions</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conditionData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0d1526', borderColor: 'rgba(0,212,255,0.2)', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
