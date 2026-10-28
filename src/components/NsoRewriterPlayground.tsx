/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { rewriteArm64Instruction, parseNsoHeader, Arm64RewriteResult, NsoHeader } from '../logic/nso_parser.ts';
import { Terminal, Shield, Play, RotateCcw, CheckCircle2, AlertTriangle, FileCode2, Cpu } from 'lucide-react';

const SAMPLE_INSTRUCTIONS = [
  { label: 'svc #0x18 (svcWaitSynchronization)', hex: '0xd4000301' },
  { label: 'svc #0x1a (svcArbitrateAddress)', hex: '0xd4000341' },
  { label: 'svc #0x21 (svcSendSyncRequest)', hex: '0xd4000421' },
  { label: 'mrs x0, tpidrro_el0 (Guest TLS Read)', hex: '0xd53bd060' },
  { label: 'mrs x1, tpidrro_el0 (Guest TLS Read)', hex: '0xd53bd061' },
  { label: 'add x0, x1, x2 (Standard Native ALU)', hex: '0x8b020020' },
  { label: 'ldr x3, [x1, #16] (Native Memory Read)', hex: '0xf9400823' },
];

export const NsoRewriterPlayground: React.FC = () => {
  const [selectedHex, setSelectedHex] = useState<string>('0xd4000301');
  const [customHex, setCustomHex] = useState<string>('0xd4000301');
  const [rewriteHistory, setRewriteHistory] = useState<Arm64RewriteResult[]>(() => {
    return [rewriteArm64Instruction(0xd4000301)];
  });

  const handleTestInstruction = (hexStr: string) => {
    try {
      const parsedNumber = parseInt(hexStr.trim(), 16);
      if (isNaN(parsedNumber)) return;
      const res = rewriteArm64Instruction(parsedNumber);
      setRewriteHistory((prev) => [res, ...prev.slice(0, 7)]);
    } catch (e) {
      // Ignore invalid hex
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-slate-200">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="text-cyan-400" size={24} />
            <h2 className="text-xl font-bold text-white tracking-wide">ARM64 Binary Rewriter & NSO Loader Studio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Test and inspect the live ARM64 instruction rewriting pipeline that enables Nintendo Switch game code to execute natively on Android.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs text-emerald-300">
          <Shield size={14} className="text-emerald-400" />
          <span>Android W^X Dual-Mmap Compliant</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Instruction Testing Sandbox */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center justify-between">
              <span>ARM64 Instruction Sandbox</span>
              <span className="text-[11px] font-mono text-cyan-400">Arch: AArch64 / ARMv8-A</span>
            </h3>

            {/* Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Preset Opcode Samples
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_INSTRUCTIONS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedHex(sample.hex);
                      setCustomHex(sample.hex);
                      handleTestInstruction(sample.hex);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      selectedHex === sample.hex
                        ? 'bg-cyan-600 text-white font-semibold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1">
                <label className="text-[11px] text-slate-400 mb-1 block">Hexadecimal 32-bit Opcode (0x...)</label>
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    setSelectedHex(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. 0xd4000301"
                />
              </div>
              <button
                onClick={() => handleTestInstruction(customHex)}
                className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Play size={14} />
                <span>Rewrite Opcode</span>
              </button>
            </div>
          </div>

          {/* Rewrite Results History */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-wide">Instruction Rewrite Inspection Log</h3>
            <div className="space-y-2.5">
              {rewriteHistory.map((item, idx) => {
                const isPatch = item.action !== 'PASSTHROUGH';
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-lg border font-mono text-xs space-y-1.5 ${
                      isPatch
                        ? 'bg-cyan-950/40 border-cyan-500/40'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                          item.action === 'PATCH_SVC'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : item.action === 'PATCH_TLS'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {item.action}
                        </span>
                        <span className="text-white font-semibold">{item.mnemonic}</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        0x{item.originalInstruction.toString(16).padStart(8, '0')} → 0x{item.rewrittenInstruction.toString(16).padStart(8, '0')}
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Android Memory Architecture & W^X Enforcement */}
        <div className="space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <Cpu size={16} className="text-cyan-400" />
              Android Dual-Mmap W^X Strategy
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Modern Android kernels (API 30+) enforce <strong className="text-cyan-300">W^X (Write XOR Execute)</strong>. A memory page cannot be simultaneously writable and executable.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[11px] font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  <span>Naive Approach (Fails on Android)</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Calling <code>mprotect(PROT_READ|PROT_WRITE|PROT_EXEC)</code> is blocked by Android SELinux policies, and toggling back and forth causes massive CPU pipeline stalls.
                </p>
              </div>

              <div className="p-3 bg-emerald-950/40 rounded-lg border border-emerald-500/30">
                <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>NXNative Dual-Mapping Solution</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  We allocate anonymous physical memory via <code>memfd_create()</code> and establish two distinct virtual memory mappings to the same backing frames:
                </p>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-400 font-mono">
                  <li>• <strong>RW Alias:</strong> <code>PROT_READ | PROT_WRITE</code> (for patcher)</li>
                  <li>• <strong>RX Alias:</strong> <code>PROT_READ | PROT_EXEC</code> (for CPU core)</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Cache Coherency:</span> After patching via the RW mapping, <code>__builtin___clear_cache()</code> flushes the L1 instruction cache for the RX range.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
