import { useEffect, useRef, useState } from 'react';
import { Play, Pause, FastForward, Rewind, Clock } from 'lucide-react';

export default function ECGMonitor({ data = [], color = '#00ff88', height = 180 }) {
  const canvasRef = useRef(null);
  const historyRef = useRef([]); // Stores long history (e.g., 3000 pts)
  const animRef = useRef(null);
  
  const [isPaused, setIsPaused] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0); // Which window of 150 points to show

  // Keep history updated
  useEffect(() => {
    if (data.length > 0) {
      historyRef.current = [...historyRef.current, ...data].slice(-3000); // 3000 pts buffer
      if (!isPaused) {
        setScrubIndex(Math.max(0, historyRef.current.length - 150));
      }
    }
  }, [data, isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Dark background with subtle grid
      ctx.fillStyle = 'rgba(10,15,30,0.6)';
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = 'rgba(0,212,255,0.07)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      const fullHistory = historyRef.current;
      if (fullHistory.length < 2) { animRef.current = requestAnimationFrame(draw); return; }

      // Get current window based on scrubIndex
      const windowSize = 150;
      let startIdx = scrubIndex;
      if (!isPaused) {
        startIdx = Math.max(0, fullHistory.length - windowSize);
      }
      
      const buf = fullHistory.slice(startIdx, startIdx + windowSize);
      const step = W / Math.min(buf.length, windowSize);
      const mid = H / 2;
      const scale = (H - 16) / 2;

      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      // Main line
      ctx.beginPath();
      ctx.strokeStyle = isPaused ? '#ff8c00' : color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let i = 0; i < buf.length; i++) {
        const x = i * step;
        const y = mid - (buf[i] || 0) * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (!isPaused) {
        // Fade trailing end with gradient
        const fadeGrad = ctx.createLinearGradient(0, 0, W * 0.15, 0);
        fadeGrad.addColorStop(0, 'rgba(10,15,30,0.8)');
        fadeGrad.addColorStop(1, 'rgba(10,15,30,0)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, 0, W * 0.15, H);

        // Scan line (moving cursor)
        ctx.shadowBlur = 0;
        const scanX = (buf.length) / windowSize * W;
        const scanGrad = ctx.createLinearGradient(Math.max(0, scanX - 20), 0, scanX, 0);
        scanGrad.addColorStop(0, 'transparent');
        scanGrad.addColorStop(1, color + '80');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(Math.max(0, scanX - 20), 0, 20, H);
      } else {
        // Paused visual indicator
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,140,0,0.1)';
        ctx.fillRect(0, 0, W, H);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [color, isPaused, scrubIndex]);

  const handleSliderChange = (e) => {
    if (!isPaused) setIsPaused(true);
    const maxIdx = Math.max(0, historyRef.current.length - 150);
    setScrubIndex(Math.min(parseInt(e.target.value), maxIdx));
  };

  const jumpRelative = (delta) => {
    setIsPaused(true);
    const maxIdx = Math.max(0, historyRef.current.length - 150);
    setScrubIndex(prev => Math.max(0, Math.min(prev + delta, maxIdx)));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-xl overflow-hidden border border-white/5" style={{ height }}>
        <canvas ref={canvasRef} width={800} height={height} className="w-full h-full" />
        <div className="absolute top-2 left-3 text-xs font-mono px-2 py-1 rounded bg-black/40 backdrop-blur-sm" 
             style={{ color: isPaused ? '#ff8c00' : color }}>
          {isPaused ? 'ECG — DVR MODE (PAUSED)' : 'ECG — LIVE STREAM'}
        </div>
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-medical-orange opacity-20"><Clock size={64} /></div>
          </div>
        )}
      </div>

      {/* DVR Controls */}
      <div className="bg-navy-800 border border-cyan-400/10 rounded-xl p-3 flex items-center gap-4">
        <button 
          onClick={() => {
            if (isPaused) {
              setIsPaused(false);
              setScrubIndex(Math.max(0, historyRef.current.length - 150));
            } else {
              setIsPaused(true);
            }
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isPaused ? 'bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30' : 'bg-medical-orange/20 text-medical-orange hover:bg-medical-orange/30'
          }`}
        >
          {isPaused ? <Play size={16} className="ml-1" /> : <Pause size={16} />}
        </button>

        <button onClick={() => jumpRelative(-150)} className="text-slate-400 hover:text-white transition-colors" title="Rewind">
          <Rewind size={16} />
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <input 
            type="range" 
            min="0" 
            max={Math.max(0, historyRef.current.length - 150)} 
            value={scrubIndex}
            onChange={handleSliderChange}
            className="w-full h-1 bg-navy-900 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>T-History</span>
            <span>Live</span>
          </div>
        </div>

        <button onClick={() => jumpRelative(150)} className="text-slate-400 hover:text-white transition-colors" title="Fast Forward">
          <FastForward size={16} />
        </button>
      </div>
    </div>
  );
}
