
import React, { useEffect, useRef, useState } from 'react';
import { LyricLine, MediaLayer, AudioSettings, FadeSettings } from '../types';

interface Props {
  audioUrl: string;
  currentTime: number;
  duration: number;
  lyrics: LyricLine[];
  images: MediaLayer[];
  audioSettings: AudioSettings;
  setAudioSettings?: (settings: AudioSettings) => void;
  fadeSettings?: FadeSettings;
  setFadeSettings?: (settings: FadeSettings) => void;
  onSeek: (time: number) => void;
}

const Timeline: React.FC<Props> = ({ audioUrl, currentTime, duration, lyrics, images, audioSettings, onSeek, setAudioSettings, fadeSettings, setFadeSettings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveform, setWaveform] = useState<Float32Array | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const loadAudio = async () => {
      try {
        const response = await fetch(audioUrl);
        const buffer = await response.arrayBuffer();
        const ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(buffer);
        const rawData = decoded.getChannelData(0);
        const samples = 1000;
        const blockSize = Math.floor(rawData.length / samples);
        const filtered = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) { sum += Math.abs(rawData[i * blockSize + j]); }
            filtered[i] = sum / blockSize;
        }
        const max = Math.max(...filtered);
        setWaveform(filtered.map(n => n / max));
      } catch (e) { console.error("Waveform error", e); }
    };
    loadAudio();
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width; const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a0f1d'; ctx.fillRect(0, 0, width, height);
    const barWidth = width / waveform.length;
    const playPercent = duration > 0 ? currentTime / duration : 0;
    const playX = playPercent * width;
    ctx.fillStyle = '#1e293b'; 
    for (let i = 0; i < waveform.length; i++) {
        const x = i * barWidth; const h = waveform[i] * height * 0.7;
        ctx.fillRect(x, (height - h) / 2, barWidth - 1, h);
    }
    ctx.fillStyle = '#06b6d4'; 
    for (let i = 0; i < waveform.length; i++) {
        const x = i * barWidth; if (x > playX) break;
        const h = waveform[i] * height * 0.7;
        ctx.fillRect(x, (height - h) / 2, barWidth - 1, h);
    }
    if (duration > 0) {
        const startX = (audioSettings.trimStart / duration) * width;
        const endX = ((duration - audioSettings.trimEnd) / duration) * width;
        ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
        if (startX > 0) ctx.fillRect(0, 0, startX, height);
        if (endX < width) ctx.fillRect(endX, 0, width - endX, height);
        ctx.fillStyle = '#f43f5e';
        if (startX > 0) ctx.fillRect(startX, 0, 1, height);
        if (endX < width) ctx.fillRect(endX - 1, 0, 1, height);
    }
    ctx.fillStyle = '#f59e0b';
    lyrics.forEach((line) => { if (line.startTime > 0) ctx.fillRect((line.startTime / duration) * width, height - 10, 2, 6); });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(playX, 0); ctx.lineTo(playX, height); ctx.stroke();
  }, [waveform, currentTime, duration, lyrics, images, audioSettings]);

  return (
    <div className="w-full space-y-3">
        <div className="w-full bg-black rounded-xl border border-white/5 overflow-hidden h-[60px] cursor-pointer" onClick={(e)=>{const r=e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX-r.left)/r.width)*duration)}}>
            <canvas ref={canvasRef} width={1000} height={60} className="w-full h-full" />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-cyan-400 w-12 text-right">{currentTime.toFixed(1)}s</span>
            <input type="range" min="0" max={duration || 100} step="0.1" value={currentTime} onChange={(e) => onSeek(parseFloat(e.target.value))} className="flex-1 accent-cyan-400 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer" />
            <span className="text-slate-500 w-12">{duration.toFixed(1)}s</span>
        </div>
        {setAudioSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-500"><span>Cut Start</span><span className="text-rose-500">+{audioSettings.trimStart}s</span></div>
                    <input type="range" min="0" max={duration ? Math.max(0, duration - audioSettings.trimEnd - 1) : 0} step="0.1" value={audioSettings.trimStart} onChange={(e) => setAudioSettings({...audioSettings, trimStart: parseFloat(e.target.value)})} className="w-full accent-rose-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer" />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-500"><span>Cut End</span><span className="text-rose-500">-{audioSettings.trimEnd}s</span></div>
                    {/* INVERTED: Moving thumb LEFT reduces end position, effectively INCREASING the cut value */}
                    <input 
                      type="range" 
                      min={audioSettings.trimStart + 1} 
                      max={duration || 100} 
                      step="0.1" 
                      value={duration - audioSettings.trimEnd} 
                      onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setAudioSettings({...audioSettings, trimEnd: Math.max(0, duration - val)});
                      }} 
                      className="w-full accent-rose-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer" 
                    />
                </div>
            </div>
        )}
    </div>
  );
};
export default Timeline;
