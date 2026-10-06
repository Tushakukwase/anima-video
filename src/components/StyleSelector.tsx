import React, { useState } from 'react';
import { 
  Palette, 
  Upload, 
  SlidersHorizontal, 
  Sparkles, 
  RotateCcw, 
  Trash2, 
  Check, 
  Plus,
  Eye,
  Brush,
  Zap,
  Film
} from 'lucide-react';
import { 
  StylePreset, 
  StyleParameters, 
  CustomUploadedStyle, 
  StyleCategory, 
  LanguageMode 
} from '../types';
import { DEFAULT_STYLE_PRESETS } from '../services/stylePresets';
import { analyzeStyleImage } from '../services/styleExtraction';
import { translations } from '../services/i18n';

interface StyleSelectorProps {
  currentPresetId: string;
  onSelectPreset: (preset: StylePreset) => void;
  currentParams: StyleParameters;
  onParamChange: (newParams: StyleParameters) => void;
  customStyles: CustomUploadedStyle[];
  onAddCustomStyle: (style: CustomUploadedStyle) => void;
  onDeleteCustomStyle: (id: string) => void;
  lang: LanguageMode;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  currentPresetId,
  onSelectPreset,
  currentParams,
  onParamChange,
  customStyles,
  onAddCustomStyle,
  onDeleteCustomStyle,
  lang,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'tuning'>('presets');
  const [selectedCategory, setSelectedCategory] = useState<StyleCategory | 'all'>('all');
  const [isUploadingStyle, setIsUploadingStyle] = useState<boolean>(false);
  const [customStyleName, setCustomStyleName] = useState<string>('');

  const categories: { id: StyleCategory | 'all'; label: string; labelHi: string }[] = [
    { id: 'all', label: 'All Styles', labelHi: 'सभी स्टाइल्स' },
    { id: 'anime', label: 'Anime & Cel', labelHi: 'एनिमे' },
    { id: 'comic', label: 'Comic Book', labelHi: 'कॉमिक' },
    { id: 'cyber', label: 'Cyberpunk', labelHi: 'साइबरपंक' },
    { id: 'retro', label: 'Retro & 8-Bit', labelHi: 'रेट्रो' },
    { id: 'art', label: 'Fine Arts', labelHi: 'आर्ट्स' },
  ];

  const filteredPresets = selectedCategory === 'all'
    ? DEFAULT_STYLE_PRESETS
    : DEFAULT_STYLE_PRESETS.filter((p) => p.category === selectedCategory);

  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingStyle(true);
    try {
      const name = customStyleName.trim() || file.name.replace(/\.[^/.]+$/, '');
      const analyzed = await analyzeStyleImage(file, name);
      onAddCustomStyle(analyzed);

      // Immediately apply
      const newPreset: StylePreset = {
        id: analyzed.id,
        name: analyzed.name,
        nameHi: analyzed.name,
        category: 'custom',
        description: 'Custom palette transferred from uploaded reference artwork.',
        descriptionHi: 'अपलोड की गई कला से ट्रांसफर किया गया कस्टम कलर पैलेट।',
        accentColor: analyzed.extractedColors[0] || '#8b5cf6',
        previewGradient: 'from-purple-600 via-indigo-600 to-pink-500',
        parameters: analyzed.parameters,
        isCustom: true,
        customImagePreview: analyzed.imageBlobUrl,
      };
      onSelectPreset(newPreset);
      setCustomStyleName('');
    } catch (err) {
      console.error('Failed to extract custom style:', err);
    } finally {
      setIsUploadingStyle(false);
    }
  };

  const updateParam = (key: keyof StyleParameters, value: unknown) => {
    onParamChange({
      ...currentParams,
      [key]: value,
    });
  };

  const handleResetToPresetDefault = () => {
    const matched = DEFAULT_STYLE_PRESETS.find((p) => p.id === currentPresetId);
    if (matched) {
      onParamChange({ ...matched.parameters });
    }
  };

  return (
    <div className="flex flex-col bg-zinc-900/90 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
      {/* Tab Switcher */}
      <div className="flex items-center border-b border-zinc-800 bg-zinc-950/60 p-1.5 gap-1">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'presets'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>{t.stylePresets}</span>
        </button>

        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'custom'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Custom ({customStyles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tuning')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'tuning'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{t.fineTuneFilters}</span>
        </button>
      </div>

      {/* Tab 1: Presets Gallery */}
      {activeTab === 'presets' && (
        <div className="p-4 flex flex-col gap-3 max-h-[580px] overflow-y-auto">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {lang === 'hi' ? cat.labelHi : cat.label}
              </button>
            ))}
          </div>

          {/* Grid of Preset Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredPresets.map((preset) => {
              const isSelected = currentPresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-850/50'
                  }`}
                >
                  {/* Gradient preview banner */}
                  <div
                    className={`h-12 w-full rounded-lg bg-gradient-to-r ${preset.previewGradient} mb-2.5 flex items-end justify-between p-2 shadow-inner`}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-md text-white">
                      {preset.category}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-white text-indigo-700 flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300">
                    {lang === 'hi' ? preset.nameHi : preset.name}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {lang === 'hi' ? preset.descriptionHi : preset.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Custom Style Upload */}
      {activeTab === 'custom' && (
        <div className="p-4 flex flex-col gap-4 max-h-[580px] overflow-y-auto">
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-sm font-semibold text-white">{t.customStyleUpload}</h4>
            </div>
            <p className="text-xs text-zinc-400">
              Upload any artwork, anime still, or painting. Our local algorithm extracts the dominant colors and transforms video frames into your custom aesthetic.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Style Name (e.g. Vintage Poster)"
                value={customStyleName}
                onChange={(e) => setCustomStyleName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />

              <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingStyle ? 'Analyzing...' : 'Choose Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomImageUpload}
                  disabled={isUploadingStyle}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* User's Custom Presets List */}
          <div className="flex flex-col gap-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Saved Custom Styles ({customStyles.length})
            </h5>

            {customStyles.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 rounded-xl border border-dashed border-zinc-800">
                No custom styles saved yet. Upload an art image above to extract a unique palette!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {customStyles.map((cs) => {
                  const isSelected = currentPresetId === cs.id;
                  return (
                    <div
                      key={cs.id}
                      onClick={() => {
                        onSelectPreset({
                          id: cs.id,
                          name: cs.name,
                          nameHi: cs.name,
                          category: 'custom',
                          description: 'Custom palette transferred from uploaded artwork.',
                          descriptionHi: 'अपलोड की गई कला से ट्रांसफर किया गया कस्टम पैलेट।',
                          accentColor: cs.extractedColors[0] || '#8b5cf6',
                          previewGradient: 'from-purple-600 to-pink-500',
                          parameters: cs.parameters,
                          isCustom: true,
                          customImagePreview: cs.imageBlobUrl,
                        });
                      }}
                      className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500'
                          : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                          {cs.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCustomStyle(cs.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                          title="Delete custom style"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Color Palette Swatches */}
                      <div className="flex items-center gap-1">
                        {cs.extractedColors.map((hex, idx) => (
                          <div
                            key={idx}
                            className="flex-1 h-4 rounded-sm border border-black/40"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Fine-Tuning Parameter Sliders */}
      {activeTab === 'tuning' && (
        <div className="p-4 flex flex-col gap-4 max-h-[580px] overflow-y-auto text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="font-semibold text-zinc-200">{t.fineTuneFilters}</span>
            <button
              onClick={handleResetToPresetDefault}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.resetFilters}</span>
            </button>
          </div>

          {/* 1. Ink Outlines */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.edgeOutlines} (Sensitivity)</span>
              <span className="font-mono text-zinc-400">{currentParams.edgeThreshold}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentParams.edgeThreshold}
              onChange={(e) => updateParam('edgeThreshold', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 2. Line Thickness */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.lineThickness}</span>
              <span className="font-mono text-zinc-400">{currentParams.edgeThickness}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={currentParams.edgeThickness}
              onChange={(e) => updateParam('edgeThickness', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 3. Cel-Shading Bands */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.celBands}</span>
              <span className="font-mono text-zinc-400">{currentParams.colorBands} levels</span>
            </div>
            <input
              type="range"
              min="2"
              max="16"
              value={currentParams.colorBands}
              onChange={(e) => updateParam('colorBands', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 4. Kuwahara Paint Smoothing */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.smoothing}</span>
              <span className="font-mono text-zinc-400">{currentParams.smoothing}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={currentParams.smoothing}
              onChange={(e) => updateParam('smoothing', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 5. Saturation & Vibrance */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.saturation}</span>
              <span className="font-mono text-zinc-400">{currentParams.saturation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={currentParams.saturation}
              onChange={(e) => updateParam('saturation', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 6. Contrast & Punch */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.contrast}</span>
              <span className="font-mono text-zinc-400">{currentParams.contrast}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="180"
              value={currentParams.contrast}
              onChange={(e) => updateParam('contrast', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 7. Dreamy Anime Bloom Glow */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.bloomGlow}</span>
              <span className="font-mono text-zinc-400">{currentParams.bloomGlow}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentParams.bloomGlow}
              onChange={(e) => updateParam('bloomGlow', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 8. Comic Halftone Dots */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.halftoneDots}</span>
              <span className="font-mono text-zinc-400">{currentParams.halftoneDotSize}</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={currentParams.halftoneDotSize}
              onChange={(e) => updateParam('halftoneDotSize', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 9. Retro Pixel Block Size */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.pixelation}</span>
              <span className="font-mono text-zinc-400">{currentParams.pixelBlockSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              value={currentParams.pixelBlockSize}
              onChange={(e) => updateParam('pixelBlockSize', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 10. Paper / Canvas Grain */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.paperTexture}</span>
              <span className="font-mono text-zinc-400">{currentParams.paperGrain}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={currentParams.paperGrain}
              onChange={(e) => updateParam('paperGrain', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 11. Anime Frame Rate Throttle */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>{t.fpsThrottle}</span>
              <span className="font-mono text-indigo-400">
                {currentParams.fpsThrottle === 0 ? 'Smooth 60 FPS' : `${currentParams.fpsThrottle} FPS`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 12, 15, 24].map((fps) => (
                <button
                  key={fps}
                  onClick={() => updateParam('fpsThrottle', fps)}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono transition-colors ${
                    currentParams.fpsThrottle === fps
                      ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  {fps === 0 ? 'Native' : `${fps}fps`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
