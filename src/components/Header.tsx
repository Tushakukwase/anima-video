import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  HardDrive, 
  Smartphone, 
  Moon, 
  Sun, 
  Languages, 
  Settings, 
  Zap,
  CheckCircle2
} from 'lucide-react';
import { ThemeMode, LanguageMode } from '../types';
import { translations } from '../services/i18n';

interface HeaderProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  lang: LanguageMode;
  onLangChange: (lang: LanguageMode) => void;
  onOpenSync: () => void;
  onOpenEncryption: () => void;
  onOpenSettings: () => void;
  isVaultLocked: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onThemeChange,
  lang,
  onLangChange,
  onOpenSync,
  onOpenEncryption,
  onOpenSettings,
  isVaultLocked,
}) => {
  const t = translations[lang];

  const cycleTheme = () => {
    if (theme === 'dark') onThemeChange('oled');
    else if (theme === 'oled') onThemeChange('light');
    else onThemeChange('dark');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-4 lg:px-6 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" title="100% Free Client-Side Engine" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                {t.appTitle}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO LOCAL
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Status Indicators: Zero API & Offline & Encryption */}
        <div className="hidden md:flex items-center gap-2">
          {/* Zero API Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{t.zeroApiBadge}</span>
          </div>

          {/* Local DB / Offline Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
            <HardDrive className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{t.offlineBadge}</span>
          </div>

          {/* Encryption Badge */}
          <button
            onClick={onOpenEncryption}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              isVaultLocked
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/50'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Manage AES-256 Project Encryption Vault"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{isVaultLocked ? 'Vault Locked' : t.encryptionBadge}</span>
          </button>
        </div>

        {/* Quick Tools & Shortcuts */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile & Desktop Sync */}
          <button
            onClick={onOpenSync}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            title="Desktop & Mobile Offline Sync"
          >
            <Smartphone className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => onLangChange(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            title="Toggle Language (English / Hinglish हिन्दी)"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* Dark / OLED / Light Theme toggle */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            title={`Current theme: ${theme}. Click to switch (shortcut: D)`}
          >
            {theme === 'light' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : theme === 'oled' ? (
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="hidden sm:inline uppercase text-[11px] font-mono">{theme}</span>
          </button>

          {/* Quick Settings & Help */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            title="Quick Settings & GPU Acceleration"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
