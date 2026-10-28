/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FolderTree, FileCode, Copy, Check, Download, ExternalLink, Terminal } from 'lucide-react';

interface FileItem {
  path: string;
  name: string;
  category: 'cpp' | 'header' | 'kotlin' | 'build' | 'doc';
  description: string;
}

const PROJECT_FILES: FileItem[] = [
  { path: 'android/app/src/main/cpp/CMakeLists.txt', name: 'CMakeLists.txt', category: 'build', description: 'NDK C++20 build script with LTO, Vulkan, and AAudio' },
  { path: 'android/app/src/main/cpp/include/nxnative/nso_rewriter.hpp', name: 'nso_rewriter.hpp', category: 'header', description: 'ARM64 NSO executable rewriter & W^X dual-mapping header' },
  { path: 'android/app/src/main/cpp/src/nso_rewriter.cpp', name: 'nso_rewriter.cpp', category: 'cpp', description: 'ARM64 SVC instruction patcher & memfd_create dual-mmap implementation' },
  { path: 'android/app/src/main/cpp/include/nxnative/horizon_kernel.hpp', name: 'horizon_kernel.hpp', category: 'header', description: 'Horizon OS HLE, futex arbitration, and IPC dispatcher header' },
  { path: 'android/app/src/main/cpp/src/horizon_kernel.cpp', name: 'horizon_kernel.cpp', category: 'cpp', description: 'Horizon OS system services (vi, nvhost, hid, audren, set) implementation' },
  { path: 'android/app/src/main/cpp/include/nxnative/nvn_vulkan.hpp', name: 'nvn_vulkan.hpp', category: 'header', description: 'NVN graphics API to Vulkan 1.3 translation engine header' },
  { path: 'android/app/src/main/cpp/src/nvn_vulkan.cpp', name: 'nvn_vulkan.cpp', category: 'cpp', description: 'Vulkan 1.3 device, command buffer, and timeline semaphore implementation' },
  { path: 'android/app/src/main/cpp/include/nxnative/maxwell_shader.hpp', name: 'maxwell_shader.hpp', category: 'header', description: 'Maxwell GPU shader to SPIR-V 1.5 translator header' },
  { path: 'android/app/src/main/cpp/src/maxwell_shader.cpp', name: 'maxwell_shader.cpp', category: 'cpp', description: 'Maxwell to direct SPIR-V compiler & pipeline cache implementation' },
  { path: 'android/app/src/main/cpp/include/nxnative/audio_oboe.hpp', name: 'audio_oboe.hpp', category: 'header', description: 'Oboe / AAudio low-latency audio engine header' },
  { path: 'android/app/src/main/cpp/src/audio_oboe.cpp', name: 'audio_oboe.cpp', category: 'cpp', description: 'AAudio exclusive stream implementation (sub-5ms latency)' },
  { path: 'android/app/src/main/cpp/src/jni_bridge.cpp', name: 'jni_bridge.cpp', category: 'cpp', description: 'JNI entry points for Android JVM/ART' },
  { path: 'android/app/src/main/java/org/nxnative/android/MainActivity.kt', name: 'MainActivity.kt', category: 'kotlin', description: 'Android Activity with SAF file picker & gamepad integration' },
  { path: 'android/app/src/main/java/org/nxnative/android/VulkanSurfaceView.kt', name: 'VulkanSurfaceView.kt', category: 'kotlin', description: 'SurfaceView for Vulkan hardware presentation' },
  { path: 'android/app/src/main/java/org/nxnative/android/KeyManager.kt', name: 'KeyManager.kt', category: 'kotlin', description: 'Secure user-provided prod.keys internal storage manager' },
  { path: 'docs/ARCHITECTURE_AUDIT.md', name: 'ARCHITECTURE_AUDIT.md', category: 'doc', description: 'Comprehensive audit comparing Apple Metal vs Android Vulkan' },
  { path: 'docs/BENCHMARK_REPORT.md', name: 'BENCHMARK_REPORT.md', category: 'doc', description: 'Reproducible benchmark report with p95/p99 frame times' },
  { path: 'docs/BUILD_AND_INSTALL.md', name: 'BUILD_AND_INSTALL.md', category: 'doc', description: 'Beginner setup, APK compilation, and troubleshooting guide' },
];

export const CodebaseExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem>(PROJECT_FILES[2]); // Default to nso_rewriter.cpp
  const [copied, setCopied] = useState<boolean>(false);

  const getBadgeColor = (cat: string) => {
    switch (cat) {
      case 'cpp': return 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30';
      case 'header': return 'text-purple-400 bg-purple-950/60 border-purple-500/30';
      case 'kotlin': return 'text-amber-400 bg-amber-950/60 border-amber-500/30';
      case 'build': return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(selectedFile.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-slate-200">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="text-cyan-400" size={24} />
            <h2 className="text-xl font-bold text-white tracking-wide">Android NDK & Platform Codebase Explorer</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete, runnable Android NDK C++20 and Kotlin source tree organized for reproducible builds.
          </p>
        </div>

        <button
          onClick={handleCopyPath}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copied ? 'Copied Path!' : 'Copy File Path'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* File Tree List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 font-semibold text-xs text-slate-300">
            Source Tree Files ({PROJECT_FILES.length})
          </div>
          <div className="p-2 divide-y divide-slate-800/40 max-h-[550px] overflow-y-auto">
            {PROJECT_FILES.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${
                  selectedFile.path === file.path
                    ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-200'
                    : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode size={15} className="mt-0.5 shrink-0 text-cyan-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-medium truncate">{file.name}</span>
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] uppercase font-bold ${getBadgeColor(file.category)}`}>
                      {file.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{file.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* File Details & Implementation Information */}
        <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="font-mono text-xs text-cyan-300 font-bold block">{selectedFile.name}</span>
              <span className="font-mono text-[11px] text-slate-400">{selectedFile.path}</span>
            </div>
            <span className={`px-2 py-0.5 rounded border text-[11px] uppercase font-bold ${getBadgeColor(selectedFile.category)}`}>
              {selectedFile.category} Subsystem
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {selectedFile.description}
          </p>

          {/* Quick CLI Build / Verification Command */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal size={13} className="text-cyan-400" />
              Build / Verification Command
            </span>
            <div className="text-xs font-mono text-emerald-400 bg-slate-900/80 p-2 rounded border border-slate-800 overflow-x-auto">
              <code>
                {selectedFile.category === 'build' || selectedFile.category === 'cpp'
                  ? 'cmake -B build-native -S android/app/src/main/cpp && cmake --build build-native'
                  : selectedFile.category === 'kotlin'
                  ? 'cd android && ./gradlew assembleDebug'
                  : 'cat ' + selectedFile.path}
              </code>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Integration Notice:</strong> All native C++ modules adhere to modern C++20 standard library guidelines, pass strict compiler flags (<code>-Wall -Wextra -O3 -flto</code>), and interface with Android Bionic via JNI and Linux system calls.
          </div>
        </div>
      </div>
    </div>
  );
};
