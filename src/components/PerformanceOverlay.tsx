/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { PerformanceMetrics } from '../games/performance.ts';
import {
  Activity,
  Cpu,
  Layers,
  HardDrive,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Zap,
  Gauge,
  Move,
} from 'lucide-react';

interface PerformanceOverlayProps {
  stats: PerformanceMetrics;
  isVisible: boolean;
  onClose: () => void;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  stats,
  isVisible,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 16, y: 64 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 16,
    startY: 64,
  });

  // Clamp position within window bounds
  const updatePosition = (newX: number, newY: number) => {
    const maxX = Math.max(16, window.innerWidth - (isExpanded ? 320 : 200));
    const maxY = Math.max(16, window.innerHeight - (isExpanded ? 340 : 80));
    setPosition({
      x: Math.min(Math.max(8, newX), maxX),
      y: Math.min(Math.max(50, newY), maxY),
    });
  };

  // Dragging event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header handle
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    updatePosition(dragStartRef.current.startX + dx, dragStartRef.current.startY + dy);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  if (!isVisible) return null;

  // FPS color status
  const fpsColor =
    stats.fps >= 55
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60'
      : stats.fps >= 30
      ? 'text-amber-400 border-amber-500/40 bg-amber-950/60'
      : 'text-rose-400 border-rose-500/40 bg-rose-950/60';

  const fpsTextGradient =
    stats.fps >= 55
      ? 'from-emerald-400 to-teal-300'
      : stats.fps >= 30
      ? 'from-amber-400 to-yellow-300'
      : 'from-rose-500 to-red-400';

  // Sparkline points generator
  const history = stats.fpsHistory || [];
  const maxH = 28;
  const svgWidth = 140;
  const step = history.length > 1 ? svgWidth / (history.length - 1) : svgWidth;
  const points = history
    .map((val, idx) => {
      // Map 0-60+ fps to maxH-0 y coordinate
      const normalized = Math.min(1, Math.max(0, val / 65));
      const y = maxH - normalized * (maxH - 4) - 2;
      return `${(idx * step).toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      className={`fixed z-40 select-none shadow-2xl backdrop-blur-md rounded-2xl border transition-all duration-150 ${
        isDragging ? 'opacity-90 ring-2 ring-cyan-500/50 cursor-grabbing' : 'opacity-95'
      } bg-slate-950/92 border-slate-700/80 text-white font-sans ${
        isExpanded ? 'w-[310px] sm:w-[330px]' : 'w-auto'
      }`}
    >
      {/* Draggable Header */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 cursor-grab active:cursor-grabbing bg-slate-900/60 rounded-t-2xl"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
            <Activity size={12} className="animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wider text-slate-200 uppercase font-mono">
            NX Telemetry
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 font-mono border border-cyan-500/20">
            VK/NVN
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Overlay' : 'Expand Overlay'}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={onClose}
            title="Close Performance HUD (Toggle via Top Bar or 'P')"
            className="p-1 rounded-lg hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Compact Mini Mode */}
      {!isExpanded && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex items-center gap-3 px-3 py-2 cursor-grab text-xs font-mono"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <span className={`px-2 py-0.5 rounded-md border font-extrabold ${fpsColor}`}>
              {stats.fps} FPS
            </span>
            <span className="text-slate-400 text-[11px]">{stats.frameTimeMs}ms</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-1 text-cyan-300 text-[11px]">
            <Layers size={12} />
            <span>{stats.drawCalls} calls</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-1 text-slate-300 text-[11px]">
            <HardDrive size={12} />
            <span>{stats.estimatedVramMB} MB</span>
          </div>
        </div>
      )}

      {/* Expanded Detailed Dashboard */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Main Frame Rate Row with Sparkline */}
          <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                Frame Rate & Pacing
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-2xl font-black font-mono tracking-tight bg-gradient-to-r ${fpsTextGradient} bg-clip-text text-transparent`}>
                  {stats.fps}
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">FPS</span>
                <span className="text-[11px] font-mono text-slate-400 ml-1">
                  ({stats.frameTimeMs} ms)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                <span>Avg: <strong className="text-white">{stats.avgFps}</strong></span>
                <span>•</span>
                <span>1% Low: <strong className="text-amber-300">{stats.onePercentLowFps}</strong></span>
                <span>•</span>
                <span>Min: <strong className="text-rose-400">{stats.minFps}</strong></span>
              </div>
            </div>

            {/* Sparkline Graph */}
            <div className="w-[120px] sm:w-[130px] flex flex-col items-end">
              <span className="text-[9px] font-mono text-slate-500 mb-0.5">Rolling 40 Frames</span>
              <svg
                width="120"
                height={maxH}
                className="overflow-visible bg-slate-950/60 rounded border border-slate-800/80 p-0.5"
              >
                <linearGradient id="fpsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.1" />
                </linearGradient>
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
              </svg>
            </div>
          </div>

          {/* GPU Draw Calls & Primitives Grid */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1.5">
              <Layers size={11} />
              <span>GPU Pipeline & Draw Calls</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Draw Calls:</span>
                <span className="font-bold text-cyan-300 text-sm">{stats.drawCalls}</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Triangles:</span>
                <span className="font-bold text-slate-200 text-sm">
                  {stats.triangles > 999
                    ? `${(stats.triangles / 1000).toFixed(1)}k`
                    : stats.triangles}
                </span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Geometries:</span>
                <span className="font-bold text-slate-300">{stats.geometries}</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Textures:</span>
                <span className="font-bold text-slate-300">{stats.textures}</span>
              </div>
            </div>
          </div>

          {/* Memory Usage Breakdown */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1.5">
              <HardDrive size={11} />
              <span>Memory Allocation</span>
            </div>
            <div className="space-y-1.5 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">JS / App Heap:</span>
                <div className="flex items-center gap-1 font-bold text-slate-200">
                  <span className="text-emerald-400">{stats.jsHeapUsedMB} MB</span>
                  <span className="text-slate-500 text-[10px]">/ {stats.jsHeapTotalMB} MB</span>
                </div>
              </div>
              {/* Heap Progress Bar */}
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(5, (stats.jsHeapUsedMB / Math.max(1, stats.jsHeapTotalMB)) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400 text-[11px]">GPU VRAM (Est):</span>
                <span className="font-bold text-cyan-300">{stats.estimatedVramMB} MB</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Horizon OS Guest:</span>
                <span className="font-bold text-amber-300">{stats.guestHeapMB} MB</span>
              </div>
            </div>
          </div>

          {/* Backend Engine Status Bar */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900/90 rounded-lg border border-slate-800/80 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Zap size={10} className="text-amber-400" />
              <span>Tegra X1 Maxwell</span>
            </span>
            <span className="text-cyan-400 font-bold">Vulkan 1.3 Native</span>
          </div>
        </div>
      )}
    </div>
  );
};
