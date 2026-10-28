/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BookOpen, Terminal, Smartphone, Key, CheckCircle2 } from 'lucide-react';

export const BuildGuideModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-cyan-400" />
            <h3 className="text-base font-semibold text-white">NXNative Android Setup & APK Build Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close Guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Step 1 */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal size={14} className="text-cyan-400" />
              1. Prerequisites & Environment Setup
            </h4>
            <p className="text-slate-300">
              Ensure you have the following packages installed:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono">
              <li>Android NDK r26c+ (tested with 26.2.11394342)</li>
              <li>CMake 3.22.1+ and Ninja</li>
              <li>Java Development Kit (JDK 17)</li>
              <li>Android SDK Platform API 34</li>
            </ul>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} className="text-cyan-400" />
              2. Compiling the APK with Gradle
            </h4>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[11px] space-y-1">
              <div># Build the standalone native C++ library</div>
              <div>cd android</div>
              <div>./gradlew assembleRelease</div>
            </div>
            <p className="text-slate-400">
              The compiled APK will be output at: <code className="text-slate-300 font-mono">android/app/build/outputs/apk/release/app-release-unsigned.apk</code>
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key size={14} className="text-cyan-400" />
              3. Sideloading & User Keys (prod.keys)
            </h4>
            <p className="text-slate-300 leading-relaxed">
              In accordance with security guidelines, NXNative requires users to supply their own legally obtained console keys:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 size={14} />
                <span>Private App Storage Sandbox</span>
              </div>
              <p className="text-[11px] text-slate-400">
                When you first launch the app, Android’s Storage Access Framework file picker opens. Select your <code>prod.keys</code>. The keys are streamed into the app’s internal storage sandbox (<code>/data/data/org.nxnative.android/files/prod.keys</code>) and never uploaded or logged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
