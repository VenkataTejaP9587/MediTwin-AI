import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, FileText, ChevronRight, X, User, Loader2, Download } from 'lucide-react';
import { patientAPI } from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '',
  age: '',
  gender: 'male',
  condition: '',
  room: '',
  status: 'stable',
};

export default function PatientsPage() {
  const [patients, setPatients]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const navigate                  = useNavigate();

  const loadPatients = () => {
    patientAPI.getAll()
      .then((res) => setPatients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPatients(); }, []);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.includes(search)
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.age || !form.condition.trim() || !form.room.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      await patientAPI.create({ ...form, age: Number(form.age) });
      toast.success(`Patient "${form.name}" added successfully!`);
      setForm(EMPTY_FORM);
      setShowModal(false);
      loadPatients();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add patient');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('No patients to export');
      return;
    }
    const headers = ['ID', 'Name', 'Age', 'Gender', 'Status', 'Condition', 'Room'];
    const rows = filtered.map(p => 
      [p.id, p.name, p.age, p.gender, p.status, p.condition, p.room].map(v => `"${v}"`).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `patients_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported successfully');
  };

  if (loading) return <CardSkeleton count={8} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Patient Directory</h1>
          <p className="text-slate-400 text-sm">Manage and search all registered patients</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-cyan-400 border border-cyan-400/20 font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            id="new-patient-btn"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-500 text-navy-900 font-semibold px-4 py-2 rounded-xl transition-colors glow-cyan text-sm"
          >
            <Plus size={16} /> New Patient
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass border border-cyan-400/10 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-cyan-400/10 flex items-center justify-between bg-navy-800/50">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-navy-900 border border-cyan-400/20 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-navy-900/50 text-slate-400 border-b border-cyan-400/10">
              <tr>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Condition</th>
                <th className="px-6 py-4 font-semibold">Room</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-400/5">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-400/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                        {p.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-white font-medium">{p.name}</div>
                        <div className="text-slate-500 text-xs">{p.age} yrs • {p.gender}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{p.id}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      p.status === 'critical'   ? 'bg-medical-red/20 text-medical-red border border-medical-red/30' :
                      p.status === 'recovering' ? 'bg-medical-orange/20 text-medical-orange border border-medical-orange/30' :
                                                  'bg-medical-green/20 text-medical-green border border-medical-green/30'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{p.condition}</td>
                  <td className="px-6 py-4 text-slate-400">{p.room}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold"
                    >
                      View Monitor <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <FileText size={32} className="mx-auto mb-3 opacity-20" />
                    {search ? `No patients found matching "${search}"` : 'No patients registered yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              key="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                key="modal-box"
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 30 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full max-w-lg pointer-events-auto"
              >
              <div className="glass border border-cyan-400/20 rounded-3xl p-7">
                {/* Modal header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                      <User size={20} className="text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-lg">Add New Patient</h2>
                      <p className="text-slate-400 text-xs">Register a patient for monitoring</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. John Smith"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-navy-800 border border-cyan-400/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 text-sm"
                      required
                    />
                  </div>

                  {/* Age + Gender */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Age *</label>
                      <input
                        type="number"
                        min="1" max="120"
                        placeholder="e.g. 45"
                        value={form.age}
                        onChange={(e) => setForm({ ...form, age: e.target.value })}
                        className="w-full bg-navy-800 border border-cyan-400/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Gender</label>
                      <select
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className="w-full bg-navy-800 border border-cyan-400/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400/50 text-sm"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Medical Condition *</label>
                    <input
                      type="text"
                      placeholder="e.g. Hypertension, Post-op recovery"
                      value={form.condition}
                      onChange={(e) => setForm({ ...form, condition: e.target.value })}
                      className="w-full bg-navy-800 border border-cyan-400/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 text-sm"
                      required
                    />
                  </div>

                  {/* Room + Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Room / Ward *</label>
                      <input
                        type="text"
                        placeholder="e.g. ICU-3, Ward-B"
                        value={form.room}
                        onChange={(e) => setForm({ ...form, room: e.target.value })}
                        className="w-full bg-navy-800 border border-cyan-400/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Initial Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full bg-navy-800 border border-cyan-400/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400/50 text-sm"
                      >
                        <option value="stable">Stable</option>
                        <option value="recovering">Recovering</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold text-sm glow-cyan disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    >
                      {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Add Patient'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
