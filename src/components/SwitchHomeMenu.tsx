/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GAMES_CATALOG, GameInfo } from '../games/types.ts';
import { sfx } from '../games/audio.ts';
import {
  Play,
  Gamepad2,
  Car,
  Rocket,
  Shield,
  Zap,
  Crosshair,
  Swords,
  Grid,
  Activity,
  Compass,
  Music,
  Trophy,
  Wifi,
  BatteryCharging,
  Clock,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  Gamepad2: <Gamepad2 size={28} />,
  Car: <Car size={28} />,
  Rocket: <Rocket size={28} />,
  Shield: <Shield size={28} />,
  Zap: <Zap size={28} />,
  Crosshair: <Crosshair size={28} />,
  Swords: <Swords size={28} />,
  Grid: <Grid size={28} />,
  Activity: <Activity size={28} />,
  Compass: <Compass size={28} />,
  Music: <Music size={28} />,
  Trophy: <Trophy size={28} />,
};

export const SwitchHomeMenu: React.FC<{
  onLaunchGame: (game: GameInfo) => void;
}> = ({ onLaunchGame }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const selectedGame = GAMES_CATALOG[selectedIdx];

  const handleSelect = (idx: number) => {
    sfx.click();
    setSelectedIdx(idx);
  };

  const handleStart = () => {
    sfx.boost();
    onLaunchGame(selectedGame);
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between overflow-y-auto select-none p-4 md:p-8">
      {/* Top Switch OS Status Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-rose-500 flex items-center justify-center font-bold text-white shadow-lg border-2 border-white/20">
            NX
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Player 1 (Android)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">NXNative Host OS 1.0</div>
          </div>
        </div>

        {/* System Indicators: Wi-Fi, Battery, Clock */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <BatteryCharging size={16} />
            <span>98%</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Wifi size={15} />
            <span>5G / Wi-Fi 6</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock size={14} />
            <span>12:45 PM</span>
          </div>
        </div>
      </div>

      {/* Main Game Carousel (12 Games) */}
      <div className="my-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Game Library</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                12 Playable Titles
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any game below to play with touch Joy-Con controls or keyboard on your phone.
            </p>
          </div>

          {/* Quick Carousel Arrow Nav */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSelect(Math.max(0, selectedIdx - 1))}
              disabled={selectedIdx === 0}
              className="p-2 rounded-xl bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-white cursor-pointer transition-colors"
              aria-label="Previous Game"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => handleSelect(Math.min(GAMES_CATALOG.length - 1, selectedIdx + 1))}
              disabled={selectedIdx === GAMES_CATALOG.length - 1}
              className="p-2 rounded-xl bg-slate-800 disabled:opacity-30 hover:bg-slate-700 text-white cursor-pointer transition-colors"
              aria-label="Next Game"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Horizontal Game Tiles Carousel */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-thin scrollbar-thumb-slate-700">
          {GAMES_CATALOG.map((g, idx) => {
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={g.id}
                onClick={() => handleSelect(idx)}
                className={`flex-shrink-0 w-36 h-48 md:w-44 md:h-56 rounded-2xl p-3 flex flex-col justify-between text-left transition-all duration-200 cursor-pointer relative overflow-hidden group shadow-xl ${
                  isSelected
                    ? 'ring-4 ring-cyan-400 scale-105 shadow-cyan-500/30'
                    : 'opacity-75 hover:opacity-100 hover:scale-102 border border-slate-800'
                } bg-gradient-to-br ${g.coverGradient}`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/20 uppercase tracking-wider">
                    {g.genre.split(' ')[0]}
                  </span>
                  <div className="text-white/80 group-hover:scale-110 transition-transform">
                    {ICON_MAP[g.iconName] || <Gamepad2 size={24} />}
                  </div>
                </div>

                {/* Bottom Title */}
                <div className="relative z-10 space-y-1">
                  <div className="text-xs md:text-sm font-extrabold text-white leading-tight drop-shadow-md">
                    {g.title}
                  </div>
                  <div className="text-[10px] text-white/80 truncate drop-shadow-sm">
                    {g.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Game Spotlight Details & Start Action Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-wrap md:flex-nowrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <h3 className="text-lg md:text-xl font-bold text-white tracking-wide">
                {selectedGame.title}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                {selectedGame.genre}
              </span>
              <span className="text-xs text-slate-400 font-mono">v{selectedGame.version}</span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              {selectedGame.description}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400 font-mono">
              <span className="text-cyan-400 font-semibold">Controls:</span>
              <span>{selectedGame.controlsSummary}</span>
            </div>
          </div>

          {/* Big Start Game Button */}
          <button
            onClick={handleStart}
            className="w-full md:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-extrabold text-sm md:text-base flex items-center justify-center gap-2.5 shadow-2xl shadow-rose-600/40 cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <Play size={20} className="fill-white" />
            <span>START GAME (A)</span>
          </button>
        </div>
      </div>

      {/* Bottom Switch OS Footer & Notice */}
      <div className="border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-cyan-400 shrink-0" />
          <span>
            12 native demo titles included ready to play. You can also import your own legally dumped Switch NSO binaries and keys in the Architecture Studio.
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>(A) Select / Play</span>
          <span>(B) Back</span>
          <span>(+) Options</span>
        </div>
      </div>
    </div>
  );
};
