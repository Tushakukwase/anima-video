export type StyleCategory = 'anime' | 'comic' | 'retro' | 'art' | 'cyber' | 'custom';

export interface StyleParameters {
  edgeThreshold: number;      // 0 to 100 (sensitivity of ink outlines)
  edgeThickness: number;      // 1 to 5 (line boldness)
  edgeDarkness: number;       // 0 to 100 (opacity of black contour lines)
  colorBands: number;          // 2 to 16 (cel-shading step count)
  smoothing: number;           // 0 to 10 (Kuwahara/bilateral paint smoothing)
  saturation: number;          // 0 to 200 (color punch)
  contrast: number;            // 50 to 180 (dynamic range)
  brightness: number;          // -30 to 50
  bloomGlow: number;           // 0 to 100 (dreamy anime light bleed)
  halftoneDotSize: number;     // 0 to 20 (comic dot pattern)
  pixelBlockSize: number;      // 1 to 24 (retro pixelation)
  sketchHatch: number;         // 0 to 100 (pencil cross-hatch intensity)
  paperGrain: number;          // 0 to 50 (canvas/paper noise)
  fpsThrottle: number;         // 0 (off), 12 (anime traditional 2s), 15, 24
  colorTint: string;           // hex or 'none'
  paletteExtract?: string[];   // hex colors extracted from custom style image
  invertEdges?: boolean;       // for neon glow lines
}

export interface StylePreset {
  id: string;
  name: string;
  nameHi: string;
  category: StyleCategory;
  description: string;
  descriptionHi: string;
  accentColor: string;
  previewGradient: string;
  parameters: StyleParameters;
  isCustom?: boolean;
  customImagePreview?: string;
}

export interface VideoJob {
  id: string;
  title: string;
  duration: number; // in seconds
  width: number;
  height: number;
  originalBlobUrl: string;
  thumbnailUrl: string;
  styleId: string;
  customParameters: StyleParameters;
  status: 'idle' | 'rendering' | 'completed' | 'paused' | 'error';
  progress: number; // 0 to 100
  currentFrame: number;
  totalFrames: number;
  renderFps: number;
  renderedBlobUrl?: string;
  fileSizeBytes: number;
  createdAt: number;
  error?: string;
}

export interface ExportSettings {
  format: 'webm' | 'mp4' | 'frames_zip';
  resolution: 'original' | '1080p' | '720p' | '480p' | 'square' | 'vertical';
  fps: number; // 12, 15, 24, 30, 60
  bitrateKbps: number; // e.g. 8000
  preserveAudio: boolean;
  quality: 'ultra' | 'high' | 'medium' | 'fast';
}

export interface CustomUploadedStyle {
  id: string;
  name: string;
  imageBlobUrl: string;
  extractedColors: string[];
  parameters: StyleParameters;
  createdAt: number;
}

export type ThemeMode = 'dark' | 'oled' | 'light';
export type LanguageMode = 'en' | 'hi';
