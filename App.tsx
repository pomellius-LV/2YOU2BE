import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import LyricVideoRenderer from './components/LyricVideoRenderer';
import { VideoState, LyricLine, OverlaySettings, MediaLayer, AspectRatio, FadeSettings, AudioSettings, FAQItem } from './types';
import JSZip from 'jszip';

const VERSION = "1.1.2";
// Fix: Removed 'de', 'fr', 'es' to match available translations in TRANSLATIONS object
type LangCode = 'ru' | 'en';
type ViewState = 'editor' | 'faq';

const TRANSLATIONS: Record<LangCode, any> = {
  ru: {
    hero_title: "2YOU2BE",
    hero_sub: "Video Production Suite",
    btn_quick: "БЫСТРЫЙ ЭКСПОРТ",
    btn_editor: "ПОЛНЫЙ РЕДАКТОР",
    save: "ПРОЕКТ (.ZIP)",
    load: "ЗАГРУЗИТЬ",
    faq_title: "ПОМОЩЬ",
    local_info: "100% PRIVACY",
    no_watermark: "NO WATERMARKS",
    placeholder_lyrics: "Введите текст песни или загрузите SRT...",
    ok_load: "Проект загружен!",
    err_load: "Ошибка файла.",
    consent_text: "Мы используем файлы cookie для аналитики.",
    consent_accept: "ПРИНЯТЬ",
    consent_decline: "НЕТ",
    footer_desc: "Профессиональный инструмент для создания видео из музыки. Идеально для Suno, Udio и ваших треков.",
    links: "РЕСУРСЫ",
    contact: "КОНТАКТЫ",
    yt_channel: "YouTube Канал",
    main_site: "Сайт Спонсора",
    email_us: "Email Поддержка",
    home: "ГЛАВНАЯ",
    upload_mp3: "АУДИО (MP3)",
    upload_img: "ФОН (IMG/MP4)",
    upload_lyrics: "ТЕКСТ / SRT",
    hint_audio: "Используйте Suno или Udio",
    hint_img: "Используйте Gemini или ChatGPT",
    select: "ВЫБРАТЬ",
    sponsor: "НАШ СПОНСОР",
    export_srt: "ЭКСПОРТ SRT (CC)",
    import_srt: "ЗАГРУЗИТЬ SRT",
    back_home: "НАЗАД"
  },
  en: {
    hero_title: "2YOU2BE",
    hero_sub: "Video Production Suite",
    btn_quick: "QUICK EXPORT",
    btn_editor: "FULL EDITOR",
    save: "PROJECT (.ZIP)",
    load: "LOAD PROJECT",
    faq_title: "HELP",
    local_info: "100% PRIVACY",
    no_watermark: "NO WATERMARKS",
    placeholder_lyrics: "Paste your lyrics here or upload SRT...",
    ok_load: "Project loaded!",
    err_load: "Load error.",
    consent_text: "We use cookies for analytics.",
    consent_accept: "ACCEPT",
    consent_decline: "DECLINE",
    footer_desc: "Professional music video creator. Perfect for Suno, Udio, and custom tracks.",
    links: "RESOURCES",
    contact: "CONTACT",
    yt_channel: "Our YouTube",
    main_site: "Sponsor Site",
    email_us: "Email Support",
    home: "HOME",
    upload_mp3: "AUDIO (MP3)",
    upload_img: "BACKGROUND",
    upload_lyrics: "LYRICS / SRT",
    hint_audio: "Use Suno or Udio creators",
    hint_img: "Use Gemini or ChatGPT images",
    select: "SELECT",
    sponsor: "OUR SPONSOR",
    export_srt: "EXPORT SRT (CC)",
    import_srt: "IMPORT SRT",
    back_home: "BACK"
  }
};

const FAQ_DATA: Record<string, FAQItem[]> = {
  ru: [{ question: "Как это работает?", answer: "Все расчеты происходят в вашем браузере. Мы не храним ваши файлы." }],
  en: [{ question: "How it works?", answer: "Everything is processed locally in your browser. We don't store your files." }]
};

const DEFAULT_OVERLAY: OverlaySettings = {
  logoX: 1700, logoY: 100, logoScale: 150, extraText: '', textColor: '#ffffff',
  textX: 960, textY: 100, fontSize: 40, fontFamily: 'Inter',
  subColor: '#00ffff', subFont: 'Montserrat', subSize: 85, subFx: 'none'
};

const parseSRT = (content: string): LyricLine[] => {
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
                if (text) lines.push({ text, startTime, endTime });
            }
        }
    });
    return lines;
};

const App: React.FC = () => {
  const [lang, setLang] = useState<LangCode>('ru');
  const [view, setView] = useState<ViewState>('editor');
  const [showConsent, setShowConsent] = useState(false);
  const t = TRANSLATIONS[lang] || TRANSLATIONS['en'];

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [projectName, setProjectName] = useState('');
  const [processedLyrics, setProcessedLyrics] = useState<LyricLine[]>([]);
  const [overlay, setOverlay] = useState<OverlaySettings>(DEFAULT_OVERLAY);
  const [images, setImages] = useState<MediaLayer[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [fadeSettings, setFadeSettings] = useState<FadeSettings>({ fadeIn: 0, fadeOut: 0 });
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({ trimStart: 0, trimEnd: 0 });
  const [state, setState] = useState<VideoState>({ status: 'idle' });

  useEffect(() => {
    const consent = localStorage.getItem('2you2be_consent');
    if (!consent) setShowConsent(true);
  }, []);

  // Browser History Handling for Mobile Back Button
  useEffect(() => {
    if (state.status === 'ready' || state.status === 'exporting') {
      // Push state when entering editor
      window.history.pushState({ screen: 'editor' }, 'Editor', '');
      
      const handlePopState = (event: PopStateEvent) => {
        // When back button is pressed, return to idle
        setState({ status: 'idle' });
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [state.status]);

  const handleAudioSelect = (file: File) => {
    setAudioFile(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    if (!projectName) setProjectName(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleMediaSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const newMedia: MediaLayer = { id: Math.random().toString(), name: file.name, url, type, startTime: 0, file };
    setImages(prev => [...prev, newMedia]);
  };

  const handleSrtUpload = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const content = e.target?.result as string;
          const parsed = parseSRT(content);
          if (parsed.length > 0) {
              setProcessedLyrics(parsed);
              setLyrics(parsed.map(l => l.text).join('\n'));
          }
      };
      reader.readAsText(file);
  };

  const handleZipExport = async () => {
    const zip = new JSZip();
    const meta = { version: VERSION, projectName, lyrics, processedLyrics, overlay, aspectRatio, fadeSettings, audioSettings };
    if (audioFile) zip.file("audio.mp3", audioFile);
    images.forEach((img, i) => { if (img.file) zip.file(`media_${i}.${img.file.name.split('.').pop()}`, img.file); });
    zip.file("project.json", JSON.stringify(meta, null, 2));
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement('a'); a.href = URL.createObjectURL(content); a.download = `${projectName || 'project'}_v${VERSION}.2you2be`; a.click();
  };

  const handleZipImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const zip = await JSZip.loadAsync(ev.target?.result as ArrayBuffer);
            const jsonStr = await zip.file("project.json")?.async("string");
            if (!jsonStr) throw new Error("No metadata");
            const data = JSON.parse(jsonStr);
            setProjectName(data.projectName); setLyrics(data.lyrics); setProcessedLyrics(data.processedLyrics);
            setOverlay(data.overlay); setAspectRatio(data.aspectRatio); setFadeSettings(data.fadeSettings); setAudioSettings(data.audioSettings);
            const audioBlob = await zip.file("audio.mp3")?.async("blob");
            if (audioBlob) handleAudioSelect(new File([audioBlob], "audio.mp3", { type: "audio/mpeg" }));
            setState({ status: 'ready' });
        } catch (err) { alert(t.err_load); }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <header className="w-full bg-[#020617]/80 border-b border-white/5 backdrop-blur-md sticky top-0 z-[60]">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setView('editor'); setState({ status: 'idle' }); }}>
                <div className="w-9 h-9 bg-white text-black rounded-lg flex items-center justify-center shadow-lg group-hover:bg-cyan-500 group-hover:text-white transition-all"><i className="fas fa-play text-sm"></i></div>
                <h1 className="text-xl font-black tracking-widest uppercase">{t.hero_title}</h1>
            </div>
            <nav className="hidden md:flex gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <button onClick={() => setView('editor')} className={view === 'editor' ? 'text-white' : 'hover:text-slate-300'}>{t.home}</button>
                <button onClick={() => setView('faq')} className={view === 'faq' ? 'text-white' : 'hover:text-slate-300'}>{t.faq_title}</button>
            </nav>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {(Object.keys(TRANSLATIONS) as LangCode[]).map(c => (
                    <button key={c} onClick={() => setLang(c)} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${lang === c ? 'bg-white text-black shadow-md' : 'text-slate-500 hover:text-white'}`}>{c}</button>
                ))}
            </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        {view === 'editor' && state.status === 'idle' && (
          <div className="w-full max-w-4xl space-y-12 py-16 animate-fadeIn px-6">
            <div className="text-center space-y-4">
               <h2 className="text-5xl md:text-7xl font-black tracking-tight uppercase text-white leading-none">{t.hero_sub}</h2>
               <div className="flex justify-center gap-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/80">{t.no_watermark}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">{t.local_info}</span>
               </div>
            </div>

            <div className="bg-[#0f172a]/40 p-10 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-sm space-y-10">
                <FileUpload 
                  onAudioSelect={handleAudioSelect} 
                  onImageSelect={handleMediaSelect} 
                  onLyricsChange={setLyrics} 
                  onSrtSelect={handleSrtUpload}
                  audioFile={audioFile} 
                  backgroundImageUrl={images.length > 0 ? images[images.length - 1].url : null} 
                  lyrics={lyrics} 
                  translations={t} 
                />
                
                <div className="flex flex-col md:flex-row gap-4">
                    <button disabled={!audioFile || images.length === 0} onClick={() => { 
                        if (processedLyrics.length === 0) setProcessedLyrics([{ text: "", startTime: 0, endTime: 0 }]); 
                        setState({ status: 'ready' }); 
                    }} className="flex-1 py-6 bg-white hover:bg-slate-200 text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-30">{t.btn_quick}</button>
                    <button disabled={!audioFile} onClick={() => {
                        if (processedLyrics.length === 0) {
                             const parsed = lyrics.trim() ? lyrics.split('\n').filter(l => l.trim()).map((text, idx) => ({ text, startTime: idx === 0 ? 0 : 9999, endTime: 0 })) : [{text:"", startTime:0, endTime:0}];
                             setProcessedLyrics(parsed);
                        }
                        setState({ status: 'ready' });
                    }} className="flex-1 py-6 bg-slate-900 hover:bg-slate-800 text-white border border-white/5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3">
                        <i className="fas fa-pen-nib"></i> {t.btn_editor}
                    </button>
                </div>

                <div className="flex gap-4 pt-8 border-t border-white/5">
                    <button onClick={handleZipExport} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-white/10 transition-colors tracking-widest text-slate-400 hover:text-white"><i className="fas fa-download mr-2"></i> {t.save}</button>
                    <label className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-white/10 text-center cursor-pointer transition-colors tracking-widest text-slate-400 hover:text-white">
                        <i className="fas fa-upload mr-2"></i> {t.load}
                        <input type="file" accept=".2you2be" className="hidden" onChange={handleZipImport} />
                    </label>
                </div>
            </div>
          </div>
        )}

        {view === 'faq' && (
            <div className="w-full max-w-3xl py-16 px-6 space-y-12 animate-fadeIn">
                <h2 className="text-4xl font-black uppercase text-white">{t.faq_title}</h2>
                <div className="space-y-6">
                    {(FAQ_DATA[lang] || FAQ_DATA['en']).map((item, idx) => (
                        <div key={idx} className="bg-slate-900/40 p-8 rounded-2xl border border-white/5">
                            <h4 className="text-[13px] font-black text-white uppercase mb-4">{item.question}</h4>
                            <p className="text-[12px] text-slate-400 leading-relaxed">{item.answer}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {view === 'editor' && (state.status === 'ready' || state.status === 'exporting') && audioUrl && (
            <LyricVideoRenderer 
                images={images} setImages={setImages} audioUrl={audioUrl} lyrics={processedLyrics} visualPrompt={""} projectName={projectName} setProjectName={setProjectName} overlay={overlay} setOverlay={setOverlay} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} fadeSettings={fadeSettings} setFadeSettings={setFadeSettings} audioSettings={audioSettings} setAudioSettings={setAudioSettings} onLyricsUpdate={setProcessedLyrics} 
                onImageChange={handleMediaSelect} 
                onAudioChange={handleAudioSelect}
                onExportStart={() => setState(prev => ({ ...prev, status: 'exporting' }))} 
                onExportComplete={(blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `${projectName}_v${VERSION}.mp4`; a.click();
                    setState({ status: 'idle' });
                }} onExportError={() => setState({ status: 'error' })} 
                onSaveProject={handleZipExport}
                onBack={() => {
                   // This simulates a back press which triggers the popstate listener above
                   window.history.back();
                }}
                translations={t}
            />
        )}
      </main>

      <footer className="w-full bg-[#020617] border-t border-white/5 p-20 mt-20">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-20">
              <div className="space-y-8">
                  <div className="text-2xl font-black tracking-tighter uppercase text-white">2YOU2BE</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed uppercase tracking-widest font-bold">{t.footer_desc}</p>
                  <div className="flex gap-6">
                      <a href="https://www.youtube.com/channel/UCXMdbGGTfVG7nc0cEZwz7LA" target="_blank" className="text-slate-700 hover:text-white transition-all text-2xl"><i className="fab fa-youtube"></i></a>
                      <a href="https://apsardze24.lv" target="_blank" className="text-slate-700 hover:text-cyan-500 transition-all text-2xl"><i className="fas fa-shield-alt"></i></a>
                  </div>
              </div>
              <div className="space-y-8">
                  <h5 className="text-[11px] font-black uppercase text-white tracking-[0.3em]">{t.contact}</h5>
                  <div className="space-y-4 text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      <a href="mailto:apsardze24@gmail.com" className="block hover:text-white transition-colors">apsardze24@gmail.com</a>
                      <p className="text-slate-800">Support 24/7 via Email</p>
                  </div>
              </div>
              <div className="space-y-8">
                  <h5 className="text-[11px] font-black uppercase text-white tracking-[0.3em]">{t.sponsor}</h5>
                  <div className="flex flex-col gap-4 text-[10px] text-slate-500 uppercase font-black tracking-widest">
                      <a href="https://apsardze24.lv" target="_blank" className="hover:text-cyan-500 transition-colors flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> APSARDZE24.LV
                      </a>
                      <p className="text-slate-800 text-[9px]">Professional Security & IT Solutions</p>
                  </div>
              </div>
          </div>
          <div className="max-w-[1200px] mx-auto mt-20 pt-10 border-t border-white/5 text-center">
              <div className="text-[9px] text-slate-800 font-black uppercase tracking-[0.8em]">© 2025 2YOU2BE PRODUCTION • APSARDZE24.LV SPONSORED • v{VERSION}</div>
          </div>
      </footer>

      {showConsent && (
          <div className="fixed bottom-10 right-10 w-[350px] bg-white text-black p-8 rounded-2xl shadow-2xl z-[100] animate-fadeIn">
              <p className="text-[11px] font-black uppercase tracking-wider mb-8 leading-relaxed">{t.consent_text}</p>
              <div className="flex gap-3">
                  <button onClick={() => { localStorage.setItem('2you2be_consent', 'true'); setShowConsent(false); }} className="flex-1 py-4 bg-black text-white rounded-xl text-[10px] font-black uppercase">{t.consent_accept}</button>
                  <button onClick={() => { localStorage.setItem('2you2be_consent', 'false'); setShowConsent(false); }} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase">{t.consent_decline}</button>
              </div>
          </div>
      )}
    </div>
  );
};
export default App;