import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Key, 
  FileLock, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { VideoJob, CustomUploadedStyle, LanguageMode } from '../types';
import { CryptoVault } from '../services/encryption';
import { translations } from '../services/i18n';

interface EncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVaultLocked: boolean;
  onToggleVaultLock: (isLocked: boolean) => void;
  projects: VideoJob[];
  customStyles: CustomUploadedStyle[];
  onImportDecrypted: (data: { projects: VideoJob[]; customStyles: CustomUploadedStyle[] }) => void;
  lang: LanguageMode;
}

export const EncryptionModal: React.FC<EncryptionModalProps> = ({
  isOpen,
  onClose,
  isVaultLocked,
  onToggleVaultLock,
  projects,
  customStyles,
  onImportDecrypted,
  lang,
}) => {
  const t = translations[lang];

  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleEncryptAndDownload = async () => {
    if (!passphrase || passphrase.length < 6) {
      setStatusMsg({ type: 'error', text: 'Passphrase must be at least 6 characters long.' });
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setStatusMsg({ type: 'error', text: 'Passphrase and confirmation do not match.' });
      return;
    }

    try {
      const payload = JSON.stringify({
        projects,
        customStyles,
        timestamp: Date.now(),
      });

      const encrypted = await CryptoVault.encrypt(payload, passphrase);
      const blob = new Blob([encrypted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animastudio_vault_backup_${Date.now()}.anima.enc`;
      a.click();

      setStatusMsg({ type: 'success', text: 'Vault backup securely encrypted (AES-256 GCM) & downloaded!' });
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Failed to encrypt data.' });
    }
  };

  const handleDecryptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!decryptPassphrase) {
      setStatusMsg({ type: 'error', text: 'Please enter the decryption passphrase first.' });
      return;
    }

    try {
      const encryptedText = await file.text();
      const decryptedJson = await CryptoVault.decrypt(encryptedText, decryptPassphrase);
      const parsed = JSON.parse(decryptedJson);

      onImportDecrypted({
        projects: parsed.projects || [],
        customStyles: parsed.customStyles || [],
      });

      setStatusMsg({ type: 'success', text: 'Vault decrypted successfully! Restored projects.' });
      setDecryptPassphrase('');
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Invalid password or corrupted encrypted file.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.encryptionModalTitle}</h3>
              <p className="text-xs text-zinc-400">Military-Grade AES-GCM 256-bit</p>
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
          {/* Security Banner */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-zinc-300 leading-relaxed text-[11px]">
              {t.encryptionModalDesc} All keys are generated entirely in your device’s browser memory via Web Crypto API. Zero server transmissions.
            </div>
          </div>

          {/* Quick Vault Lock Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div>
              <div className="font-semibold text-zinc-200">Session Privacy Shield</div>
              <div className="text-[10px] text-zinc-400">Hide project titles and preview thumbnails</div>
            </div>

            <button
              onClick={() => onToggleVaultLock(!isVaultLocked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                isVaultLocked
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {isVaultLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isVaultLocked ? 'Locked' : 'Unlocked'}</span>
            </button>
          </div>

          {/* Encrypt & Export Backup */}
          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col gap-2.5">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <FileLock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export Encrypted Vault Backup</span>
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="password"
                placeholder="Enter Encryption Passphrase (min 6 chars)"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
              <input
                type="password"
                placeholder="Confirm Passphrase"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
              <button
                onClick={handleEncryptAndDownload}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Encrypt & Download (.anima.enc)</span>
              </button>
            </div>
          </div>

          {/* Decrypt & Restore */}
          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col gap-2.5">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-pink-400" />
              <span>Restore Encrypted Backup</span>
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="password"
                placeholder="Enter Decryption Passphrase"
                value={decryptPassphrase}
                onChange={(e) => setDecryptPassphrase(e.target.value)}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs"
              />

              <label className="flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-medium rounded-lg border border-zinc-700 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Select .anima.enc File</span>
                <input
                  type="file"
                  accept=".enc"
                  onChange={handleDecryptFile}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/40 border-red-800 text-red-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
