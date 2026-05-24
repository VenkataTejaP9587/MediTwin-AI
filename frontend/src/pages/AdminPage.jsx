import { useState, useEffect } from 'react';
import { Server, Users, Activity, ShieldCheck, Database, HardDrive, Cpu, RefreshCw, History, ShieldAlert, CheckCircle, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminAPI } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';
import HospitalMap from '../components/HospitalMap';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [sysHealth, setSysHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    Promise.all([adminAPI.stats(), adminAPI.systemHealth(), adminAPI.users(), adminAPI.getAuditLogs()])
      .then(([st, sh, us, al]) => {
        setStats(st.data);
        setSysHealth(sh.data);
        setUsers(us.data);
        setAuditLogs(al.data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <CardSkeleton count={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Administration</h1>
        <div className="flex gap-2 mt-4 flex-wrap">
          {['Overview', 'Hospital Map', 'User Management', 'System Health', 'Audit Trails'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-cyan-500 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Hospital Map' && (
        <HospitalMap />
      )}

      {activeTab === 'Overview' && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <HealthCard label="API Server" status={sysHealth.api_status} icon={Server} color="#00ff88" />
            <HealthCard label="WebSocket" status={sysHealth.ws_status} icon={RefreshCw} color="#00d4ff" />
            <HealthCard label="Database" status={sysHealth.db_status} icon={Database} color="#8b5cf6" />
            <HealthCard label="AI Models" status={sysHealth.ml_status} icon={Activity} color="#00ff88" />
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="glass border border-cyan-400/10 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-6 flex items-center gap-2"><HardDrive size={18} className="text-cyan-400" /> Infrastructure Load</h2>
              <div className="space-y-6">
                <ResourceBar label="CPU Usage" value={parseFloat(sysHealth.cpu_usage)} color="#00d4ff" icon={Cpu} />
                <ResourceBar label="Memory" value={parseFloat(sysHealth.memory_usage)} color="#8b5cf6" icon={Database} />
                <ResourceBar label="Storage" value={parseFloat(sysHealth.disk_usage)} color="#ff8c00" icon={HardDrive} />
              </div>
            </div>
            <div className="lg:col-span-2 glass border border-cyan-400/10 rounded-2xl p-6 flex flex-col justify-center">
              <h2 className="text-white font-bold mb-4">Quick Stats</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-navy-800 p-4 rounded-xl text-center">
                  <div className="text-cyan-400 text-2xl font-bold">{stats.api_requests_today}</div>
                  <div className="text-slate-400 text-xs">Requests</div>
                </div>
                <div className="bg-navy-800 p-4 rounded-xl text-center">
                  <div className="text-purple-400 text-2xl font-bold">{stats.ws_connections}</div>
                  <div className="text-slate-400 text-xs">Active WS</div>
                </div>
                <div className="bg-navy-800 p-4 rounded-xl text-center">
                  <div className="text-medical-green text-2xl font-bold">{stats.total_users}</div>
                  <div className="text-slate-400 text-xs">Users</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'User Management' && (
        <div className="glass border border-cyan-400/10 rounded-2xl flex flex-col">
          <div className="p-6 border-b border-cyan-400/10 flex justify-between items-center bg-navy-800/50">
            <h2 className="text-white font-bold flex items-center gap-2"><Users size={18} className="text-purple-400" /> User Accounts</h2>
            <div className="text-sm text-slate-400">Total: {stats.total_users}</div>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-slate-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  <th className="px-6 py-4 font-semibold text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                          {u.avatar}
                        </div>
                        <div>
                          <div className="text-white font-medium">{u.name}</div>
                          <div className="text-slate-500 text-xs">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                        u.role === 'doctor' ? 'bg-cyan-400/20 text-cyan-400' : 'bg-medical-green/20 text-medical-green'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-500 hover:text-white transition-colors"><ShieldCheck size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Audit Trails' && (
        <div className="glass border border-cyan-400/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-cyan-400/10">
            <h2 className="text-white font-bold flex items-center gap-2"><History size={18} className="text-orange-400" /> System Audit Logs</h2>
          </div>
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-navy-800/50">
              <tr>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Timestamp (UTC)</th>
                <th className="px-6 py-3">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditLogs.map((log, i) => (
                <tr key={i} className="hover:bg-white/5">
                  <td className="px-6 py-4 flex flex-col">
                    <span className="text-white font-semibold">{log.action}</span>
                    <span className="text-xs text-slate-500">{log.details}</span>
                  </td>
                  <td className="px-6 py-4 text-cyan-400">{log.user_id}</td>
                  <td className="px-6 py-4 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.target}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                    No audit events recorded yet. Try creating a patient or resolving an alert.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HealthCard({ label, status, icon: Icon, color }) {
  const isOnline = status === 'online' || status === 'mock_mode';
  return (
    <div className="glass border border-cyan-400/10 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-navy-800 flex items-center justify-center">
          <Icon size={20} className="text-slate-400" />
        </div>
        <div>
          <div className="text-slate-400 text-xs font-medium">{label}</div>
          <div className="text-white font-bold capitalize mt-0.5">{status.replace('_', ' ')}</div>
        </div>
      </div>
      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-medical-green' : 'bg-medical-red'} animate-pulse`} />
    </div>
  );
}

function ResourceBar({ label, value, color, icon: Icon }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-slate-400 text-sm flex items-center gap-2"><Icon size={14}/> {label}</span>
        <span className="text-white font-mono text-sm">{value}%</span>
      </div>
      <div className="h-2 w-full bg-navy-800 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}80` }}
        />
      </div>
    </div>
  );
}
