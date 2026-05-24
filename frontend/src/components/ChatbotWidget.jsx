import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Stethoscope, Sparkles } from 'lucide-react';
import { chatbotAPI, clinicalAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const renderMarkdown = (text) => {
  if (!text) return null;
  const blocks = text.split('\n\n');
  return blocks.map((block, i) => {
    let formatted = block
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italics
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Bullets
      .replace(/^- (.*)$/gm, '• $1')
      // Newlines within block
      .replace(/\n/g, '<br />');
    return <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
};

const QUICK_QUESTIONS = [
  "What is normal heart rate?",
  "How to read SpO2?",
  "What causes high blood pressure?",
  "Summarize this patient",
  "Generate AI summary",
];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "👋 Hi! I'm MediSync AI Assistant. Ask me about vital signs, predictions, or how to use the dashboard." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  // Extract patient_id from URL if on a patient detail page (e.g. /patients/p1)
  const patientIdMatch = location.pathname.match(/\/patients\/(p\w+)/);
  const currentPatientId = patientIdMatch ? patientIdMatch[1] : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isAuthenticated) return null;

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      // 🧠 Medical Copilot: if we have a patient context AND the query is about
      // summarizing/analyzing, call the richer copilot endpoint
      const isCopilotQuery = currentPatientId && 
        /summar|ai summary|generat|analyz|status|how is|forecast|deteriorat|risk|soap/i.test(msg);
      
      if (isCopilotQuery) {
        const res = await clinicalAPI.copilot(currentPatientId);
        const data = res.data;
        const reply = `🧠 **Medical Copilot Analysis**\n\n${data.copilot_summary}`;
        setMessages(m => [...m, { role: 'bot', text: reply, isCopilot: true }]);
      } else {
        const res = await chatbotAPI.message(msg, currentPatientId);
        setMessages(m => [...m, { role: 'bot', text: res.data.reply }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'bot', text: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg glow-cyan transition-all ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <MessageCircle size={24} className="text-white" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-medical-green rounded-full border-2 border-navy-900 animate-pulse" />
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-80 h-[500px] glass border border-cyan-400/20 rounded-2xl flex flex-col overflow-hidden shadow-2xl glow-cyan"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-cyan-400/10 flex items-center gap-3 bg-gradient-to-r from-cyan-400/10 to-blue-600/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">MediSync AI</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-medical-green rounded-full animate-pulse" />
                  <span className="text-medical-green text-xs">Online</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'bot' 
                      ? msg.isCopilot ? 'bg-yellow-400/20' : 'bg-cyan-400/20' 
                      : 'bg-purple-600/30'
                  }`}>
                    {msg.role === 'bot' 
                      ? (msg.isCopilot ? <Sparkles size={14} className="text-yellow-400" /> : <Bot size={14} className="text-cyan-400" />)
                      : <User size={14} className="text-purple-400" />}
                  </div>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'bot'
                      ? msg.isCopilot 
                        ? 'bg-yellow-400/10 text-slate-200 border border-yellow-400/30'
                        : 'bg-navy-700 text-slate-200 border border-cyan-400/10'
                      : 'bg-cyan-400/20 text-white border border-cyan-400/30'
                  }`}>
                    {msg.role === 'bot' ? renderMarkdown(msg.text) : msg.text}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-cyan-400/20 flex items-center justify-center">
                    <Bot size={14} className="text-cyan-400" />
                  </div>
                  <div className="bg-navy-700 border border-cyan-400/10 px-3 py-2 rounded-xl">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <motion.div key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                          animate={{ y: [0,-4,0] }} transition={{ repeat:Infinity, delay:i*0.15, duration:0.6 }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick questions */}
            <div className="px-3 py-2 border-t border-cyan-400/10 flex gap-1 overflow-x-auto no-scrollbar">
              {QUICK_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => send(q)}
                  className="flex-shrink-0 text-xs bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 px-2 py-1 rounded-lg transition-colors border border-cyan-400/20">
                  {q.substring(0,20)}…
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-3 pb-3">
              <div className="flex gap-2 bg-navy-800 border border-cyan-400/20 rounded-xl p-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Ask about vitals, AI, or help..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                />
                <button onClick={() => send()}
                  className="w-8 h-8 rounded-lg bg-cyan-400/20 hover:bg-cyan-400/30 flex items-center justify-center text-cyan-400 transition-colors">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
