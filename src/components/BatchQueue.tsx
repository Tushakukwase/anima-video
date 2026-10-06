import React from 'react';
import { 
  Layers, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileArchive, 
  Cpu, 
  CloudRain, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { VideoJob, LanguageMode } from '../types';
import { translations } from '../services/i18n';
import JSZip from 'jszip';

interface BatchQueueProps {
  jobs: VideoJob[];
  isProcessingBatch: boolean;
  onStartBatch: () => void;
  onPauseBatch: () => void;
  onRemoveJob: (id: string) => void;
  onClearCompleted: () => void;
  onSelectJobForPreview: (job: VideoJob) => void;
  edgeWorkerMode: boolean;
  onToggleEdgeWorker: (enabled: boolean) => void;
  lang: LanguageMode;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({
  jobs,
  isProcessingBatch,
  onStartBatch,
  onPauseBatch,
  onRemoveJob,
  onClearCompleted,
  onSelectJobForPreview,
  edgeWorkerMode,
  onToggleEdgeWorker,
  lang,
}) => {
  const t = translations[lang];

  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const inProgressJob = jobs.find((j) => j.status === 'rendering');

  const handleDownloadAllZip = async () => {
    const completedJobs = jobs.filter((j) => j.status === 'completed' && j.renderedBlobUrl);
    if (completedJobs.length === 0) return;

    const zip = new JSZip();
    for (let i = 0; i < completedJobs.length; i++) {
      const job = completedJobs[i];
      try {
        const resp = await fetch(job.renderedBlobUrl!);
        const blob = await resp.blob();
        zip.file(`animated_${i + 1}_${job.title}.webm`, blob);
      } catch (err) {
        console.warn('Failed to add job to zip:', err);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `animastudio_batch_export_${Date.now()}.zip`;
    link.click();
  };

  return (
    <div className="flex flex-col bg-zinc-900/90 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 border-b border-zinc-800 bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{t.batchQueue}</h3>
            <span className="text-[11px] text-zinc-400">
              {jobs.length} jobs ({completedCount} completed)
            </span>
          </div>
        </div>

        {/* Cloud / Edge Worker Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleEdgeWorker(!edgeWorkerMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              edgeWorkerMode
                ? 'bg-purple-950/40 text-purple-300 border-purple-800/60'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            title="Accelerated Edge Worker rendering simulation"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>{edgeWorkerMode ? 'Cloud/Edge: Turbo' : 'Standard WebGL'}</span>
          </button>

          {/* Action buttons */}
          {jobs.length > 0 && (
            <div className="flex items-center gap-1.5">
              {isProcessingBatch ? (
                <button
                  onClick={onPauseBatch}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  onClick={onStartBatch}
                  className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t.startBatch}</span>
                </button>
              )}

              {completedCount > 0 && (
                <button
                  onClick={handleDownloadAllZip}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  title="Download All Rendered Clips as ZIP"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>ZIP</span>
                </button>
              )}

              <button
                onClick={onClearCompleted}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Clear completed jobs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ongoing Job Progress Alert Banner */}
      {inProgressJob && (
        <div className="px-4 py-2.5 bg-indigo-950/40 border-b border-indigo-900/50 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-indigo-300 font-medium truncate">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span className="truncate">Processing: {inProgressJob.title}</span>
            </div>
            <span className="font-mono text-indigo-200">{inProgressJob.progress}%</span>
          </div>

          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-200"
              style={{ width: `${inProgressJob.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue Items List */}
      <div className="p-3 flex flex-col gap-2 max-h-[360px] overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
            <Layers className="w-8 h-8 stroke-[1.5] text-zinc-600" />
            <p className="text-xs">{t.noVideosInQueue}</p>
          </div>
        ) : (
          jobs.map((job, idx) => {
            return (
              <div
                key={job.id}
                className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/90 flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
              >
                {/* Index & Title */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-mono text-zinc-400 w-4">
                    #{idx + 1}
                  </span>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {job.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      <span>{job.duration.toFixed(1)}s</span>
                      <span>•</span>
                      <span className="text-indigo-400 capitalize">{job.styleId}</span>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {job.status === 'completed' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>

                      {job.renderedBlobUrl && (
                        <a
                          href={job.renderedBlobUrl}
                          download={`animated_${job.title}.webm`}
                          className="p-1 rounded-md bg-zinc-800 text-zinc-200 hover:bg-indigo-600 hover:text-white transition-colors"
                          title="Download Video"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ) : job.status === 'rendering' ? (
                    <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-800 px-2 py-0.5 rounded-full">
                      {job.progress}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" />
                      <span>Queued</span>
                    </span>
                  )}

                  {/* Preview button */}
                  <button
                    onClick={() => onSelectJobForPreview(job)}
                    className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Load in Studio Workspace"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Remove button */}
                  <button
                    onClick={() => onRemoveJob(job.id)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Remove job"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
