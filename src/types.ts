export interface Project {
  id: string;
  title: string;
  artist: string;
  coverImage: string | null;
  description: string;
  resolution: '720p' | '1080p' | '4k' | 'square' | 'portrait';
  fps: number;
  tracks: Track[];
  globalSettings: GlobalSettings;
  lastEdited: number;
}

export interface Track {
  id: string;
  number: number;
  title: string;
  artist?: string;
  audioFile: File | null;
  audioUrl: string;
  duration: number;
  backgroundMedia?: string | null; // URL to image/video
  coverImage?: string; // Square cover art specifically for this track
  textSettings?: Partial<TextSettings>;
  startTime?: number; // Calculated in timeline
  endTime?: number;
}

export interface GlobalSettings {
  template: string;
  backgroundColor?: string;
  textSettings: TextSettings;
  titleFont?: string;
  artistFont?: string;
  headerText?: string;
  lyricsText?: string;
  shadowIntensity?: number;
}

export interface TextSettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: 'left' | 'center' | 'right';
  x: number;
  y: number;
  opacity: number;
  animation: 'none' | 'fade-in' | 'slide-up';
}

export interface UserSettings {
  displayName: string;
  defaultArtistName: string;
  defaultFont: string;
  defaultFormat: '1080p' | 'portrait' | 'square' | '4k';
}
