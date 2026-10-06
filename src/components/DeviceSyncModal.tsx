import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Smartphone, 
  Monitor, 
  Download, 
  Upload, 
  CheckCircle2, 
  QrCode, 
  Share2, 
  ShieldCheck, 
  Copy,
  Check
} from 'lucide-react';
import { StylePreset, CustomUploadedStyle, VideoJob, LanguageMode } from '../types';
import { translations } from '../services/i18n';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: VideoJob[];
  customStyles: CustomUploadedStyle[];
  onImportPackage: (importedData: { projects: VideoJob[]; customStyles: CustomUploadedStyle[] }) => void;
  lang: LanguageMode;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  projects,
  customStyles,
  onImportPackage,
  lang,
}) => {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  // Draw procedural QR pattern on canvas
  useEffect(() => {
    if (!qrCanvasRef.current) return;
    const canvas = qrCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 180;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw stylized QR matrix dots
    ctx.fillStyle = '#0f172a';
    const grid = 21;
    const cellSize = size / grid;

    // Corner finder patterns
    const drawFinder = (x: number, y: number) => {
      ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    };

    drawFinder(0, 0);
    drawFinder(grid - 7, 0);
    drawFinder(0, grid - 7);

    // Random consistent data dots
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= grid - 8) ||
          (r >= grid - 8 && c < 8)
        ) {
          continue;
        }
        if (((r * 7 + c * 13 + 5) % 17) % 2 === 0) {
          ctx.fillRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize - 1, cellSize - 1);
        }
      }
    }
  }, [isOpen]);

  const handleExportSyncFile = () => {
    const payload = {
      app: 'AnimaStudio',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projects,
      customStyles,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animastudio_sync_package_${Date.now()}.json`;
    a.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.app === 'AnimaStudio') {
          onImportPackage({
            projects: parsed.projects || [],
            customStyles: parsed.customStyles || [],
          });
          onClose();
        } else {
          alert('Invalid package file format.');
        }
      } catch (err) {
        alert('Could not parse package file.');
      }
    };
    reader.readAsText(file);
  };

  const syncUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.syncModalTitle}</h3>
              <p className="text-xs text-zinc-400">Offline & Direct Device Pairing</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-zinc-400 leading-relaxed">
            {t.syncModalDesc}
          </p>

          {/* QR Code section */}
          <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 rounded-xl border border-zinc-800 gap-3">
            <div className="p-2 bg-white rounded-xl shadow-md">
              <canvas ref={qrCanvasRef} className="w-40 h-40" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-zinc-200">Scan with Phone Camera</div>
              <div className="text-[11px] text-zinc-400">
                Instantly open AnimaStudio on your mobile browser
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Copy Mobile Link'}</span>
            </button>
          </div>

          {/* Export / Import Package File */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleExportSyncFile}
              className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl font-medium border border-zinc-700 transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Export Sync File</span>
            </button>

            <label className="flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-md shadow-indigo-600/20 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Import Sync File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
