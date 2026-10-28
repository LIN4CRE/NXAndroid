/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, Eye, Camera, Activity, ChevronDown, ChevronUp, Cpu, ShieldCheck } from 'lucide-react';

export interface ControlDockProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  explodedProgress: number;
  onExplodedChange: (val: number) => void;
  activeLayer: 'all' | 'guest' | 'translation' | 'host';
  onLayerChange: (layer: 'all' | 'guest' | 'translation' | 'host') => void;
  cameraPreset: 'isometric' | 'top' | 'front' | 'side';
  onCameraChange: (preset: 'isometric' | 'top' | 'front' | 'side') => void;
  showDataTraffic: boolean;
  onToggleDataTraffic: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  isCollapsed,
  onToggleCollapse,
  explodedProgress,
  onExplodedChange,
  activeLayer,
  onLayerChange,
  cameraPreset,
  onCameraChange,
  showDataTraffic,
  onToggleDataTraffic,
}) => {
  return (
    <div
      className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 ease-out ${
        isCollapsed ? 'translate-y-[calc(100%-34px)]' : 'translate-y-0'
      }`}
      style={{
        maxWidth: 'min(940px, 94vw)',
        width: 'max-content',
      }}
    >
      {/* Collapse / Expand Toggle Tab */}
      <div className="flex justify-center mb-1">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700/80 rounded-t-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
          aria-label={isCollapsed ? 'Show 3D Controls' : 'Hide Controls (Zen Mode)'}
        >
          {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{isCollapsed ? '3D Controls Dock' : 'Cinema Mode'}</span>
        </button>
      </div>

      {/* Main Glassmorphic Dock Container (using solid/rgba surfaces instead of backdrop-filter over WebGL) */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Exploded View Slider */}
          <div className="flex items-center gap-2.5 min-w-[200px] flex-1">
            <Layers size={15} className="text-cyan-400 shrink-0" />
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
                <span>Architecture Stack</span>
                <span className="text-cyan-300 font-mono">{Math.round(explodedProgress * 100)}% Exploded</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodedProgress}
                onChange={(e) => onExplodedChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                aria-label="3D Exploded Separation Slider"
              />
            </div>
          </div>

          {/* Subsystem Layer Selector */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => onLayerChange('all')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeLayer === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Layers
            </button>
            <button
              onClick={() => onLayerChange('guest')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeLayer === 'guest' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Guest (Switch)
            </button>
            <button
              onClick={() => onLayerChange('translation')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeLayer === 'translation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              NXNative NDK
            </button>
            <button
              onClick={() => onLayerChange('host')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeLayer === 'host' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Host (Vulkan)
            </button>
          </div>

          {/* Camera View Presets */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700/50">
            <Camera size={13} className="text-slate-400 ml-1.5 mr-0.5" />
            {(['isometric', 'top', 'front', 'side'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => onCameraChange(preset)}
                className={`px-2 py-1 text-xs rounded capitalize transition-colors ${
                  cameraPreset === preset ? 'bg-slate-700 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Data Traffic Simulation Toggle */}
          <button
            onClick={onToggleDataTraffic}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showDataTraffic
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Toggle Data Traffic Stream"
          >
            <Activity size={13} className={showDataTraffic ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Bus Traffic</span>
          </button>
        </div>
      </div>
    </div>
  );
};
