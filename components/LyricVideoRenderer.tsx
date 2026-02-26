import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LyricLine, OverlaySettings, MediaLayer, AspectRatio, FadeSettings, AudioSettings } from '../types';
import Timeline from './Timeline';
import * as Muxer from 'mp4-muxer';

declare class VideoEncoder {
  constructor(init: any);
  configure(config: any): void;
  encode(frame: VideoFrame, options?: any): void;
  flush(): Promise<void>;
  close(): void;
  state: "configured" | "unconfigured" | "closed";
  encodeQueueSize: number;
}
declare class AudioEncoder {
  constructor(init: any);
  configure(config: any): void;
  encode(data: AudioData): void;
  flush(): Promise<void>;
  close(): void;
  state: "configured" | "unconfigured" | "closed";
  encodeQueueSize: number;
}
declare class VideoFrame {
  constructor(image: CanvasImageSource, init?: any);
  close(): void;
  timestamp: number;
}
declare class AudioData {
  constructor(init: any);
  close(): void;
  duration: number;
}

interface Props {
  images: MediaLayer[];
  setImages: React.Dispatch<React.SetStateAction<MediaLayer[]>>;
  audioUrl: string;
  lyrics: LyricLine[];
  visualPrompt: string;
  projectName: string;
  setProjectName: (name: string) => void;
  overlay: OverlaySettings;
  setOverlay: React.Dispatch<React.SetStateAction<OverlaySettings>>;
  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;
  fps: number;
  setFps: (fps: number) => void;
  fadeSettings: FadeSettings;
  setFadeSettings: (fs: FadeSettings) => void;
  audioSettings: AudioSettings;
  setAudioSettings: (as: AudioSettings) => void;
  onLyricsUpdate: (newLyrics: LyricLine[]) => void;
  onImageChange: (file: File) => void; 
  onAudioChange: (file: File) => void;
  onExportStart: () => void;
  onExportComplete: (blob: Blob, ext: string) => void;
  onExportError: (err: string) => void;
  onSaveProject: () => void;
  onBack: () => void;
  translations: any;
}

const FONTS = ['Montserrat', 'Inter', 'Bebas Neue', 'Permanent Marker', 'Audiowide', 'Amatic SC', 'Playfair Display'];

const formatSrtTime = (seconds: number) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  const ms = Math.floor((seconds % 1) * 1000);
  return date.toISOString().substr(11, 8) + ',' + ms.toString().padStart(3, '0');
};

const LyricVideoRenderer: React.FC<Props> = ({ 
  images, setImages, audioUrl, lyrics, projectName, setProjectName, overlay, setOverlay,
  aspectRatio, setAspectRatio, fps, setFps, fadeSettings, setFadeSettings, audioSettings, setAudioSettings,
  onLyricsUpdate, onExportStart, onExportComplete, onExportError, onAudioChange, onSaveProject, onBack,
  translations
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const videoCacheRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const isExportingRef = useRef(false);
  const isCancelledRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'sync' | 'media' | 'style'>('sync');
  const [isDragging, setIsDragging] = useState<'logo' | 'text' | null>(null);

  const width = aspectRatio === '16:9' ? 1920 : 1080;
  const height = aspectRatio === '16:9' ? 1080 : 1920;

  useEffect(() => {
    images.forEach(img => {
      if (img.type === 'image' && !imageCacheRef.current.has(img.url)) {
        const i = new Image(); i.crossOrigin = "anonymous"; i.src = img.url;
        i.onload = () => { imageCacheRef.current.set(img.url, i); };
      } else if (img.type === 'video' && !videoCacheRef.current.has(img.url)) {
        const v = document.createElement('video'); v.src = img.url; v.muted = true; v.loop = true; v.load();
        videoCacheRef.current.set(img.url, v);
      }
    });
    // Also cache block-specific media
    lyrics.forEach(line => {
      if (line.mediaUrl) {
        if (line.mediaType === 'image' && !imageCacheRef.current.has(line.mediaUrl)) {
          const i = new Image(); i.crossOrigin = "anonymous"; i.src = line.mediaUrl;
          i.onload = () => { imageCacheRef.current.set(line.mediaUrl!, i); };
        } else if (line.mediaType === 'video' && !videoCacheRef.current.has(line.mediaUrl)) {
          const v = document.createElement('video'); v.src = line.mediaUrl; v.muted = true; v.loop = true; v.load();
          videoCacheRef.current.set(line.mediaUrl, v);
        }
      }
    });
  }, [images, lyrics]);
  
  useEffect(() => {
      if (overlay.logoUrl) {
        const img = new Image(); img.src = overlay.logoUrl;
        img.onload = () => { logoImageRef.current = img; };
      } else { logoImageRef.current = null; }
  }, [overlay.logoUrl]);

  const handleLineSync = (idx: number) => {
    const now = audioRef.current?.currentTime || 0;
    const nl = [...lyrics]; nl[idx].endTime = now;
    if (nl[idx + 1]) nl[idx + 1].startTime = now;
    onLyricsUpdate(nl);
  };

  const handleAddBlock = (idx: number) => {
    const nl = [...lyrics];
    const prev = nl[idx];
    const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
    const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
    
    const newBlock: LyricLine = {
      id: Math.random().toString(36).substr(2, 9),
      text: "",
      startTime: prev ? prev.endTime || prev.startTime + 2 : 0,
      endTime: prev ? (prev.endTime ? prev.endTime + 2 : prev.startTime + 4) : 2,
      color: getRandomColor()
    };
    nl.splice(idx + 1, 0, newBlock);
    onLyricsUpdate(nl);
  };

  const handleDeleteBlock = (idx: number) => {
    if (lyrics.length <= 1) return;
    const nl = lyrics.filter((_, i) => i !== idx);
    onLyricsUpdate(nl);
  };

  const handleBlockMediaSelect = (idx: number, file: File) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const nl = [...lyrics];
    nl[idx].mediaUrl = url;
    nl[idx].mediaType = type as any;
    onLyricsUpdate(nl);
  };

  const handleLineReset = (idx: number) => {
    const nl = [...lyrics];
    nl[idx].startTime = idx === 0 ? 0 : 9999;
    nl[idx].endTime = 0;
    onLyricsUpdate(nl);
  };

  const handleSrtExport = () => {
    const srtContent = lyrics.map((line, i) => {
      const start = formatSrtTime(line.startTime);
      const end = formatSrtTime(line.endTime || Math.min(line.startTime + 2, duration));
      return `${i + 1}\n${start} --> ${end}\n${line.text}\n`;
    }).join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'lyrics'}.srt`;
    a.click();
  };

  const handleSrtImport = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onload = (ev) => {
         const content = ev.target?.result as string;
         const lines: LyricLine[] = [];
         const blocks = content.split(/\n\s*\n/);
         blocks.forEach(block => {
             const parts = block.split('\n');
             if (parts.length >= 3) {
                 const timeMatch = parts[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                 if (timeMatch) {
                     const toSec = (h:string, m:string, s:string, ms:string) => parseInt(h)*3600 + parseInt(m)*60 + parseInt(s) + parseInt(ms)/1000;
                     const startTime = toSec(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                     const endTime = toSec(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
                     const text = parts.slice(2).join(' ').trim();
                     if (text) lines.push({ id: Math.random().toString(36).substr(2, 9), text, startTime, endTime });
                 }
             }
         });
         if (lines.length > 0) onLyricsUpdate(lines);
     };
     reader.readAsText(file);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (width / rect.width);
    const y = (e.clientY - rect.top) * (height / rect.height);
    const lw = overlay.logoScale;
    if (overlay.logoUrl && Math.abs(x - overlay.logoX) < lw / 2 && Math.abs(y - overlay.logoY) < lw / 2) { setIsDragging('logo'); return; } 
    if (overlay.extraText && Math.abs(x - overlay.textX) < 200 && Math.abs(y - overlay.textY) < 50) { setIsDragging('text'); }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (width / rect.width);
    const y = (e.clientY - rect.top) * (height / rect.height);
    if (isDragging === 'logo') setOverlay(prev => ({ ...prev, logoX: Math.round(x), logoY: Math.round(y) }));
    else if (isDragging === 'text') setOverlay(prev => ({ ...prev, textX: Math.round(x), textY: Math.round(y) }));
  };

  const renderFrame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Find active lyric line for block-based media
    const cur = lyrics.find(l => time >= l.startTime && (l.endTime === 0 || time < l.endTime));
    
    let activeImgUrl = images[0]?.url;
    let activeImgType = images[0]?.type || 'image';

    if (cur && cur.mediaUrl) {
      activeImgUrl = cur.mediaUrl;
      activeImgType = cur.mediaType || 'image';
    } else {
      const sorted = [...images].sort((a,b) => a.startTime - b.startTime);
      for (let i = sorted.length - 1; i >= 0; i--) { 
        if (time >= sorted[i].startTime) { 
          activeImgUrl = sorted[i].url; 
          activeImgType = sorted[i].type;
          break; 
        } 
      }
    }

    if (activeImgUrl) {
        const img = imageCacheRef.current.get(activeImgUrl);
        const vid = videoCacheRef.current.get(activeImgUrl);
        
        const source = img || vid;
        if (source) {
             const sw = source instanceof HTMLImageElement ? source.width : source.videoWidth;
             const sh = source instanceof HTMLImageElement ? source.height : source.videoHeight;
             if (sw && sh) {
               const ir = sw/sh; const cr = canvas.width/canvas.height;
               let rw, rh, ox, oy;
               if (ir > cr) { rh = canvas.height; rw = sw * (canvas.height / sh); ox = (canvas.width - rw) / 2; oy = 0; }
               else { rw = canvas.width; rh = sh * (canvas.width / sw); ox = 0; oy = (canvas.height - rh) / 2; }
               
               if (source instanceof HTMLVideoElement) {
                 // Calculate video time with trim
                 const block = lyrics.find(l => l.mediaUrl === activeImgUrl);
                 const trimStart = block?.mediaTrimStart || 0;
                 const blockStart = block?.startTime || 0;
                 const targetTime = (time - blockStart) + trimStart;
                 
                 if (isExportingRef.current) {
                     source.currentTime = targetTime;
                 } else {
                     if (Math.abs(source.currentTime - targetTime) > 0.2) {
                         source.currentTime = targetTime;
                     }
                     if (isPlaying && source.paused) source.play().catch(()=>{});
                     if (!isPlaying && !source.paused) source.pause();
                 }
               }
               ctx.drawImage(source, ox, oy, rw, rh);
             }
        }
    }
    const grad = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
    grad.addColorStop(0, 'transparent'); grad.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (logoImageRef.current) {
      const lw = overlay.logoScale; const lh = logoImageRef.current.height * (lw / logoImageRef.current.width);
      ctx.drawImage(logoImageRef.current, overlay.logoX - lw/2, overlay.logoY - lh/2, lw, lh);
    }
    if (overlay.extraText) {
      ctx.save();
      ctx.font = `900 ${overlay.fontSize}px "${overlay.fontFamily}"`; 
      ctx.fillStyle = overlay.textColor; 
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black'; ctx.shadowBlur = 10; 
      ctx.fillText(overlay.extraText, overlay.textX, overlay.textY);
      ctx.restore();
    }
    if (cur && cur.text.trim() !== '') {
      ctx.save(); 
      ctx.font = `900 ${overlay.subSize}px "${overlay.subFont}"`; 
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle'; 
      ctx.fillStyle = overlay.subColor;
      ctx.shadowColor = 'black'; 
      ctx.shadowBlur = 20; 

      // --- TEXT WRAPPING LOGIC ---
      const maxWidth = canvas.width * 0.9; // 90% of width
      const lineHeight = overlay.subSize * 1.25;
      const words = cur.text.split(' ');
      let line = '';
      const lines = [];

      for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      // Draw lines vertically centered around the 82% height mark
      const startY = (canvas.height * 0.82) - ((lines.length - 1) * lineHeight) / 2;

      for (let k = 0; k < lines.length; k++) {
        ctx.fillText(lines[k].trim(), canvas.width / 2, startY + (k * lineHeight));
      }
      
      ctx.restore();
    }
  };

  const drawPreview = useCallback(() => {
    if (isExportingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', { alpha: false });
    if (ctx) renderFrame(ctx, canvasRef.current, audioRef.current?.currentTime || 0);
    requestAnimationFrame(drawPreview);
  }, [lyrics, overlay, images, aspectRatio]); 

  useEffect(() => { const id = requestAnimationFrame(drawPreview); return () => cancelAnimationFrame(id); }, [drawPreview]);

  const handleExport = async () => {
    const canvas = canvasRef.current; if (!canvas) return;
    isExportingRef.current = true; isCancelledRef.current = false; setIsExporting(true); setExportProgress(0); setExportStatus('INITIALIZING...'); onExportStart();
    const ctx = canvas.getContext('2d', { alpha: false })!;
    
    try {
        setExportStatus('DECODING AUDIO...');
        const res = await fetch(audioUrl); const ab = await res.arrayBuffer();
        const actx = new AudioContext({ sampleRate: 44100 }); 
        const aud = await actx.decodeAudioData(ab);
        
        const muxer = new Muxer.Muxer({ 
            target: new Muxer.ArrayBufferTarget(), 
            video: { codec: 'avc', width, height }, 
            audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 44100 }, 
            fastStart: 'in-memory' 
        });

        setExportStatus('PREPARING ENCODERS...');
        const ve = new VideoEncoder({ output: (c:any, m:any) => muxer.addVideoChunk(c, m), error: (e:any) => console.error(e) });
        ve.configure({ codec: 'avc1.4d002a', width, height, bitrate: 6_000_000, framerate: fps });

        const ae = new AudioEncoder({ output: (c:any, m:any) => muxer.addAudioChunk(c, m), error: (e:any) => console.error(e) });
        ae.configure({ codec: 'mp4a.40.2', numberOfChannels: 2, sampleRate: 44100, bitrate: 128000 });

        setExportStatus('ENCODING AUDIO TRACK...');
        const startSample = Math.floor(audioSettings.trimStart * 44100);
        const totalDuration = aud.duration - audioSettings.trimStart - audioSettings.trimEnd;
        const totalSamples = Math.floor(totalDuration * 44100);
        
        const interleaved = new Float32Array(totalSamples * 2);
        for (let i = 0; i < totalSamples; i++) {
            for (let c = 0; c < 2; c++) {
                interleaved[i*2+c] = aud.getChannelData(c % aud.numberOfChannels)[startSample + i] || 0;
            }
        }

        const CHUNK_SIZE = 1024 * 4;
        for (let i = 0; i < totalSamples; i += CHUNK_SIZE) {
            const size = Math.min(CHUNK_SIZE, totalSamples - i);
            const ad = new AudioData({ 
                format: 'f32', 
                sampleRate: 44100, 
                numberOfChannels: 2, 
                numberOfFrames: size, 
                timestamp: (i/44100)*1_000_000, 
                data: interleaved.subarray(i*2, (i+size)*2) 
            });
            ae.encode(ad); ad.close();
        }
        await ae.flush(); ae.close();

        const FPS = fps; 
        const totalFrames = Math.floor(totalDuration * FPS);
        setExportStatus(`ENCODING VIDEO (0 / ${totalFrames})...`);

        for (let f = 0; f < totalFrames; f++) {
            if (isCancelledRef.current) throw new Error('Export cancelled by user');
            if (!isExportingRef.current) break;
            
            // 5 frames in buffer control logic
            while (ve.encodeQueueSize > 5) {
                setExportStatus(`WAITING BUFFER (${ve.encodeQueueSize})...`);
                await new Promise(r => setTimeout(r, 10));
            }

            if (f % 10 === 0) {
                setExportProgress((f / totalFrames) * 100);
                setExportStatus(`ENCODING FRAME ${f} / ${totalFrames}...`);
            }

            renderFrame(ctx, canvas, (f/FPS) + audioSettings.trimStart);
            const vf = new VideoFrame(canvas, { timestamp: (f/FPS)*1_000_000 });
            ve.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); 
            vf.close();
        }

        setExportStatus('FLUSHING VIDEO...');
        await ve.flush(); ve.close();
        
        setExportStatus('FINALIZING MP4 CONTAINER...');
        muxer.finalize(); 
        
        setExportStatus('READY!');
        onExportComplete(new Blob([muxer.target.buffer], { type: 'video/mp4' }), 'mp4');
    } catch (err: any) { 
        setExportStatus('ERROR: ' + err.message);
        onExportError(err.message); 
    } finally { 
        isExportingRef.current = false; 
        setIsExporting(false); 
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 w-full max-w-[1700px] px-6 animate-fadeIn">
      <div className="flex-1 flex flex-col gap-6">
        <div className={`relative w-full bg-black rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border border-white/5 mx-auto transition-all cursor-crosshair ${aspectRatio === '9:16' ? 'max-w-[42vh] aspect-[9/16]' : 'aspect-video'}`}
             onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={()=>setIsDragging(null)}>
          <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)}
                 onTimeUpdate={(e)=>{setCurrentTime((e.target as HTMLAudioElement).currentTime); setDuration((e.target as HTMLAudioElement).duration)}} onLoadedMetadata={(e)=>setDuration((e.target as HTMLAudioElement).duration)} />
          <canvas ref={canvasRef} className="w-full h-full object-contain pointer-events-none" width={width} height={height} />
          
          {isExporting && (
             <div className="absolute inset-0 bg-[#020617]/98 flex flex-col items-center justify-center p-12 z-50 backdrop-blur-sm">
               <div className="w-64 bg-white/5 h-1.5 rounded-full overflow-hidden mb-10 border border-white/5 shadow-inner">
                 <div className="bg-cyan-500 h-full transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]" style={{ width: `${exportProgress}%` }}></div>
               </div>
               <div className="flex flex-col items-center gap-3">
                 <p className="text-white font-black text-[10px] tracking-[0.5em] uppercase text-center">{exportStatus}</p>
                 <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{animationDelay:'0.2s'}}></div>
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{animationDelay:'0.4s'}}></div>
                 </div>
                 <button 
                    onClick={() => { isCancelledRef.current = true; }} 
                    className="mt-8 px-6 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                 >
                    Cancel Export
                 </button>
               </div>
             </div>
          )}
        </div>
        
        <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-2xl backdrop-blur-xl">
          <button onClick={()=>{if(!audioRef.current)return; audioRef.current.paused?audioRef.current.play():audioRef.current.pause();}} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform"><i className={`fas ${isPlaying?'fa-pause':'fa-play'}`}></i></button>
          <div className="flex-1 w-full"><Timeline audioUrl={audioUrl} currentTime={currentTime} duration={duration} lyrics={lyrics} images={images} audioSettings={audioSettings} setAudioSettings={setAudioSettings} onSeek={(t) => { if(audioRef.current) audioRef.current.currentTime = t; }} onLyricsUpdate={onLyricsUpdate} /></div>
          <div className="flex flex-col gap-3 min-w-[180px]">
            <button onClick={onBack} className="w-full py-4 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-white/10 transition-colors">{translations.back_home}</button>
            
            <div className="flex flex-col gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Format</span>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="bg-transparent text-[10px] font-bold text-white outline-none cursor-pointer text-right">
                        <option value="16:9" className="bg-slate-900">16:9 YT</option>
                        <option value="9:16" className="bg-slate-900">9:16 Mobile</option>
                    </select>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">FPS</span>
                    <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="bg-transparent text-[10px] font-bold text-white outline-none cursor-pointer text-right">
                        <option value={4} className="bg-slate-900">4 FPS</option>
                        <option value={12} className="bg-slate-900">12 FPS</option>
                        <option value={30} className="bg-slate-900">30 FPS</option>
                        <option value={60} className="bg-slate-900">60 FPS</option>
                    </select>
                </div>
            </div>

            <button disabled={isExporting} onClick={handleExport} className="w-full py-4 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-200 transition-colors disabled:opacity-20">EXPORT MP4</button>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={onSaveProject} className="py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.1em] hover:bg-white/10 transition-colors">ZIP</button>
               <button onClick={handleSrtExport} className="py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.1em] hover:bg-white/10 transition-colors">SRT</button>
            </div>
            <label className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.1em] hover:bg-white/10 transition-colors text-center cursor-pointer block">
                {translations.import_srt}
                <input type="file" accept=".srt" className="hidden" onChange={handleSrtImport} />
            </label>
          </div>
        </div>
      </div>

      <div className="w-full xl:w-[480px] bg-slate-900/20 rounded-[3rem] border border-white/5 h-[780px] flex flex-col shadow-2xl overflow-hidden backdrop-blur-lg">
        <div className="flex bg-black/40 p-2.5 gap-2.5 border-b border-white/5">
          {['sync', 'media', 'style'].map((tab) => (
            <button key={tab} onClick={()=>setActiveTab(tab as any)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${activeTab==tab?'bg-white text-black shadow-lg':'text-slate-500 hover:text-slate-300'}`}>{tab === 'sync' ? 'Timing' : tab === 'media' ? 'Media' : 'Style'}</button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {activeTab === 'sync' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-2 pb-4">
                  {lyrics.map((line, idx) => (
                      <React.Fragment key={line.id || idx}>
                        <div className={`flex flex-col gap-1.5 p-2 rounded-xl border transition-all ${currentTime >= line.startTime && (line.endTime === 0 || currentTime < line.endTime) ? 'bg-white/10 border-white/30' : 'bg-black/40 border-white/5 opacity-90'}`} style={{ borderLeftColor: line.color, borderLeftWidth: '4px' }}>
                            {/* Row 1: Text */}
                            <input 
                              className="w-full bg-transparent text-[11px] font-bold text-white outline-none placeholder:text-slate-600 px-1" 
                              value={line.text} 
                              placeholder="Type lyrics or leave empty for media only..."
                              onChange={(e)=>{const nl=[...lyrics]; nl[idx].text=e.target.value; onLyricsUpdate(nl);}} 
                            />

                            {/* Row 2: Controls */}
                            <div className="flex items-center justify-between gap-1">
                               <div className="flex items-center gap-1">
                                  <div className="flex items-center bg-black/40 px-1.5 py-1 rounded-md border border-white/5">
                                     <span className="text-[7px] font-black text-slate-500 uppercase mr-1">In</span>
                                     <input type="number" step="0.1" className="bg-transparent text-[9px] font-bold text-cyan-400 w-9 outline-none" value={line.startTime.toFixed(1)} onChange={(e)=>{const nl=[...lyrics]; nl[idx].startTime=parseFloat(e.target.value); onLyricsUpdate(nl);}} />
                                  </div>
                                  <div className="flex items-center bg-black/40 px-1.5 py-1 rounded-md border border-white/5">
                                     <span className="text-[7px] font-black text-slate-500 uppercase mr-1">Out</span>
                                     <input type="number" step="0.1" className="bg-transparent text-[9px] font-bold text-rose-400 w-9 outline-none" value={line.endTime.toFixed(1)} onChange={(e)=>{const nl=[...lyrics]; nl[idx].endTime=parseFloat(e.target.value); onLyricsUpdate(nl);}} />
                                  </div>
                               </div>

                               <div className="flex items-center gap-1">
                                  <button onClick={()=>handleLineSync(idx)} className="px-2 py-1 bg-white text-black rounded-md text-[7px] font-black uppercase tracking-tighter hover:bg-cyan-400 transition-colors">Sync</button>
                                  <button onClick={()=>handleLineReset(idx)} className="w-6 h-6 bg-white/5 hover:bg-white/10 text-slate-400 rounded-md flex items-center justify-center transition-colors"><i className="fas fa-undo text-[7px]"></i></button>
                                  
                                  <label className="w-6 h-6 bg-white/5 hover:bg-white/10 text-slate-400 rounded-md flex items-center justify-center transition-colors cursor-pointer">
                                     <i className={`fas ${line.mediaUrl ? 'fa-image text-cyan-400' : 'fa-camera'} text-[7px]`}></i>
                                     <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleBlockMediaSelect(idx, e.target.files[0])} />
                                  </label>

                                  {line.mediaType === 'video' && (
                                    <div className="flex items-center gap-1 bg-black/40 px-1.5 py-1 rounded-md border border-white/5" title="Video Start Offset (sec)">
                                      <i className="fas fa-step-forward text-[7px] text-slate-500"></i>
                                      <input type="number" step="0.1" className="bg-transparent text-[8px] font-bold text-slate-300 w-7 outline-none" value={line.mediaTrimStart || 0} onChange={(e)=>{const nl=[...lyrics]; nl[idx].mediaTrimStart=parseFloat(e.target.value); onLyricsUpdate(nl);}} />
                                    </div>
                                  )}

                                  <button onClick={()=>handleDeleteBlock(idx)} className="w-6 h-6 bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded-md flex items-center justify-center transition-colors"><i className="fas fa-trash-alt text-[7px]"></i></button>
                               </div>
                            </div>
                        </div>
                        
                        {/* Always visible Add Button between blocks */}
                        <div className="flex justify-center -my-1 relative z-10">
                           <button onClick={() => handleAddBlock(idx)} className="w-5 h-5 bg-slate-800 hover:bg-white border border-white/10 hover:text-black rounded-full flex items-center justify-center text-slate-400 transition-all shadow-lg">
                              <i className="fas fa-plus text-[7px]"></i>
                           </button>
                        </div>
                      </React.Fragment>
                  ))}
              </div>
            </div>
          )}
          {activeTab === 'media' && (
            <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-black/20 p-6 rounded-3xl border border-white/5 space-y-4">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Replace Audio</h4>
                    <label className="cursor-pointer block p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center hover:bg-white/10 transition-all">
                        <i className="fas fa-sync-alt mr-2 text-slate-500"></i> <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">New MP3</span>
                        <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAudioChange(e.target.files[0])} />
                    </label>
                </div>
                <div className="bg-black/20 p-6 rounded-3xl border border-white/5 space-y-5">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Manage Backgrounds</h4>
                  <label className="cursor-pointer block p-6 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center hover:border-white/20 transition-all">
                      <i className="fas fa-plus mb-3 block text-white opacity-40"></i> <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Add Layer</span>
                      <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e)=>{
                          if(e.target.files) {
                              const news = Array.from(e.target.files).map((f: any) => ({ id: Math.random().toString(), name: f.name, url: URL.createObjectURL(f), type: f.type.startsWith('video/') ? 'video' as const : 'image' as const, startTime: currentTime, file: f }));
                              setImages(prev => [...prev, ...news].sort((a,b)=>a.startTime-b.startTime));
                          }
                      }} />
                  </label>
                  {images.map((img) => (
                      <div key={img.id} className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-white/5 shadow-md">
                          <div className="w-12 h-12 bg-slate-800 rounded-xl overflow-hidden shadow-inner">{img.type === 'image' && <img src={img.url} className="w-full h-full object-cover" />}</div>
                          <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black text-slate-200 uppercase truncate">{img.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-slate-600 font-bold uppercase">Starts @</span>
                                <input type="number" step="0.1" value={img.startTime} onChange={(e)=>setImages(prev=>prev.map(p=>p.id===img.id?{...p, startTime: parseFloat(e.target.value)}:p).sort((a,b)=>a.startTime-b.startTime))} className="bg-transparent text-[10px] text-white font-black outline-none w-14" />
                              </div>
                          </div>
                          <button onClick={()=>setImages(prev=>prev.filter(p=>p.id!==img.id))} className="text-slate-700 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                      </div>
                  ))}
                </div>
            </div>
          )}
          {activeTab === 'style' && (
            <div className="space-y-8 h-full overflow-y-auto custom-scrollbar pr-2">
               <div className="bg-black/20 p-6 rounded-3xl border border-white/5 space-y-6">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5 pb-2">Subtitle Styling</h4>
                  <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Font Family</span>
                        <select value={overlay.subFont} onChange={(e)=>setOverlay({...overlay, subFont: e.target.value})} className="bg-black/40 p-3.5 rounded-xl border border-white/10 text-[10px] text-white outline-none font-bold">
                            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Font Size</span>
                            <input type="number" value={overlay.subSize} onChange={(e)=>setOverlay({...overlay, subSize: parseInt(e.target.value)})} className="bg-black/40 p-3.5 rounded-xl border border-white/10 text-[11px] text-white font-black" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Color</span>
                            <input type="color" value={overlay.subColor} onChange={(e)=>setOverlay({...overlay, subColor: e.target.value})} className="w-full h-[46px] bg-transparent cursor-pointer rounded-xl border border-white/10" />
                          </div>
                      </div>
                  </div>
               </div>

               <div className="bg-black/20 p-6 rounded-3xl border border-white/5 space-y-6">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5 pb-2">Ad / Extra Text Style</h4>
                  <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Ad Text</span>
                        <input type="text" value={overlay.extraText} onChange={(e)=>setOverlay({...overlay, extraText: e.target.value})} className="w-full bg-black/40 p-3.5 rounded-xl border border-white/10 text-[11px] text-white outline-none font-bold" placeholder="Your Ad / Contact..." />
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Ad Font</span>
                        <select value={overlay.fontFamily} onChange={(e)=>setOverlay({...overlay, fontFamily: e.target.value})} className="bg-black/40 p-3.5 rounded-xl border border-white/10 text-[10px] text-white outline-none font-bold">
                            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Ad Size</span>
                            <input type="number" value={overlay.fontSize} onChange={(e)=>setOverlay({...overlay, fontSize: parseInt(e.target.value)})} className="bg-black/40 p-3.5 rounded-xl border border-white/10 text-[11px] text-white font-black" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Ad Color</span>
                            <input type="color" value={overlay.textColor} onChange={(e)=>setOverlay({...overlay, textColor: e.target.value})} className="w-full h-[46px] bg-transparent cursor-pointer rounded-xl border border-white/10" />
                          </div>
                      </div>
                  </div>
               </div>

               <div className="bg-black/20 p-6 rounded-3xl border border-white/5 space-y-6">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5 pb-2">Video Format & Quality</h4>
                  <div className="space-y-4">
                      <div className="flex gap-4">
                          <button onClick={()=>setAspectRatio('16:9')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aspectRatio==='16:9'?'bg-white text-black shadow-lg':'bg-slate-800/40 text-slate-500 hover:text-white'}`}>16:9 YT</button>
                          <button onClick={()=>setAspectRatio('9:16')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aspectRatio==='9:16'?'bg-white text-black shadow-lg':'bg-slate-800/40 text-slate-500 hover:text-white'}`}>9:16 Mobile</button>
                      </div>
                      <div className="flex gap-2">
                          {[4, 12, 30, 60].map(f => (
                              <button key={f} onClick={()=>setFps(f)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${fps===f?'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]':'bg-slate-800/40 text-slate-500 hover:text-white'}`}>{f} FPS</button>
                          ))}
                      </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default LyricVideoRenderer;