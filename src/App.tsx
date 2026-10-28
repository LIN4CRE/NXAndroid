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
import { SwitchHomeMenu } from './components/SwitchHomeMenu.tsx';
import { GameEngine } from './games/GameEngine.tsx';
import { GameInfo } from './games/types.ts';
import {
  Gamepad2,
  Layers,
  Terminal,
  Zap,
  BarChart3,
  FolderTree,
  BookOpen,
  Cpu,
  Github,
  FolderOpen,
  X,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';

type TabView = 'games' | '3d-pipeline' | 'binary-rewriter' | 'shaders' | 'benchmarks' | 'codebase' | 'readme';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabView>('games');
  const [activeGame, setActiveGame] = useState<GameInfo | null>(null);

  // 3D Scene Controls State
  const [explodedProgress, setExplodedProgress] = useState<number>(0.35);
  const [activeLayer, setActiveLayer] = useState<'all' | 'guest' | 'translation' | 'host'>('all');
  const [cameraPreset, setCameraPreset] = useState<'isometric' | 'top' | 'front' | 'side'>('isometric');
  const [showDataTraffic, setShowDataTraffic] = useState<boolean>(true);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [selectedSubsystemId, setSelectedSubsystemId] = useState<string | null>(null);
  const [isBuildGuideOpen, setIsBuildGuideOpen] = useState<boolean>(false);
  const [isSafModalOpen, setIsSafModalOpen] = useState<boolean>(false);

  // If a game is actively playing, render the full immersive 3D GameEngine + Joy-Con controls
  if (activeGame) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-black select-none">
        <GameEngine
          game={activeGame}
          onExit={() => setActiveGame(null)}
        />
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 flex flex-col select-none">
      {/* Top Universal App Navigation Bar */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-3 md:px-5 flex items-center justify-between z-40 shrink-0 gap-2">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-rose-500 flex items-center justify-center font-black text-white text-xs shadow-md shadow-cyan-500/20">
              NX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  <span>NXNative</span>
                  <span className="text-cyan-400 font-normal">Android</span>
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  12 Games Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Items (Horizontal scrollable on mobile) */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-[55vw] md:max-w-none scrollbar-none" aria-label="Main Navigation">
          <button
            onClick={() => setActiveTab('games')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'games'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/25 ring-1 ring-white/20'
                : 'text-amber-300/90 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gamepad2 size={15} className={activeTab === 'games' ? 'animate-bounce' : ''} />
            <span>Play 12 Games</span>
          </button>

          <button
            onClick={() => setActiveTab('3d-pipeline')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              activeTab === '3d-pipeline'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers size={14} />
            <span>3D Pipeline</span>
          </button>

          <button
            onClick={() => setActiveTab('binary-rewriter')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              activeTab === 'binary-rewriter'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Terminal size={14} />
            <span className="hidden sm:inline">ARM64</span> Rewriter
          </button>

          <button
            onClick={() => setActiveTab('shaders')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              activeTab === 'benchmarks'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={14} />
            <span>Benchmarks</span>
          </button>

          <button
            onClick={() => setActiveTab('codebase')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              activeTab === 'codebase'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FolderTree size={14} />
            <span className="hidden md:inline">C++ NDK</span> Sources
          </button>

          <button
            onClick={() => setActiveTab('readme')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
              activeTab === 'readme'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Github size={14} />
            <span>README</span>
          </button>
        </nav>

        {/* Action Buttons: SAF Loader & Build Guide */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSafModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Load your dumped Switch ROMs or Keys via Android Storage Access Framework"
          >
            <FolderOpen size={14} />
            <span className="hidden md:inline">Load Dumped ROM</span>
          </button>

          <button
            onClick={() => setIsBuildGuideOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Build APK</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 relative w-full h-[calc(100vh-56px)] overflow-hidden">
        {/* TAB 0: SWITCH HOME MENU (12 PLAYABLE GAMES) */}
        {activeTab === 'games' && (
          <SwitchHomeMenu onLaunchGame={(game) => setActiveGame(game)} />
        )}

        {/* TAB 1: 3D PIPELINE VISUALIZER (Three.js full-bleed) */}
        {activeTab === '3d-pipeline' && (
          <div className="relative w-full h-full">
            <ThreeVisualizer
              explodedProgress={explodedProgress}
              activeLayer={activeLayer}
              onSelectSubsystem={(id) => setSelectedSubsystemId(id)}
              selectedSubsystemId={selectedSubsystemId}
              cameraPreset={cameraPreset}
              showDataTraffic={showDataTraffic}
            />

            {/* Viewport Overlay Minimal Spec Badge */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              <div className="bg-slate-900/90 border border-slate-700/80 px-3.5 py-2.5 rounded-xl shadow-xl max-w-xs pointer-events-auto">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu size={14} className="text-cyan-400" />
                  <span className="text-xs font-bold text-white tracking-wide">Translation Rig (Three.js)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Interactive 3D model of the NXNative translation stack. Drag to orbit, click any component to inspect C++ code, or switch to the &quot;Play 12 Games&quot; tab to test live gameplay.
                </p>
              </div>
            </div>

            {/* Subsystem Inspector Drawer */}
            <SubsystemInspector
              subsystemId={selectedSubsystemId}
              onClose={() => setSelectedSubsystemId(null)}
            />

            {/* Collapsible Bottom Control Dock */}
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

      {/* SAF Storage Access Framework ROM Loader Modal */}
      {isSafModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <FolderOpen size={20} />
                <h3 className="font-bold text-base text-white">Android Storage Access Framework (SAF)</h3>
              </div>
              <button
                onClick={() => setIsSafModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <Smartphone size={24} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white mb-0.5">Where are the commercial games?</div>
                  <p className="text-slate-400 text-[11px]">
                    Under copyright and DMCA law, commercial Nintendo Switch ROMs (such as <em>The Legend of Zelda: Breath of the Wild</em> or <em>Super Mario Odyssey</em>) cannot be legally bundled or distributed with any open-source software.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white mb-0.5">12 Native Playable Games Included</div>
                  <p className="text-emerald-200/80 text-[11px]">
                    To give you an immediate, responsive gaming experience on your Android phone, NXNative comes pre-configured with <strong>12 fully playable games</strong> (3D platforming, racing, rail shooters, dungeon trials, arena combat, and rhythm) running natively with Joy-Con touch controls!
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle size={24} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white mb-0.5">Loading Your Own Dumped Switch NSO/NSP Binaries</div>
                  <p className="text-amber-200/80 text-[11px]">
                    On an Android phone running the compiled APK, tapping <code>ACTION_OPEN_DOCUMENT</code> lets you select your legally dumped <code>main.nso</code> and <code>prod.keys</code> from your device&apos;s SD card or Download folder.
                  </p>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 font-mono text-[11px] space-y-1">
                <div className="text-slate-400">// Native SAF JNI Hook in MainActivity.kt:</div>
                <div className="text-cyan-400">val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply &#123;</div>
                <div className="text-cyan-300 pl-4">addCategory(Intent.CATEGORY_OPENABLE)</div>
                <div className="text-cyan-300 pl-4">type = &quot;*/*&quot;</div>
                <div className="text-cyan-400">&#125;</div>
                <div className="text-cyan-400">startActivityForResult(intent, REQUEST_CODE_NSO)</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsSafModalOpen(false);
                  setActiveTab('games');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold text-xs shadow-lg transition-colors cursor-pointer"
              >
                Play Included 12 Games Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Build & Installation Guide Modal */}
      <BuildGuideModal
        isOpen={isBuildGuideOpen}
        onClose={() => setIsBuildGuideOpen(false)}
      />
    </div>
  );
}
