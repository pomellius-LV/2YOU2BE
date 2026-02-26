
export interface LyricLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaTrimStart?: number;
  mediaTrimEnd?: number;
  color?: string;
}

export interface MediaLayer {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  startTime: number; 
  duration?: number;
  linkedLineIndex?: number;
  file?: File; // For ZIP export
}

export type AspectRatio = '16:9' | '9:16';

export interface FadeSettings {
  fadeIn: number;
  fadeOut: number;
}

export interface AudioSettings {
  trimStart: number;
  trimEnd: number;
}

export interface OverlaySettings {
  logoUrl?: string;
  logoX: number;
  logoY: number;
  logoScale: number;
  extraText: string;
  textColor: string;
  textX: number;
  textY: number;
  fontSize: number;
  fontFamily: string;
  subColor: string;
  subFont: string;
  subSize: number;
  subFx: 'none' | 'particles' | 'glitch' | 'smoke' | 'neon';
}

export interface UserReview {
  id: string;
  author: string;
  text: string;
  rating: number;
  date: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface VideoState {
  status: 'idle' | 'ready' | 'exporting' | 'error';
  message?: string;
}
