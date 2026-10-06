import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Sliders, 
  Layers, 
  Upload, 
  Sparkles, 
  Camera, 
  Activity, 
  ChevronRight, 
  ChevronLeft,
  Film,
  RefreshCw
} from 'lucide-react';
import { StyleParameters, LanguageMode } from '../types';
import { VideoShaderEngine } from '../services/videoShaderEngine';
import { SAMPLE_VIDEOS, generateSampleVideo } from '../services/sampleVideos';
import { translations } from '../services/i18n';

interface VideoWorkspaceProps {
  currentParams: StyleParameters;
  onVideoLoaded: (videoData: {
    blobUrl: string;
    width: number;
    height: number;
    duration: number;
    filename: string;
  }) => void;
  activeVideoUrl: string | null;
  videoDuration: number;
  lang: LanguageMode;
  onAddToQueue: () => void;
  onOpenExport: () => void;
  videoTitle: string;
}

export type PreviewMode = 'split' | 'side-by-side' | 'animated' | 'original';

export const VideoWorkspace: React.FC<VideoWorkspaceProps> = ({
  currentParams,
  onVideoLoaded,
  activeVideoUrl,
  videoDuration,
  lang,
  onAddToQueue,
  onOpenExport,
  videoTitle,
}) => {
  const t = translations[lang];

  // Video & Canvas elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VideoShaderEngine | null>(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(videoDuration || 0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('split');
  const [splitPosition, setSplitPosition] = useState<number>(50); // percentage
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [realtimeFps, setRealtimeFps] = useState<number>(0);
  const [isLoadingSample, setIsLoadingSample] = useState<string | null>(null);
  const [sampleGenProgress, setSampleGenProgress] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Initialize shader engine once canvas is ready
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new VideoShaderEngine(canvasRef.current);
    }
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  // Frame rendering loop
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const animationFrameIdRef = useRef<number | null>(null);
  const lastThrottleFrameTimeRef = useRef(0);

  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const engine = engineRef.current;

    if (video && canvas && engine && video.readyState >= 2) {
      const now = performance.now();

      // FPS throttling for Anime style (e.g. 12 or 24 FPS feel)
      const throttleInterval = currentParams.fpsThrottle > 0 ? 1000 / currentParams.fpsThrottle : 0;
      if (throttleInterval === 0 || now - lastThrottleFrameTimeRef.current >= throttleInterval) {
        lastThrottleFrameTimeRef.current = now;

        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;

        engine.renderFrame(video, currentParams, w, h);
      }

      // Track live rendering FPS
      frameCountRef.current++;
      if (now - lastFpsTimeRef.current >= 1000) {
        setRealtimeFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      setCurrentTime(video.currentTime);
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);
  }, [currentParams]);

  useEffect(() => {
    animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [renderLoop]);

  // Video playback handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }

    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      onVideoLoaded({
        blobUrl: url,
        width: tempVideo.videoWidth || 640,
        height: tempVideo.videoHeight || 360,
        duration: tempVideo.duration || 5,
        filename: file.name,
      });
      setIsPlaying(true);
    };
  };

  const handleLoadSample = async (sampleId: string) => {
    setIsLoadingSample(sampleId);
    setSampleGenProgress(10);

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }

    try {
      const sample = await generateSampleVideo(sampleId, (p) => setSampleGenProgress(p));
      const sampleMeta = SAMPLE_VIDEOS.find((s) => s.id === sampleId);
      onVideoLoaded({
        blobUrl: sample.blobUrl,
        width: sample.width,
        height: sample.height,
        duration: sample.duration,
        filename: `${sampleMeta?.title || 'Sample Video'}.webm`,
      });
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to load sample video:', err);
    } finally {
      setIsLoadingSample(null);
    }
  };

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      setIsCameraActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsPlaying(true);
        onVideoLoaded({
          blobUrl: 'camera-stream',
          width: 1280,
          height: 720,
          duration: 3600,
          filename: 'Live Camera Stream.webm',
        });
      }
    } catch (e) {
      console.warn('Camera access issue:', e);
    }
  };

  // Drag split handle
  const handleSplitMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingSplit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSplitPosition(pct);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDraggingSplit(false);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}.${ms}`;
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top Video Header Bar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 overflow-hidden">
          <Film className="w-4 h-4 text-indigo-400 shrink-0" />
          <h2 className="text-sm font-semibold text-zinc-200 truncate">
            {videoTitle || 'Anime Preview Studio'}
          </h2>
          {activeVideoUrl && (
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              ({formatTime(duration)})
            </span>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setPreviewMode('split')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              previewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Interactive Split Slider"
          >
            {t.splitPreview}
          </button>
          <button
            onClick={() => setPreviewMode('side-by-side')}
            className={`px-2 py-1 rounded font-medium transition-colors hidden md:block ${
              previewMode === 'side-by-side' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Side-by-Side Comparison"
          >
            {t.sideBySide}
          </button>
          <button
            onClick={() => setPreviewMode('animated')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              previewMode === 'animated' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Full Stylized Anime"
          >
            {t.animatedOnly}
          </button>
          <button
            onClick={() => setPreviewMode('original')}
            className={`px-2 py-1 rounded font-medium transition-colors hidden sm:block ${
              previewMode === 'original' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Original Video Only"
          >
            {t.originalOnly}
          </button>
        </div>
      </div>

      {/* Main Video Display Area */}
      <div
        ref={containerRef}
        onMouseMove={handleSplitMouseMove}
        onTouchMove={handleSplitMouseMove}
        className="relative flex-1 min-h-[340px] sm:min-h-[420px] lg:min-h-[460px] bg-zinc-950 rounded-2xl border border-zinc-800/90 overflow-hidden select-none flex items-center justify-center shadow-2xl shadow-black/80"
      >
        {/* If no video is uploaded yet, show Upload Dropzone & Sample Loaders */}
        {!activeVideoUrl && !isCameraActive ? (
          <div className="max-w-xl mx-auto p-6 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1.5">{t.uploadVideo}</h3>
            <p className="text-sm text-zinc-400 mb-6 max-w-md">
              {t.uploadVideoDesc}
            </p>

            {/* Upload Button */}
            <label className="relative inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-indigo-600/25 cursor-pointer transition-transform active:scale-95 mb-6">
              <Upload className="w-4 h-4" />
              <span>{t.uploadVideo}</span>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>

            {/* Instant Sample Videos */}
            <div className="w-full pt-4 border-t border-zinc-850">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                {t.orTrySample}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                {SAMPLE_VIDEOS.map((sample) => (
                  <button
                    key={sample.id}
                    disabled={isLoadingSample !== null}
                    onClick={() => handleLoadSample(sample.id)}
                    className="flex flex-col items-start p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-left transition-all hover:border-indigo-500/50 group cursor-pointer disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {sample.duration}s clip
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: sample.previewColor }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 truncate w-full">
                      {lang === 'hi' ? sample.titleHi : sample.title}
                    </span>
                    <span className="text-[11px] text-zinc-400">{sample.category}</span>
                  </button>
                ))}
              </div>

              {/* Sample Generation Loader */}
              {isLoadingSample && (
                <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-indigo-500/30 flex items-center justify-center gap-3">
                  <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span className="text-xs font-medium text-zinc-300">
                    Generating dynamic sample frames... {sampleGenProgress}%
                  </span>
                </div>
              )}

              {/* Live WebCam option */}
              <div className="mt-4">
                <button
                  onClick={handleToggleCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-pink-400" />
                  <span>{t.recordCamera}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Video and Rendered WebGL Canvas Display */
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Hidden / Background Source Video Element */}
            <video
              ref={videoRef}
              src={activeVideoUrl !== 'camera-stream' ? activeVideoUrl || undefined : undefined}
              loop={isLooping}
              muted={isMuted}
              playsInline
              crossOrigin="anonymous"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className={`max-h-full max-w-full object-contain ${
                previewMode === 'original'
                  ? 'opacity-100 z-10'
                  : previewMode === 'side-by-side'
                  ? 'w-1/2 h-full object-contain border-r border-zinc-800'
                  : 'absolute opacity-0 pointer-events-none'
              }`}
            />

            {/* Split screen Left side (Original Video) */}
            {previewMode === 'split' && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center z-10"
                style={{ clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }}
              >
                <video
                  src={activeVideoUrl !== 'camera-stream' ? activeVideoUrl || undefined : undefined}
                  muted
                  playsInline
                  ref={(el) => {
                    // sync time with primary video
                    if (el && videoRef.current && Math.abs(el.currentTime - videoRef.current.currentTime) > 0.05) {
                      el.currentTime = videoRef.current.currentTime;
                      if (!videoRef.current.paused && el.paused) el.play().catch(() => {});
                      if (videoRef.current.paused && !el.paused) el.pause();
                    }
                  }}
                  className="max-h-full max-w-full object-contain pointer-events-none"
                />
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono uppercase tracking-wider text-zinc-300 border border-white/10">
                  Original
                </div>
              </div>
            )}

            {/* WebGL Stylized Canvas */}
            <canvas
              ref={canvasRef}
              className={`max-h-full max-w-full object-contain ${
                previewMode === 'original' ? 'hidden' : ''
              } ${previewMode === 'side-by-side' ? 'w-1/2 h-full' : ''}`}
            />

            {/* Split Screen Slider Divider Bar */}
            {previewMode === 'split' && (
              <div
                onMouseDown={() => setIsDraggingSplit(true)}
                onTouchStart={() => setIsDraggingSplit(true)}
                style={{ left: `${splitPosition}%` }}
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 hover:w-1.5 transition-all shadow-xl shadow-black/80 flex items-center justify-center -translate-x-1/2"
              >
                <div className="w-7 h-7 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg text-xs font-bold ring-2 ring-indigo-500">
                  <div className="flex items-center -space-x-1">
                    <ChevronLeft className="w-3 h-3" />
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            )}

            {/* Top-Right Stylized Badge */}
            {previewMode === 'split' && (
              <div
                className="absolute top-3 right-3 px-2 py-0.5 rounded bg-indigo-950/80 backdrop-blur-md text-[10px] font-mono uppercase tracking-wider text-indigo-300 border border-indigo-500/30 z-10 pointer-events-none"
              >
                Stylized Anime
              </div>
            )}

            {/* Real-time FPS & Performance HUD overlay */}
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-zinc-400 border border-white/10 z-10 flex items-center gap-2 pointer-events-none">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>{realtimeFps} FPS</span>
              <span className="text-zinc-600">|</span>
              <span className="text-indigo-400">Zero-API WebGL</span>
            </div>
          </div>
        )}
      </div>

      {/* Video Player Controls Timeline */}
      {activeVideoUrl && (
        <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 flex flex-col gap-2">
          {/* Timeline Range Slider */}
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <span>{formatTime(duration)}</span>
          </div>

          {/* Action Button Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {/* Playback buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    setCurrentTime(0);
                  }
                }}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-colors cursor-pointer"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Loop toggle */}
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isLooping
                    ? 'bg-indigo-950/40 text-indigo-300 border-indigo-700/50'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
                title="Toggle Looping"
              >
                Loop: {isLooping ? 'On' : 'Off'}
              </button>
            </div>

            {/* Primary Action Buttons: Add to Batch & Export */}
            <div className="flex items-center gap-2">
              {/* Replace Video */}
              <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Replace</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>

              {/* Add to Batch Queue */}
              <button
                onClick={onAddToQueue}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.addToQueue}</span>
              </button>

              {/* Export Button */}
              <button
                onClick={onOpenExport}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.exportVideo}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
