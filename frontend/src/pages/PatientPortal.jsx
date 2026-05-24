import { useState, useEffect } from 'react';
import { Heart, Calendar, Activity, ShieldCheck, Download, User, Video, Watch, Smartphone, CheckCircle2 } from 'lucide-react';
import { patientAPI, predictAPI } from '../services/api';
import RiskMeter from '../components/RiskMeter';
import { CardSkeleton } from '../components/LoadingSkeleton';
import TelemedicineModal from '../components/TelemedicineModal';

export default function PatientPortal() {
  const [profile, setProfile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teleOpen, setTeleOpen] = useState(false);

  useEffect(() => {
    // For demo purposes, we fetch patient "p1"
    const pid = 'p1';
    Promise.all([patientAPI.getById(pid), predictAPI.quick(pid)])
      .then(([p, pred]) => {
        setProfile(p.data);
        setPrediction(pred.data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <CardSkeleton count={4} />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">My Health Portal</h1>
          <p className="text-slate-400 text-sm">Welcome back, {profile.name.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="start-telemedicine"
            onClick={() => setTeleOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-xl transition-all text-sm font-semibold shadow-lg"
            style={{ boxShadow: '0 0 16px rgba(0,212,255,0.3)' }}
          >
            <Video size={16} /> Video Consult
          </button>
          <button className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-cyan-400 border border-cyan-400/20 px-4 py-2 rounded-xl transition-colors text-sm font-semibold">
            <Download size={16} /> My Records
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass border border-cyan-400/10 rounded-2xl p-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white shadow-lg glow-cyan">
            {profile.name.split(' ').map(n=>n[0]).join('')}
          </div>
          <h2 className="text-white font-bold text-lg">{profile.name}</h2>
          <p className="text-slate-400 text-sm mb-4">{profile.age} years old • {profile.gender}</p>
          
          <div className="bg-navy-900/50 rounded-xl p-4 text-left border border-white/5 space-y-3">
            <div className="flex justify-between border-b border-white/5 pb-2 text-sm">
              <span className="text-slate-500">Blood Type</span>
              <span className="text-white font-bold text-medical-red">{profile.blood_type}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2 text-sm">
              <span className="text-slate-500">Weight</span>
              <span className="text-white font-bold">{profile.weight} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Height</span>
              <span className="text-white font-bold">{profile.height} cm</span>
            </div>
          </div>
        </div>

        {/* AI Health Summary */}
        <div className="md:col-span-2 glass border border-purple-500/20 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-6 flex items-center gap-2"><Heart size={18} className="text-purple-400" /> AI Health Summary</h2>
          
          <div className="flex flex-col sm:flex-row gap-8 items-center mb-8">
            <RiskMeter risk={prediction?.heart?.risk_percentage || 0} label="Heart Disease Risk" size={140} />
            <div>
              <div className="text-sm font-bold text-white mb-2">Recommendation</div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{prediction?.heart?.recommendation}</p>
              <div className="flex items-center gap-2 text-medical-green text-xs font-semibold bg-medical-green/10 border border-medical-green/20 w-fit px-3 py-1.5 rounded-lg">
                <ShieldCheck size={14} /> AI Confidence: {prediction?.heart?.confidence}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-navy-800 rounded-xl p-4 border border-cyan-400/10">
              <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">My Medications</h3>
              <ul className="space-y-1">
                {profile.medications.map(m => (
                  <li key={m} className="text-white text-sm flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />{m}</li>
                ))}
              </ul>
            </div>
            <div className="bg-navy-800 rounded-xl p-4 border border-cyan-400/10">
              <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Upcoming</h3>
              <div className="text-white text-sm flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> Dr. Aarav Sharma (Cardiology)</div>
              <div className="text-slate-500 text-xs ml-6 mt-1">Tomorrow, 10:00 AM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Devices (Wearables Integration) */}
      <div className="glass border border-cyan-400/10 rounded-2xl p-6">
        <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Activity size={18} className="text-cyan-400" /> Connected Devices</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-navy-800 border border-cyan-400/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-400/10 rounded-xl flex items-center justify-center">
                <Watch size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Apple Watch Ultra</h3>
                <p className="text-slate-400 text-xs mt-0.5">Syncing HR, SpO2, ECG</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-medical-green/10 text-medical-green border border-medical-green/20 px-3 py-1.5 rounded-lg text-xs font-bold">
              <CheckCircle2 size={14} /> Active
            </div>
          </div>
          
          <div className="bg-navy-800 border border-cyan-400/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-400/10 rounded-xl flex items-center justify-center">
                <Smartphone size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">MediSync App</h3>
                <p className="text-slate-400 text-xs mt-0.5">Syncing Activity, Nutrition</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-medical-green/10 text-medical-green border border-medical-green/20 px-3 py-1.5 rounded-lg text-xs font-bold">
              <CheckCircle2 size={14} /> Active
            </div>
          </div>
        </div>
      </div>

      {/* Telemedicine Modal */}
      <TelemedicineModal
        isOpen={teleOpen}
        onClose={() => setTeleOpen(false)}
        patientName={profile.name}
        patientId={profile.id}
        doctorName="MediSync AI Assistant"
      />
    </div>
  );
}
