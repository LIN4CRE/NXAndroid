/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ThreeVisualizer } from './components/ThreeVisualizer.tsx';
import { ControlDock } from './components/ControlDock.tsx';
import { SubsystemInspector } from './components/SubsystemInspector.tsx';
import { BenchmarkSuiteView } from './components/BenchmarkSuiteView.tsx';
import { NsoRewriterPlayground } from './components/NsoRewriterPlayground.tsx';
import { ShaderPlayground } from './components/ShaderPlayground.tsx';
import { CodebaseExplorer } from './components/CodebaseExplorer.tsx';
import { ReadmeView } from './components/ReadmeView.tsx';
import { BuildGuideModal } from './components/BuildGuideModal.tsx';
import {
  Layers,
  Terminal,
  Zap,
  BarChart3,
  FolderTree,
  BookOpen,
  Cpu,
  ShieldCheck,
  CheckCircle,
  Github,
} from 'lucide-react';

type TabView = '3d-pipeline' | 'binary-rewriter' | 'shaders' | 'benchmarks' | 'codebase' | 'readme';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabView>('3d-pipeline');

  // 3D Scene Controls State
  const [explodedProgress, setExplodedProgress] = useState<number>(0.35);
  const [activeLayer, setActiveLayer] = useState<'all' | 'guest' | 'translation' | 'host'>('all');
  const [cameraPreset, setCameraPreset] = useState<'isometric' | 'top' | 'front' | 'side'>('isometric');
  const [showDataTraffic, setShowDataTraffic] = useState<boolean>(true);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string | null>(null);
  const [isBuildGuideOpen, setIsBuildGuideOpen] = useState<boolean>(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col select-none">
      {/* Top Universal App Navigation Bar */}
      <header className="h-13 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-cyan-500/20">
              NX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white">NXNative for Android</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Native Port v1.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation Items */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800" aria-label="Main Navigation">
          <button
            onClick={() => setActiveTab('3d-pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === '3d-pipeline'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers size={14} />
            <span>3D Architecture</span>
          </button>
          <button
            onClick={() => setActiveTab('binary-rewriter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'binary-rewriter'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Terminal size={14} />
            <span>ARM64 Rewriter</span>
          </button>
          <button
            onClick={() => setActiveTab('shaders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'shaders'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Zap size={14} />
            <span>Maxwell → SPIR-V</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'benchmarks'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={14} />
            <span>Benchmarks & Parity</span>
          </button>
          <button
            onClick={() => setActiveTab('codebase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'codebase'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FolderTree size={14} />
            <span>C++ NDK Sources</span>
          </button>
          <button
            onClick={() => setActiveTab('readme')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'readme'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Github size={14} />
            <span>GitHub / README</span>
          </button>
        </nav>

        {/* Action Button: Build Guide */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('readme')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Github size={14} />
            <span>GitHub Repo</span>
          </button>
          <button
            onClick={() => setIsBuildGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <BookOpen size={14} />
            <span>Build APK Guide</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 relative w-full h-[calc(100vh-52px)] overflow-hidden">
        {/* TAB 1: 3D PIPELINE VISUALIZER (Three.js full-bleed) */}
        {activeTab === '3d-pipeline' && (
          <div className="relative w-full h-full">
            {/* Three.js 3D Viewport mounted in stable ref */}
            <ThreeVisualizer
              explodedProgress={explodedProgress}
              activeLayer={activeLayer}
              onSelectSubsystem={(id) => setSelectedSubsystemId(id)}
              selectedSubsystemId={selectedSubsystemId}
              cameraPreset={cameraPreset}
              showDataTraffic={showDataTraffic}
            />

            {/* Viewport Overlay Minimal Spec Badge (Top-Left) */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              <div className="bg-slate-900/90 border border-slate-700/80 px-3.5 py-2.5 rounded-xl shadow-xl max-w-xs pointer-events-auto">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu size={14} className="text-cyan-400" />
                  <span className="text-xs font-bold text-white tracking-wide">Translation Rig (Three.js)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Interactive 3D model of the NXNative translation stack. Drag to orbit, click any component to inspect C++ code, or use the slider below to explode the layers.
                </p>
              </div>
            </div>

            {/* Subsystem Inspector Drawer */}
            <SubsystemInspector
              subsystemId={selectedSubsystemId}
              onClose={() => setSelectedSubsystemId(null)}
            />

            {/* Collapsible Bottom Control Dock (<=15% Viewport footprint) */}
            <ControlDock
              isCollapsed={isDockCollapsed}
              onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
              explodedProgress={explodedProgress}
              onExplodedChange={(val) => setExplodedProgress(val)}
              activeLayer={activeLayer}
              onLayerChange={(layer) => setActiveLayer(layer)}
              cameraPreset={cameraPreset}
              onCameraChange={(preset) => setCameraPreset(preset)}
              showDataTraffic={showDataTraffic}
              onToggleDataTraffic={() => setShowDataTraffic((prev) => !prev)}
            />
          </div>
        )}

        {/* TAB 2: BINARY REWRITER & MEMORY SANDBOX */}
        {activeTab === 'binary-rewriter' && (
          <div className="w-full h-full overflow-y-auto">
            <NsoRewriterPlayground />
          </div>
        )}

        {/* TAB 3: MAXWELL -> SPIR-V SHADER STUDIO */}
        {activeTab === 'shaders' && (
          <div className="w-full h-full overflow-y-auto">
            <ShaderPlayground />
          </div>
        )}

        {/* TAB 4: BENCHMARK SUITE & PERFORMANCE PARITY */}
        {activeTab === 'benchmarks' && (
          <div className="w-full h-full overflow-y-auto">
            <BenchmarkSuiteView />
          </div>
        )}

        {/* TAB 5: CODEBASE EXPLORER */}
        {activeTab === 'codebase' && (
          <div className="w-full h-full overflow-y-auto">
            <CodebaseExplorer />
          </div>
        )}

        {/* TAB 6: GITHUB BANNER & OFFICIAL README */}
        {activeTab === 'readme' && (
          <ReadmeView onOpenBuildGuide={() => setIsBuildGuideOpen(true)} />
        )}
      </main>

      {/* Build & Installation Guide Modal */}
      <BuildGuideModal
        isOpen={isBuildGuideOpen}
        onClose={() => setIsBuildGuideOpen(false)}
      />
    </div>
  );
}
