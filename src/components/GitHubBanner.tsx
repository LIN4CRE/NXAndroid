/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Github,
  Star,
  GitFork,
  Eye,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  Shield,
  Cpu,
  Layers,
} from 'lucide-react';

export const GitHubBanner: React.FC<{
  onOpenBuildGuide?: () => void;
}> = ({ onOpenBuildGuide }) => {
  const [copiedClone, setCopiedClone] = useState<boolean>(false);
  const [starred, setStarred] = useState<boolean>(false);
  const [starCount, setStarCount] = useState<number>(1428);

  const cloneCommand = 'git clone https://github.com/seedds/nxnative-android.git';

  const handleCopyClone = () => {
    navigator.clipboard.writeText(cloneCommand);
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  const handleToggleStar = () => {
    if (starred) {
      setStarCount((prev) => prev - 1);
      setStarred(false);
    } else {
      setStarCount((prev) => prev + 1);
      setStarred(true);
    }
  };

  return (
    <div className="w-full bg-slate-900/95 border-b border-slate-800 text-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-4 space-y-4">
        {/* Top Line: Repo Name & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Repo Title & Badges */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/80 shadow-inner">
              <Github size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-400">seedds</span>
                <span className="text-slate-600">/</span>
                <span className="text-sm font-bold text-white tracking-wide hover:underline cursor-pointer">
                  nxnative-android
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-slate-800 text-slate-300 border border-slate-700">
                  Public
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  v1.0.0 Native Release
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Native Nintendo Switch executable re-execution for Android ARM64 with Vulkan 1.3 & AAudio
              </p>
            </div>
          </div>

          {/* Action Buttons: Star, Fork, Watch, Clone */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Star Button */}
            <button
              onClick={handleToggleStar}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                starred
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800/90 border-slate-700 hover:bg-slate-750 text-slate-200'
              }`}
            >
              <Star size={14} className={starred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
              <span>{starred ? 'Starred' : 'Star'}</span>
              <span className="ml-1 pl-1.5 border-l border-slate-700 text-slate-400 font-mono text-[11px]">
                {starCount}
              </span>
            </button>

            {/* Fork Button */}
            <button
              onClick={() => alert('Fork repository: seedds/nxnative-android')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 shadow-sm transition-all cursor-pointer"
            >
              <GitFork size={14} className="text-slate-400" />
              <span>Fork</span>
              <span className="ml-1 pl-1.5 border-l border-slate-700 text-slate-400 font-mono text-[11px]">
                238
              </span>
            </button>

            {/* Clone Button */}
            <button
              onClick={handleCopyClone}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              {copiedClone ? <Check size={14} /> : <Terminal size={14} />}
              <span>{copiedClone ? 'Copied Clone URL!' : 'Clone Repo'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Line: Project Badges & Clone Quick-Command */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60 text-xs">
          {/* GitHub Style Shields & Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 text-blue-300 text-[11px] font-mono">
              <Shield size={11} />
              GPL-2.0
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/30 text-red-300 text-[11px] font-mono">
              <Cpu size={11} />
              Vulkan 1.3 Direct
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
              ARM64-v8a Bare Metal
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
              Direct SPIR-V 1.5 (2.08x)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-300 text-[11px] font-mono">
              AAudio &lt;5ms
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono">
              NDK r26c+
            </span>
          </div>

          {/* Quick Clone Bar */}
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 font-mono text-[11px] text-slate-400">
            <span className="text-cyan-400">$</span>
            <span className="text-slate-300">{cloneCommand}</span>
            <button
              onClick={handleCopyClone}
              className="text-slate-400 hover:text-white transition-colors ml-1 p-0.5"
              aria-label="Copy Git Clone Command"
            >
              {copiedClone ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
