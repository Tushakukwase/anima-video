import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  AlertCircle,
  FileArchive,
  Film
} from 'lucide-react';
import { ExportSettings, StyleParameters, LanguageMode } from '../types';
import { VideoExportPipeline, RenderProgress } from '../services/audioVideoExport';
import { translations } from '../services/i18n';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceVideoUrl: string | null;
  videoDuration: number;
  currentParams: StyleParameters;
  lang: LanguageMode;
  onExportSuccess: (blobUrl: string, filename: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sourceVideoUrl,
  videoDuration,
  currentParams,
  lang,
  onExportSuccess,
}) => {
  const t = translations[lang];

  const [settings, setSettings] = useState<ExportSettings>({
    format: 'webm',
    resolution: '720p',
    fps: 24,
    bitrateKbps: 6000,
    preserveAudio: true,
    quality: 'high',
  });

  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [completedUrl, setCompletedUrl] = useState<string | null>(null);
  const [completedFilename, setCompletedFilename] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);

  const pipelineRef = useRef<VideoExportPipeline | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (!sourceVideoUrl || !hiddenVideoRef.current) return;

    setIsRendering(true);
    setRenderError(null);
    setCompletedUrl(null);

    const pipeline = new VideoExportPipeline();
    pipelineRef.current = pipeline;

    try {
      const result = await pipeline.renderVideo(
        hiddenVideoRef.current,
        currentParams,
        settings,
        (p) => setRenderProgress(p)
      );

      setCompletedUrl(result.url);
      setCompletedFilename(result.filename);
      onExportSuccess(result.url, result.filename);
    } catch (err: unknown) {
      if ((err as Error)?.message !== 'Render cancelled by user') {
        console.error('Export error:', err);
        setRenderError('Export failed. Please check video file or try 720p resolution.');
      }
    } finally {
      setIsRendering(false);
    }
  };

  const handleCancelExport = () => {
    if (pipelineRef.current) {
      pipelineRef.current.cancel();
    }
    setIsRendering(false);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Hidden video element for rendering export frames */}
      <video
        ref={hiddenVideoRef}
        src={sourceVideoUrl || undefined}
        crossOrigin="anonymous"
        muted={!settings.preserveAudio}
        className="hidden"
      />

      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.exportSettings}</h3>
              <p className="text-xs text-zinc-400">
                100% Free Local Rendering • No API Cost
              </p>
            </div>
          </div>

          {!isRendering && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5 text-xs">
          {!isRendering && !completedUrl ? (
            /* Settings Form */
            <>
              {/* Resolution options */}
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-zinc-300">{t.resolution}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1080p', label: '1080p Full HD', sub: 'Highest detail' },
                    { id: '720p', label: '720p HD', sub: 'Recommended' },
                    { id: '480p', label: '480p Fast', sub: 'Quick draft' },
                    { id: 'vertical', label: '9:16 Shorts', sub: 'Reels / TikTok' },
                    { id: 'square', label: '1:1 Square', sub: 'Instagram' },
                    { id: 'original', label: 'Original', sub: 'Native aspect' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      onClick={() => setSettings({ ...settings, resolution: res.id as ExportSettings['resolution'] })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        settings.resolution === res.id
                          ? 'border-indigo-500 bg-indigo-950/40 text-white font-medium ring-1 ring-indigo-500'
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-semibold text-zinc-200">{res.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{res.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Framerate options */}
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-zinc-300">{t.framerate}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { fps: 12, label: '12 FPS', desc: 'Classic Anime' },
                    { fps: 24, label: '24 FPS', desc: 'Cinematic' },
                    { fps: 30, label: '30 FPS', desc: 'Standard' },
                    { fps: 60, label: '60 FPS', desc: 'High motion' },
                  ].map((f) => (
                    <button
                      key={f.fps}
                      onClick={() => setSettings({ ...settings, fps: f.fps })}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        settings.fps === f.fps
                          ? 'border-indigo-500 bg-indigo-950/40 text-white font-semibold ring-1 ring-indigo-500'
                          : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs">{f.label}</div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format selection */}
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-zinc-300">{t.format}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings({ ...settings, format: 'webm' })}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                      settings.format === 'webm'
                        ? 'border-indigo-500 bg-indigo-950/40 text-white font-semibold ring-1 ring-indigo-500'
                        : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Film className="w-4 h-4 text-indigo-400" />
                    <div className="text-left">
                      <div>WebM / MP4 Video</div>
                      <div className="text-[10px] text-zinc-400 font-normal">Fast hardware encoding</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSettings({ ...settings, format: 'frames_zip' })}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                      settings.format === 'frames_zip'
                        ? 'border-indigo-500 bg-indigo-950/40 text-white font-semibold ring-1 ring-indigo-500'
                        : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <FileArchive className="w-4 h-4 text-purple-400" />
                    <div className="text-left">
                      <div>Frame Sequence (ZIP)</div>
                      <div className="text-[10px] text-zinc-400 font-normal">PNG/JPEG per frame</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Preserve Audio Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="flex items-center gap-2">
                  {settings.preserveAudio ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-zinc-400" />
                  )}
                  <div>
                    <div className="font-semibold text-zinc-200">{t.preserveAudio}</div>
                    <div className="text-[10px] text-zinc-400">Sync soundtrack to animated output</div>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={settings.preserveAudio}
                  onChange={(e) => setSettings({ ...settings, preserveAudio: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-zinc-800 border-zinc-700 cursor-pointer"
                />
              </div>
            </>
          ) : isRendering ? (
            /* Live Progress Tracker */
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-indigo-500/10 border-2 border-indigo-500/30">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"
                />
              </div>

              <div>
                <h4 className="text-base font-bold text-white mb-1">
                  {renderProgress?.status === 'encoding'
                    ? 'Finalizing Video File...'
                    : 'Processing Animated Frames...'}
                </h4>
                <p className="text-xs text-zinc-400">
                  {renderProgress?.currentFrame || 0} / {renderProgress?.totalFrames || 0} frames
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full transition-all duration-300"
                  style={{ width: `${renderProgress?.percent || 0}%` }}
                />
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-2 w-full pt-2">
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400">{t.renderSpeed}</div>
                  <div className="text-sm font-mono font-bold text-zinc-200">
                    {renderProgress?.fps || 0} FPS
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400">Elapsed</div>
                  <div className="text-sm font-mono font-bold text-zinc-200">
                    {formatSeconds(renderProgress?.elapsedSec || 0)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400">ETA Left</div>
                  <div className="text-sm font-mono font-bold text-indigo-400">
                    {formatSeconds(renderProgress?.remainingSec || 0)}
                  </div>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                onClick={handleCancelExport}
                className="mt-2 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                Cancel Export
              </button>
            </div>
          ) : (
            /* Completed Export Preview & Download */
            <div className="flex flex-col items-center text-center py-4 gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-base font-bold text-white mb-0.5">
                  Rendering Complete!
                </h4>
                <p className="text-xs text-zinc-400">{completedFilename}</p>
              </div>

              {/* Rendered video playback preview */}
              {completedUrl && settings.format === 'webm' && (
                <div className="w-full max-h-48 rounded-xl overflow-hidden border border-zinc-800 bg-black">
                  <video
                    src={completedUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full max-h-48 object-contain"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                <a
                  href={completedUrl || '#'}
                  download={completedFilename}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/25 transition-all text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>

                <button
                  onClick={() => {
                    setCompletedUrl(null);
                    setRenderProgress(null);
                  }}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Export Another
                </button>
              </div>
            </div>
          )}

          {renderError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{renderError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isRendering && !completedUrl && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleStartExport}
              disabled={!sourceVideoUrl}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.renderNow}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
