import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import LyricVideoRenderer from './components/LyricVideoRenderer';
import { VideoState, LyricLine, OverlaySettings, MediaLayer, AspectRatio, FadeSettings, AudioSettings, FAQItem } from './types';
import JSZip from 'jszip';

const VERSION = "1.2.0";

type LangCode = 'ru' | 'en' | 'de' | 'fr' | 'es';
type ViewState = 'editor' | 'faq';

const TRANSLATIONS: Record<LangCode, any> = {
  ru: {
    hero_title: "2YOU2BE",
    hero_sub: "Creative Video Suite",
    btn_quick: "Быстрый Экспорт",
    btn_editor: "Редактор",
    save: "Сохранить (.zip)",
    load: "Открыть",
    faq_title: "Помощь",
    local_info: "100% Конфиденциально",
    no_watermark: "Без водяных знаков",
    placeholder_lyrics: "Вставьте текст песни или перетащите SRT файл...",
    ok_load: "Проект загружен!",
    err_load: "Ошибка файла.",
    consent_text: "Мы используем cookie для улучшения работы сервиса.",
    consent_accept: "Принять",
    consent_decline: "Отклонить",
    footer_desc: "Профессиональный инструмент для визуализации музыки. Идеально для Suno, Udio и авторских треков.",
    links: "Ресурсы",
    contact: "Контакты",
    yt_channel: "YouTube Канал",
    main_site: "Спонсор",
    email_us: "Email Поддержка",
    home: "Главная",
    upload_mp3: "Аудиофайл",
    upload_img: "Обложка / Видео",
    upload_lyrics: "Текст / Субтитры",
    hint_audio: "MP3, WAV, Suno, Udio",
    hint_img: "Изображение или видео (9:16 / 16:9)",
    select: "Выбрать файл",
    sponsor: "При поддержке",
    export_srt: "Экспорт SRT",
    import_srt: "Импорт SRT",
    back_home: "Назад"
  },
  en: {
    hero_title: "2YOU2BE",
    hero_sub: "Creative Video Suite",
    btn_quick: "Quick Export",
    btn_editor: "Editor",
    save: "Save Project",
    load: "Load Project",
    faq_title: "Help",
    local_info: "100% Private",
    no_watermark: "No Watermarks",
    placeholder_lyrics: "Paste lyrics here or drag & drop SRT file...",
    ok_load: "Project loaded!",
    err_load: "Load error.",
    consent_text: "We use cookies to enhance your experience.",
    consent_accept: "Accept",
    consent_decline: "Decline",
    footer_desc: "Professional music visualization tool. Perfect for Suno, Udio, and custom tracks.",
    links: "Resources",
    contact: "Contact",
    yt_channel: "YouTube Channel",
    main_site: "Sponsor",
    email_us: "Email Support",
    home: "Home",
    upload_mp3: "Audio File",
    upload_img: "Cover / Video",
    upload_lyrics: "Lyrics / Subtitles",
    hint_audio: "MP3, WAV, Suno, Udio",
    hint_img: "Image or Video loop",
    select: "Select File",
    sponsor: "Powered by",
    export_srt: "Export SRT",
    import_srt: "Import SRT",
    back_home: "Back"
  },
  de: {
    hero_title: "2YOU2BE",
    hero_sub: "Kreativ-Video-Suite",
    btn_quick: "Schnellexport",
    btn_editor: "Editor",
    save: "Speichern",
    load: "Laden",
    faq_title: "Hilfe",
    local_info: "100% Privat",
    no_watermark: "Keine Wasserzeichen",
    placeholder_lyrics: "Songtext hier einfügen oder SRT hochladen...",
    ok_load: "Projekt geladen!",
    err_load: "Fehler beim Laden.",
    consent_text: "Wir verwenden Cookies.",
    consent_accept: "Akzeptieren",
    consent_decline: "Ablehnen",
    footer_desc: "Professionelles Musikvideo-Tool.",
    links: "Ressourcen",
    contact: "Kontakt",
    yt_channel: "YouTube Kanal",
    main_site: "Sponsor",
    email_us: "Email Support",
    home: "Startseite",
    upload_mp3: "Audiodatei",
    upload_img: "Hintergrund",
    upload_lyrics: "Text / Untertitel",
    hint_audio: "MP3, WAV, Suno",
    hint_img: "Bild oder Video",
    select: "Auswählen",
    sponsor: "Unterstützt von",
    export_srt: "SRT Exportieren",
    import_srt: "SRT Importieren",
    back_home: "Zurück"
  },
  fr: {
    hero_title: "2YOU2BE",
    hero_sub: "Suite Vidéo Créative",
    btn_quick: "Export Rapide",
    btn_editor: "Éditeur",
    save: "Sauvegarder",
    load: "Charger",
    faq_title: "Aide",
    local_info: "100% Privé",
    no_watermark: "Sans Filigrane",
    placeholder_lyrics: "Collez les paroles ou importez un SRT...",
    ok_load: "Projet chargé !",
    err_load: "Erreur de chargement.",
    consent_text: "Nous utilisons des cookies.",
    consent_accept: "Accepter",
    consent_decline: "Refuser",
    footer_desc: "Outil de visualisation musicale pro.",
    links: "Ressources",
    contact: "Contact",
    yt_channel: "Chaîne YouTube",
    main_site: "Sponsor",
    email_us: "Support Email",
    home: "Accueil",
    upload_mp3: "Fichier Audio",
    upload_img: "Arrière-plan",
    upload_lyrics: "Paroles / SRT",
    hint_audio: "MP3, WAV, Suno",
    hint_img: "Image ou Vidéo",
    select: "Choisir",
    sponsor: "Soutenu par",
    export_srt: "Exporter SRT",
    import_srt: "Importer SRT",
    back_home: "Retour"
  },
  es: {
    hero_title: "2YOU2BE",
    hero_sub: "Suite de Video Creativa",
    btn_quick: "Exportar Rápido",
    btn_editor: "Editor",
    save: "Guardar",
    load: "Cargar",
    faq_title: "Ayuda",
    local_info: "100% Privado",
    no_watermark: "Sin Marcas de Agua",
    placeholder_lyrics: "Pega la letra o sube un SRT...",
    ok_load: "¡Proyecto cargado!",
    err_load: "Error al cargar.",
    consent_text: "Usamos cookies para mejorar el servicio.",
    consent_accept: "Aceptar",
    consent_decline: "Rechazar",
    footer_desc: "Herramienta profesional de visualización musical.",
    links: "Recursos",
    contact: "Contacto",
    yt_channel: "Canal de YouTube",
    main_site: "Patrocinador",
    email_us: "Soporte Email",
    home: "Inicio",
    upload_mp3: "Archivo de Audio",
    upload_img: "Fondo",
    upload_lyrics: "Letra / Subtítulos",
    hint_audio: "MP3, WAV, Suno",
    hint_img: "Imagen o Video",
    select: "Seleccionar",
    sponsor: "Patrocinado por",
    export_srt: "Exportar SRT",
    import_srt: "Importar SRT",
    back_home: "Atrás"
  }
};

const FAQ_DATA: Record<string, FAQItem[]> = {
  ru: [{ question: "Как это работает?", answer: "Все расчеты происходят в вашем браузере. Мы не храним ваши файлы." }],
  en: [{ question: "How it works?", answer: "Everything is processed locally in your browser. We don't store your files." }],
  de: [{ question: "Wie funktioniert es?", answer: "Alles wird lokal in Ihrem Browser verarbeitet." }],
  fr: [{ question: "Comment ça marche ?", answer: "Tout est traité localement dans votre navigateur." }],
  es: [{ question: "Cómo funciona?", answer: "Todo se procesa localmente en tu navegador." }]
};

const DEFAULT_OVERLAY: OverlaySettings = {
  logoX: 1700, logoY: 100, logoScale: 150, extraText: '', textColor: '#ffffff',
  textX: 960, textY: 100, fontSize: 40, fontFamily: 'Inter',
  subColor: '#00ffff', subFont: 'Montserrat', subSize: 85, subFx: 'none'
};

const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

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
                if (text) lines.push({ id: Math.random().toString(36).substr(2, 9), text, startTime, endTime, color: getRandomColor() });
            }
        }
    });
    return lines;
};

const App: React.FC = () => {
  const [lang, setLang] = useState<LangCode>('en'); // Default en, will update on mount
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
  const [fps, setFps] = useState<number>(30);
  const [fadeSettings, setFadeSettings] = useState<FadeSettings>({ fadeIn: 0, fadeOut: 0 });
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({ trimStart: 0, trimEnd: 0 });
  const [state, setState] = useState<VideoState>({ status: 'idle' });

  // Language Detection
  useEffect(() => {
    const userLang = navigator.language.split('-')[0] as LangCode;
    if (['ru', 'en', 'de', 'fr', 'es'].includes(userLang)) {
      setLang(userLang);
    } else {
      setLang('en');
    }
  }, []);

  useEffect(() => {
    const consent = localStorage.getItem('2you2be_consent');
    if (!consent) setShowConsent(true);
  }, []);

  // History API
  useEffect(() => {
    if (state.status === 'ready' || state.status === 'exporting') {
      window.history.pushState({ screen: 'editor' }, 'Editor', '');
      const handlePopState = () => setState({ status: 'idle' });
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
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
    const meta = { version: VERSION, projectName, lyrics, processedLyrics, overlay, aspectRatio, fps, fadeSettings, audioSettings };
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
            setOverlay(data.overlay); setAspectRatio(data.aspectRatio); setFps(data.fps || 30); setFadeSettings(data.fadeSettings); setAudioSettings(data.audioSettings);
            const audioBlob = await zip.file("audio.mp3")?.async("blob");
            if (audioBlob) handleAudioSelect(new File([audioBlob], "audio.mp3", { type: "audio/mpeg" }));
            setState({ status: 'ready' });
        } catch (err) { alert(t.err_load); }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
      {/* Header - Minimalist */}
      <header className="w-full fixed top-0 left-0 right-0 z-[60] backdrop-blur-md bg-[#020617]/70 border-b border-white/5 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer group opacity-90 hover:opacity-100 transition-opacity" onClick={() => { setView('editor'); setState({ status: 'idle' }); }}>
                <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]"><i className="fas fa-play text-white text-[10px] ml-0.5"></i></div>
                <h1 className="text-lg font-bold tracking-wider text-white">2YOU2BE</h1>
            </div>
            
            <div className="flex items-center gap-6">
                <nav className="hidden md:flex gap-6 text-[11px] font-medium uppercase tracking-widest text-slate-400">
                    <button onClick={() => setView('editor')} className={`transition-colors ${view === 'editor' ? 'text-white' : 'hover:text-white'}`}>{t.home}</button>
                    <button onClick={() => setView('faq')} className={`transition-colors ${view === 'faq' ? 'text-white' : 'hover:text-white'}`}>{t.faq_title}</button>
                </nav>
                <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                    {(Object.keys(TRANSLATIONS) as LangCode[]).map(c => (
                        <button key={c} onClick={() => setLang(c)} className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all ${lang === c ? 'bg-white/10 text-white shadow-sm' : 'text-slate-600 hover:text-slate-400'}`}>{c}</button>
                    ))}
                </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-24 pb-12 w-full">
        {view === 'editor' && state.status === 'idle' && (
          <div className="w-full max-w-3xl px-6 animate-fadeIn flex flex-col gap-10">
            {/* Hero Section - Compact & Elegant */}
            <div className="text-center space-y-3 pt-4">
               <h2 className="text-3xl md:text-5xl font-light text-white tracking-wide leading-tight">{t.hero_sub}</h2>
               <div className="flex justify-center gap-6 items-center pt-2 opacity-60">
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2"><i className="fas fa-bolt"></i> {t.no_watermark}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2"><i className="fas fa-shield-alt"></i> {t.local_info}</span>
               </div>
            </div>

            {/* Upload Area - Glassmorphism, Rounded, Clean */}
            <div className="bg-white/[0.02] backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl ring-1 ring-white/5">
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
                
                {/* Action Buttons - Refined */}
                <div className="flex flex-col md:flex-row gap-4 mt-8">
                    <button disabled={!audioFile || images.length === 0} onClick={() => { 
                        if (processedLyrics.length === 0) setProcessedLyrics([{ id: 'initial', text: "", startTime: 0, endTime: 0, color: getRandomColor() }]); 
                        setState({ status: 'ready' }); 
                    }} className="flex-1 py-4 bg-white text-black rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-slate-200 transition-all active:scale-[0.98] disabled:opacity-30 disabled:hover:bg-white">{t.btn_quick}</button>
                    
                    <button disabled={!audioFile} onClick={() => {
                        if (processedLyrics.length === 0) {
                             const parsed = lyrics.trim() ? lyrics.split('\n').filter(l => l.trim()).map((text, idx) => ({ id: Math.random().toString(36).substr(2, 9), text, startTime: idx === 0 ? 0 : 9999, endTime: 0, color: getRandomColor() })) : [{ id: 'initial', text:"", startTime:0, endTime:0, color: getRandomColor()}];
                             setProcessedLyrics(parsed);
                        }
                        setState({ status: 'ready' });
                    }} className="flex-1 py-4 bg-white/5 text-white border border-white/10 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2 group">
                        <span>{t.btn_editor}</span> <i className="fas fa-arrow-right -ml-1 opacity-0 group-hover:opacity-100 group-hover:ml-1 transition-all"></i>
                    </button>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/5">
                    <button onClick={handleZipExport} className="text-[10px] font-medium uppercase tracking-wider text-slate-500 hover:text-white transition-colors flex items-center gap-2"><i className="fas fa-download"></i> {t.save}</button>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                        <i className="fas fa-upload"></i> {t.load}
                        <input type="file" accept=".2you2be" className="hidden" onChange={handleZipImport} />
                    </label>
                </div>
            </div>
          </div>
        )}

        {/* FAQ View */}
        {view === 'faq' && (
            <div className="w-full max-w-2xl px-6 py-10 animate-fadeIn space-y-8">
                <h2 className="text-3xl font-light text-center text-white">{t.faq_title}</h2>
                <div className="space-y-4">
                    {(FAQ_DATA[lang] || FAQ_DATA['en']).map((item, idx) => (
                        <div key={idx} className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <h4 className="text-sm font-bold text-white mb-2">{item.question}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">{item.answer}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Editor View */}
        {view === 'editor' && (state.status === 'ready' || state.status === 'exporting') && audioUrl && (
            <LyricVideoRenderer 
                images={images} setImages={setImages} audioUrl={audioUrl} lyrics={processedLyrics} visualPrompt={""} projectName={projectName} setProjectName={setProjectName} overlay={overlay} setOverlay={setOverlay} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} fps={fps} setFps={setFps} fadeSettings={fadeSettings} setFadeSettings={setFadeSettings} audioSettings={audioSettings} setAudioSettings={setAudioSettings} onLyricsUpdate={setProcessedLyrics} 
                onImageChange={handleMediaSelect} 
                onAudioChange={handleAudioSelect}
                onExportStart={() => setState(prev => ({ ...prev, status: 'exporting' }))} 
                onExportComplete={(blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `${projectName}_v${VERSION}.mp4`; a.click();
                    setState({ status: 'idle' });
                }} onExportError={() => setState({ status: 'error' })} 
                onSaveProject={handleZipExport}
                onBack={() => window.history.back()}
                translations={t}
            />
        )}
      </main>

      {/* Footer - Minimal */}
      <footer className="w-full border-t border-white/5 py-12 bg-[#020617]">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
              <div className="space-y-4">
                  <div className="text-sm font-bold tracking-widest text-white">2YOU2BE</div>
                  <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto md:mx-0">{t.footer_desc}</p>
              </div>
              <div className="space-y-4">
                  <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{t.contact}</h5>
                  <div className="space-y-2 text-[10px] text-slate-500">
                      <a href="mailto:apsardze24@gmail.com" className="block hover:text-white transition-colors">apsardze24@gmail.com</a>
                      <div className="flex justify-center md:justify-start gap-4 text-base mt-2">
                          <a href="https://www.youtube.com/channel/UCXMdbGGTfVG7nc0cEZwz7LA" target="_blank" className="hover:text-red-500 transition-colors"><i className="fab fa-youtube"></i></a>
                          <a href="https://apsardze24.lv" target="_blank" className="hover:text-cyan-500 transition-colors"><i className="fas fa-globe"></i></a>
                      </div>
                  </div>
              </div>
              <div className="space-y-4">
                  <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{t.sponsor}</h5>
                  <a href="https://apsardze24.lv" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 hover:bg-white/10 transition-all text-[10px] font-bold text-slate-300 hover:text-cyan-400">
                      <i className="fas fa-shield-alt"></i> APSARDZE24.LV
                  </a>
              </div>
          </div>
          <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/5 text-center">
              <div className="text-[9px] text-slate-700 font-medium uppercase tracking-widest">© 2025 2YOU2BE • v{VERSION}</div>
          </div>
      </footer>

      {showConsent && (
          <div className="fixed bottom-6 right-6 max-w-sm w-full bg-[#0f172a] p-6 rounded-2xl shadow-2xl border border-white/10 z-[100] animate-fadeIn">
              <p className="text-[11px] font-medium text-slate-300 mb-6 leading-relaxed">{t.consent_text}</p>
              <div className="flex gap-3">
                  <button onClick={() => { localStorage.setItem('2you2be_consent', 'true'); setShowConsent(false); }} className="flex-1 py-3 bg-white text-black rounded-lg text-[10px] font-bold uppercase hover:bg-slate-200 transition-colors">{t.consent_accept}</button>
                  <button onClick={() => { localStorage.setItem('2you2be_consent', 'false'); setShowConsent(false); }} className="flex-1 py-3 bg-white/5 text-slate-400 rounded-lg text-[10px] font-bold uppercase hover:bg-white/10 transition-colors">{t.consent_decline}</button>
              </div>
          </div>
      )}
    </div>
  );
};
export default App;