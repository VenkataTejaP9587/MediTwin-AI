import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  Monitor, MessageSquare, Send, Shield, Clock, Wifi, Bot,
  Volume2, VolumeX, Speech, Camera
} from 'lucide-react';
import { chatbotAPI } from '../services/api';

const CALL_STAGES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  RINGING: 'ringing',
  ACTIVE: 'active',
};

// Simulated chat messages during the call
const INITIAL_MESSAGES = [
  { from: 'doctor', text: 'Hello! I am the MediSync AI Assistant. How can I help you today?' },
];

export default function TelemedicineModal({ isOpen, onClose, patientName = 'Patient', patientId = null, doctorName = 'Dr. Aarav Sharma' }) {
  const [callStage, setCallStage] = useState(CALL_STAGES.IDLE);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('Excellent');
  const [isThinking, setIsThinking] = useState(false);
  const [voiceAssistantActive, setVoiceAssistantActive] = useState(false);
  const [speakOutLoud, setSpeakOutLoud] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const timerRef = useRef(null);
  const chatEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  
  const recognitionRef = useRef(null);
  const voiceAssistantActiveRef = useRef(voiceAssistantActive);
  const isSpeakingRef = useRef(isSpeaking);

  // Sync refs to avoid closures in event handlers
  useEffect(() => {
    voiceAssistantActiveRef.current = voiceAssistantActive;
  }, [voiceAssistantActive]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Simulate a connection sequence when modal opens
  useEffect(() => {
    if (isOpen) {
      setCallStage(CALL_STAGES.CONNECTING);
      const t1 = setTimeout(() => setCallStage(CALL_STAGES.RINGING), 1500);
      const t2 = setTimeout(() => {
        setCallStage(CALL_STAGES.ACTIVE);
        setMessages(INITIAL_MESSAGES);
      }, 3500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setCallStage(CALL_STAGES.IDLE);
      setCallDuration(0);
      setMessages([]);
      setVoiceAssistantActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
  }, [isOpen]);

  // Call duration timer
  useEffect(() => {
    if (callStage === CALL_STAGES.ACTIVE) {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [callStage]);

  // Webcam stream
  useEffect(() => {
    if (callStage === CALL_STAGES.ACTIVE && videoOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          streamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Camera error:", err));
    } else if (!videoOn && streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, [callStage, videoOn]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatDuration = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Speak response out loud using Web Speech API
  const speakResponse = (text) => {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Strip markdown formatting for cleaner speech synthesis
    const cleanText = text
      .replace(/[*#_`~-]/g, '') // remove markdown symbols
      .replace(/\[.*?\]\(.*?\)/g, '') // remove markdown links
      .replace(/\n+/g, ' '); // replace line breaks with spaces

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Pick a natural English voice if possible
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                         voices.find(v => v.lang.startsWith('en')) || 
                         voices[0];
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Main chatbot request handler
  const handleChatbotRequest = async (text, imageData = null) => {
    setIsThinking(true);
    try {
      const res = await chatbotAPI.message(text, patientId, imageData);
      const reply = res.data.reply;
      setMessages(m => [...m, { from: 'doctor', text: reply }]);
      if (speakOutLoud) {
        speakResponse(reply);
      }
    } catch (err) {
      const errMsg = "I'm having trouble connecting right now.";
      setMessages(m => [...m, { from: 'doctor', text: errMsg }]);
      if (speakOutLoud) {
        speakResponse(errMsg);
      }
    } finally {
      setIsThinking(false);
    }
  };

  const captureWebcamFrame = () => {
    if (!localVideoRef.current) return null;
    const video = localVideoRef.current;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.error("Failed to capture frame:", e);
      return null;
    }
  };

  const handleCaptureSymptom = async () => {
    if (!localVideoRef.current) return;
    const base64Data = captureWebcamFrame();
    if (!base64Data) return;

    setMessages(m => [
      ...m,
      {
        from: 'patient',
        text: '📷 Sent webcam snapshot for symptom assessment.',
        image: base64Data
      }
    ]);
    
    await handleChatbotRequest('Analyze this visual symptom snapshot and tell me what you see or provide wellness advice.', base64Data);
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setMessages(m => [...m, { from: 'patient', text }]);
    setChatInput('');
    await handleChatbotRequest(text);
  };

  // Speech Recognition (Speech-to-Text) initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = 'en-US';

    recog.onstart = () => {
      setIsListening(true);
    };

    recog.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      if (speechToText.trim()) {
        setMessages(m => [...m, { from: 'patient', text: speechToText.trim() }]);
        handleChatbotRequest(speechToText.trim());
      }
    };

    recog.onerror = (e) => {
      console.error('Speech recognition error:', e);
      setIsListening(false);
    };

    recog.onend = () => {
      setIsListening(false);
      // Restart listening if Voice Assistant mode is still active and AI is not speaking
      if (voiceAssistantActiveRef.current && !isSpeakingRef.current && callStage === CALL_STAGES.ACTIVE) {
        try {
          recog.start();
        } catch (err) {
          console.error(err);
        }
      }
    };

    recognitionRef.current = recog;

    return () => {
      try {
        recog.stop();
      } catch (e) {}
    };
  }, [callStage]);

  // Handle starting/stopping recognition based on states
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (voiceAssistantActive && !isSpeaking && callStage === CALL_STAGES.ACTIVE) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, [voiceAssistantActive, isSpeaking, callStage]);

  // Clean up speech synthesis when closing call or modal
  useEffect(() => {
    if (!isOpen || callStage !== CALL_STAGES.ACTIVE) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setIsListening(false);
    }
  }, [isOpen, callStage]);

  const handleEndCall = () => {
    setCallStage(CALL_STAGES.IDLE);
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    onClose();
  };

  // Animated video placeholder bars
  const AudioBars = ({ active, color }) => (
    <div className="flex items-end gap-0.5 h-6">
      {[3, 5, 8, 6, 4, 7, 5].map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={active ? { height: [`${h * 2}px`, `${h * 4}px`, `${h * 2}px`] } : { height: '4px' }}
          transition={{ repeat: Infinity, duration: 0.6 + i * 0.1, delay: i * 0.07 }}
        />
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70]"
            onClick={callStage === CALL_STAGES.IDLE ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-4xl rounded-3xl overflow-hidden border border-cyan-400/20 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #090f1d 0%, #0d1526 50%, #0a1220 100%)' }}
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-400/10 bg-black/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                    <Video size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">MediSync Telemedicine</div>
                    <div className="flex items-center gap-2 text-xs">
                      <Shield size={10} className="text-medical-green" />
                      <span className="text-medical-green">End-to-End Encrypted · HIPAA Compliant</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {callStage === CALL_STAGES.ACTIVE && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-navy-800 px-3 py-1.5 rounded-full">
                        <Wifi size={12} className="text-medical-green" />
                        <span className="text-medical-green text-xs font-mono">{connectionQuality}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-medical-red/15 border border-medical-red/30 px-3 py-1.5 rounded-full">
                        <div className="w-2 h-2 bg-medical-red rounded-full animate-pulse" />
                        <span className="text-medical-red text-xs font-mono font-bold">{formatDuration(callDuration)}</span>
                      </div>
                    </div>
                  )}
                  {callStage === CALL_STAGES.IDLE && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="flex" style={{ height: '480px' }}>
                {/* Video Area */}
                <div className="flex-1 relative bg-navy-900 flex items-center justify-center overflow-hidden">
                  {/* Connecting / Ringing State */}
                  {(callStage === CALL_STAGES.CONNECTING || callStage === CALL_STAGES.RINGING) && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                          {patientName.split(' ').map(n => n[0]).join('')}
                        </div>
                        {[1, 2, 3].map(i => (
                          <motion.div
                            key={i}
                            className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
                            animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.6, 0] }}
                            transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                          />
                        ))}
                      </div>
                      <div className="text-white font-bold text-lg">{patientName}</div>
                      <div className="text-slate-400 text-sm">
                        {callStage === CALL_STAGES.CONNECTING ? 'Connecting securely...' : 'Ringing...'}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 bg-cyan-400 rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Call — Remote Video Simulation */}
                  {callStage === CALL_STAGES.ACTIVE && (
                    <>
                      {/* Remote "video" - gradient background simulating a video feed */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 opacity-40">
                          <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-slate-500 text-3xl font-bold">
                            {doctorName.includes('AI') ? <Bot size={40} className="text-cyan-400" /> : doctorName.split(' ').map(n => n[0]).slice(-2).join('')}
                          </div>
                          <span className="text-slate-500 text-sm">{doctorName}</span>
                        </div>
                        {/* Simulated video static noise texture overlay */}
                        <div className="absolute inset-0 opacity-5 bg-grid" />
                      </div>
                      
                      {/* Voice Assistant soundwave overlay */}
                      {voiceAssistantActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                          <div className="flex items-center justify-center gap-1.5 mb-3 h-12">
                            {/* Soundwave bars animation */}
                            {[0, 1, 2, 3, 4].map(i => (
                              <motion.div
                                key={i}
                                className={`w-1 rounded-full ${isSpeaking ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : isListening ? 'bg-medical-green shadow-[0_0_10px_#00ff88]' : 'bg-slate-500'}`}
                                animate={{
                                  height: isSpeaking ? [12, 36, 12] : isListening ? [12, 24, 12] : 12
                                }}
                                transition={{
                                  repeat: Infinity,
                                  duration: isSpeaking ? 0.6 : 1.2,
                                  delay: i * 0.15
                                }}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-semibold uppercase tracking-widest ${isSpeaking ? 'text-cyan-400 animate-pulse' : isListening ? 'text-medical-green animate-pulse' : 'text-slate-400'}`}>
                            {isSpeaking ? 'AI Speaking' : isListening ? 'Listening (Speak now)...' : 'Voice Assistant Ready'}
                          </span>
                        </div>
                      )}
                      {/* Video active badge */}
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <AudioBars active={micOn} color="#00ff88" />
                        <span className="text-medical-green text-xs font-mono">{doctorName}</span>
                      </div>
                      {/* Screen share indicator */}
                      {screenShare && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded-lg">
                          <Monitor size={12} className="text-purple-400" />
                          <span className="text-purple-400 text-xs font-bold">Sharing Screen</span>
                        </div>
                      )}

                      {/* Self-view PiP (Picture-in-Picture) */}
                      <div className="absolute bottom-4 right-4 w-36 h-24 rounded-xl overflow-hidden border-2 border-cyan-400/30 bg-navy-900 shadow-lg flex items-center justify-center">
                        {videoOn ? (
                          <div className="w-full h-full bg-gradient-to-br from-navy-800 to-navy-900 flex items-center justify-center relative group">
                            <video 
                              ref={localVideoRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              className="w-full h-full object-cover"
                            />
                            {/* Hover capture button */}
                            {doctorName.includes('AI') && (
                              <button
                                onClick={handleCaptureSymptom}
                                title="Capture & Analyze Symptom"
                                className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white z-20 cursor-pointer"
                              >
                                <Camera size={18} className="text-cyan-400 animate-pulse" />
                                <span className="text-[8px] font-bold tracking-widest uppercase">Analyze Symptom</span>
                              </button>
                            )}
                            <div className="absolute bottom-1 right-1 z-10">
                              <AudioBars active={micOn} color="#00d4ff" />
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-500 flex flex-col items-center gap-1">
                            <VideoOff size={20} />
                            <span className="text-xs">Cam Off</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Chat Sidebar */}
                {chatOpen && callStage === CALL_STAGES.ACTIVE && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="flex flex-col border-l border-cyan-400/10 bg-navy-900/80 overflow-hidden"
                    style={{ minWidth: 280 }}
                  >
                    <div className="px-4 py-3 border-b border-cyan-400/10">
                      <div className="text-white font-semibold text-sm">Secure Chat</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.from === 'patient' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                          <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                            msg.from === 'patient'
                              ? 'bg-cyan-400/20 text-white border border-cyan-400/20'
                              : 'bg-navy-700 text-slate-300 border border-white/5'
                          }`}>
                            {msg.image && (
                              <img src={msg.image} alt="Symptom Snapshot" className="w-full h-auto rounded-lg mb-1.5 border border-cyan-400/30" />
                            )}
                            <div>{msg.text}</div>
                          </div>
                        </div>
                      ))}
                      {isThinking && (
                        <div className="flex gap-2">
                          <div className="bg-navy-700 text-slate-300 border border-white/5 px-3 py-2 rounded-xl text-xs flex gap-1">
                            <span className="animate-bounce">.</span>
                            <span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span>
                            <span className="animate-bounce" style={{animationDelay: '0.4s'}}>.</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 border-t border-cyan-400/10">
                      <div className="flex items-center gap-2 bg-navy-800 border border-cyan-400/20 rounded-xl p-2">
                        {doctorName.includes('AI') && (
                          <button 
                            onClick={() => setVoiceAssistantActive(v => !v)} 
                            title="Toggle Voice Assistant"
                            className={`p-1.5 rounded-lg transition-colors ${voiceAssistantActive ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            <Speech size={14} className={isListening ? 'animate-pulse' : ''} />
                          </button>
                        )}
                        <input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendMessage()}
                          placeholder={voiceAssistantActive ? "Voice Assistant Listening..." : "Type a message..."}
                          disabled={voiceAssistantActive}
                          className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none disabled:opacity-50"
                        />
                        <button 
                          onClick={sendMessage}
                          disabled={voiceAssistantActive}
                          className="text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Control Bar */}
              <div className="flex items-center justify-center gap-3 px-6 py-5 border-t border-cyan-400/10 bg-black/30">
                {callStage === CALL_STAGES.ACTIVE ? (
                  <>
                    {!doctorName.includes('AI') && (
                      <>
                        <ControlBtn
                          icon={micOn ? Mic : MicOff}
                          label={micOn ? 'Mute' : 'Unmute'}
                          active={micOn}
                          onClick={() => setMicOn(v => !v)}
                          activeColor="bg-navy-700 text-white"
                          inactiveColor="bg-medical-red/20 text-medical-red"
                        />
                        <ControlBtn
                          icon={videoOn ? Video : VideoOff}
                          label={videoOn ? 'Stop Video' : 'Start Video'}
                          active={videoOn}
                          onClick={() => setVideoOn(v => !v)}
                          activeColor="bg-navy-700 text-white"
                          inactiveColor="bg-medical-red/20 text-medical-red"
                        />
                      </>
                    )}
                    {doctorName.includes('AI') ? (
                       <>
                         <ControlBtn
                           icon={Speech}
                           label="AI Assistant"
                           active={voiceAssistantActive}
                           onClick={() => setVoiceAssistantActive(v => !v)}
                           activeColor="bg-cyan-400/20 text-cyan-400 border-cyan-400/30 font-bold"
                           inactiveColor="bg-navy-700 text-white"
                         />
                         <ControlBtn
                           icon={speakOutLoud ? Volume2 : VolumeX}
                           label={speakOutLoud ? "AI Voice: On" : "AI Voice: Off"}
                           active={speakOutLoud}
                           onClick={() => {
                             setSpeakOutLoud(v => !v);
                             if (speakOutLoud && window.speechSynthesis) {
                               window.speechSynthesis.cancel();
                             }
                           }}
                           activeColor="bg-cyan-400/20 text-cyan-400 border-cyan-400/30"
                           inactiveColor="bg-navy-700 text-white"
                         />
                       </>
                     ) : (
                       <ControlBtn
                         icon={Monitor}
                         label="Share Screen"
                         active={screenShare}
                         onClick={() => setScreenShare(v => !v)}
                         activeColor="bg-purple-500/30 text-purple-400 border-purple-500/40"
                         inactiveColor="bg-navy-700 text-white"
                       />
                     )}
                    <ControlBtn
                      icon={MessageSquare}
                      label="Chat"
                      active={chatOpen}
                      onClick={() => setChatOpen(v => !v)}
                      activeColor="bg-cyan-400/20 text-cyan-400 border-cyan-400/30"
                      inactiveColor="bg-navy-700 text-white"
                    />
                    <button
                      onClick={handleEndCall}
                      className="flex items-center gap-2 bg-medical-red hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-lg"
                      style={{ boxShadow: '0 0 20px rgba(255,51,102,0.5)' }}
                    >
                      <PhoneOff size={18} /> End Call
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEndCall}
                    className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-slate-300 px-6 py-3 rounded-xl font-semibold text-sm transition-colors border border-white/10"
                  >
                    <X size={16} /> Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ControlBtn({ icon: Icon, label, onClick, activeColor, inactiveColor, active }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border border-white/10 transition-all duration-200 hover:scale-105 ${active ? activeColor : inactiveColor}`}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
