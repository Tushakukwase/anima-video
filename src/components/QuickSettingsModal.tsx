import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Moon, 
  Sun, 
  Zap, 
  Laptop, 
  Keyboard, 
  HardDrive, 
  Cpu, 
  CheckCircle2, 
  Trash2 
} from 'lucide-react';
import { ThemeMode, LanguageMode } from '../types';
import { localDB } from '../services/db';
import { translations } from '../services/i18n';

interface QuickSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (t: ThemeMode) => void;
  lang: LanguageMode;
  onLangChange: (l: LanguageMode) => void;
}

export const QuickSettingsModal: React.FC<QuickSettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  lang,
  onLangChange,
}) => {
  const t = translations[lang];
  const [storageInfo, setStorageInfo] = useState<{ usedMB: number; quotaMB: number }>({ usedMB: 0, quotaMB: 0 });

  useEffect(() => {
    if (isOpen) {
      localDB.getStorageEstimate().then((info) => setStorageInfo(info));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.quickSettings}</h3>
              <p className="text-xs text-zinc-400">Theme, Performance & Shortcuts</p>
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
        <div className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Appearance & Dark Mode */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Theme & Night Mode (Minimalist)</span>
            </label>
            <p className="text-[11px] text-zinc-400">
              Easily toggle dark mode to reduce eye strain during late-night creative sessions.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => onThemeChange('dark')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white font-semibold ring-1 ring-indigo-500'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Pro Dark</span>
              </button>

              <button
                onClick={() => onThemeChange('oled')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  theme === 'oled'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white font-semibold ring-1 ring-indigo-500'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Zap className="w-4 h-4 text-purple-400" />
                <span>OLED Pure</span>
              </button>

              <button
                onClick={() => onThemeChange('light')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  theme === 'light'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white font-semibold ring-1 ring-indigo-500'
                    : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Day Light</span>
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
            <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-pink-400" />
              <span>Keyboard Shortcuts</span>
            </label>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-850">
                <span className="text-zinc-400">Play / Pause</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">Space</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-850">
                <span className="text-zinc-400">Toggle Dark Mode</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">D</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-850">
                <span className="text-zinc-400">Export Modal</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">E</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-850">
                <span className="text-zinc-400">Language Switch</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">L</kbd>
              </div>
            </div>
          </div>

          {/* Local Storage & Cache Usage */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
            <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Local Storage & Zero API Status</span>
            </label>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">IndexedDB Cache:</span>
                <span className="font-mono text-zinc-200">
                  {storageInfo.usedMB} MB / {storageInfo.quotaMB} MB
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All video processing runs 100% on your device GPU.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
