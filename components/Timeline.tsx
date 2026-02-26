
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
  onLyricsUpdate: (newLyrics: LyricLine[]) => void;
}

const Timeline: React.FC<Props> = ({ audioUrl, currentTime, duration, lyrics, images, audioSettings, onSeek, setAudioSettings, fadeSettings, setFadeSettings, onLyricsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveform, setWaveform] = useState<Float32Array | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<{ id: string, type: 'move' | 'resize-start' | 'resize-end', initialX: number, initialStart: number, initialEnd: number } | null>(null);

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
        ctx.fillStyle = 'rgba(244, 63, 94, 0.1)';
        if (startX > 0) ctx.fillRect(0, 0, startX, height);
        if (endX < width) ctx.fillRect(endX, 0, width - endX, height);
        ctx.fillStyle = '#f43f5e';
        if (startX > 0) ctx.fillRect(startX, 0, 1, height);
        if (endX < width) ctx.fillRect(endX - 1, 0, 1, height);
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(playX, 0); ctx.lineTo(playX, height); ctx.stroke();
  }, [waveform, currentTime, duration, audioSettings]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingBlock || !containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timeAtX = (x / rect.width) * duration;
    const initialTimeAtX = (draggingBlock.initialX / rect.width) * duration;
    const delta = timeAtX - initialTimeAtX;

    const nl = [...lyrics];
    const idx = nl.findIndex(l => l.id === draggingBlock.id);
    if (idx === -1) return;

    if (draggingBlock.type === 'move') {
      const blockDuration = draggingBlock.initialEnd - draggingBlock.initialStart;
      let newStart = draggingBlock.initialStart + delta;
      if (newStart < 0) newStart = 0;
      nl[idx].startTime = newStart;
      nl[idx].endTime = newStart + blockDuration;
    } else if (draggingBlock.type === 'resize-start') {
      nl[idx].startTime = Math.min(draggingBlock.initialEnd - 0.1, Math.max(0, draggingBlock.initialStart + delta));
    } else if (draggingBlock.type === 'resize-end') {
      nl[idx].endTime = Math.max(draggingBlock.initialStart + 0.1, draggingBlock.initialEnd + delta);
    }
    onLyricsUpdate(nl);
  };

  const handleMouseUp = () => {
    setDraggingBlock(null);
  };

  return (
    <div className="w-full space-y-3 select-none" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div 
          ref={containerRef}
          className="w-full bg-black rounded-xl border border-white/5 overflow-hidden h-[80px] cursor-pointer relative" 
          onClick={(e)=>{
            if (draggingBlock) return;
            const r=e.currentTarget.getBoundingClientRect(); 
            onSeek(((e.clientX-r.left)/r.width)*duration)
          }}
        >
            <canvas ref={canvasRef} width={1000} height={80} className="w-full h-full opacity-50" />
            
            {/* Blocks Layer */}
            <div className="absolute inset-0 pointer-events-none">
              {lyrics.map((line) => {
                const start = (line.startTime / duration) * 100;
                const end = (line.endTime / duration) * 100;
                const width = end - start;
                if (width <= 0) return null;

                return (
                  <div 
                    key={line.id}
                    className="absolute h-8 border rounded-md pointer-events-auto flex items-center px-2 overflow-hidden group"
                    style={{ 
                      left: `${start}%`, 
                      width: `${width}%`, 
                      top: '10px',
                      backgroundColor: `${line.color}33`, // 20% opacity
                      borderColor: line.color
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingBlock({ id: line.id, type: 'move', initialX: e.clientX, initialStart: line.startTime, initialEnd: line.endTime });
                    }}
                  >
                    <span className="text-[8px] font-black text-white truncate uppercase tracking-tighter pointer-events-none">{line.text || 'Empty Block'}</span>
                    
                    {/* Resize Handles */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-2 bg-white/50 hover:bg-white cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingBlock({ id: line.id, type: 'resize-start', initialX: e.clientX, initialStart: line.startTime, initialEnd: line.endTime });
                      }}
                    />
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 hover:bg-white cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingBlock({ id: line.id, type: 'resize-end', initialX: e.clientX, initialStart: line.startTime, initialEnd: line.endTime });
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10 pointer-events-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
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
