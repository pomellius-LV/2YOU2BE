import React from 'react';

interface Props {
  onAudioSelect: (file: File) => void;
  onImageSelect: (file: File) => void;
  onLyricsChange: (text: string) => void;
  onSrtSelect: (file: File) => void;
  audioFile: File | null;
  backgroundImageUrl: string | null;
  lyrics: string;
  translations: any;
}

const FileUpload: React.FC<Props> = ({ onAudioSelect, onImageSelect, onLyricsChange, onSrtSelect, audioFile, backgroundImageUrl, lyrics, translations }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full">
      
      {/* AUDIO */}
      <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{translations.upload_mp3}</span>
              {audioFile && <i className="fas fa-check-circle text-cyan-500"></i>}
          </div>
          <label className="block p-10 bg-black/40 border border-white/5 rounded-3xl cursor-pointer hover:border-white/10 transition-all group shadow-inner">
              <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                      <i className="fas fa-microphone-alt text-xl"></i>
                  </div>
                  <div>
                      <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1 truncate max-w-[200px]">
                        {audioFile ? audioFile.name : translations.select}
                      </div>
                      <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{translations.hint_audio}</div>
                  </div>
              </div>
              <input type="file" className="hidden" accept="audio/*" onChange={(e) => e.target.files?.[0] && onAudioSelect(e.target.files[0])} />
          </label>
      </div>

      {/* BACKGROUND */}
      <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{translations.upload_img}</span>
              {backgroundImageUrl && <i className="fas fa-check-circle text-cyan-500"></i>}
          </div>
          <label className="block p-10 bg-black/40 border border-white/5 rounded-3xl cursor-pointer hover:border-white/10 transition-all group shadow-inner">
              <div className="flex flex-col items-center gap-4 text-center">
                  {backgroundImageUrl ? (
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg border border-white/10">
                        <img src={backgroundImageUrl} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                      <i className="fas fa-image text-xl"></i>
                    </div>
                  )}
                  <div>
                      <div className="text-[12px] font-black text-white uppercase tracking-widest mb-1">
                        {backgroundImageUrl ? 'READY' : translations.select}
                      </div>
                      <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{translations.hint_img}</div>
                  </div>
              </div>
              <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && onImageSelect(e.target.files[0])} />
          </label>
      </div>

      {/* LYRICS */}
      <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{translations.upload_lyrics}</span>
              <label className="cursor-pointer text-[10px] font-black uppercase text-cyan-500 hover:text-white transition-colors tracking-widest">
                  <i className="fas fa-file-import mr-2"></i> {translations.import_srt}
                  <input type="file" accept=".srt" className="hidden" onChange={(e) => e.target.files?.[0] && onSrtSelect(e.target.files[0])} />
              </label>
          </div>
          <div className="relative bg-black/60 rounded-[2.5rem] border border-white/5 p-2 overflow-hidden focus-within:border-cyan-500/30 transition-all shadow-2xl">
              <textarea
                className="w-full h-56 bg-transparent text-white p-6 text-[18px] font-black outline-none resize-none placeholder-slate-800 leading-[1.6] custom-scrollbar selection:bg-cyan-500 selection:text-black"
                placeholder={translations.placeholder_lyrics}
                value={lyrics}
                onChange={(e) => onLyricsChange(e.target.value)}
              />
              <div className="absolute bottom-6 right-8 pointer-events-none">
                  <div className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">{lyrics.length} CHARS</div>
              </div>
          </div>
      </div>

    </div>
  );
};

export default FileUpload;