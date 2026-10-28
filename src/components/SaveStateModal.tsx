import React, { useState, useEffect, useRef } from 'react';
import {
  SaveStateData,
  listSavedSlots,
  saveStateToSlot,
  deleteStateSlot,
  exportStateToFile,
  importStateFromFile,
  formatPlaytime,
  ANDROID_SAF_DEFAULT_PATH,
  EngineSnapshot,
  createSaveState,
} from '../games/saveState.ts';
import {
  Save,
  Download,
  Upload,
  Trash2,
  X,
  Play,
  Cpu,
  HardDrive,
  Clock,
  Trophy,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SaveStateModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  gameTitle: string;
  currentEngineState: () => EngineSnapshot;
  onApplyState: (state: SaveStateData) => void;
}

export const SaveStateModal: React.FC<SaveStateModalProps> = ({
  isOpen,
  onClose,
  gameId,
  gameTitle,
  currentEngineState,
  onApplyState,
}) => {
  const [slots, setSlots] = useState<Record<number, SaveStateData>>({});
  const [activeTab, setActiveTab] = useState<'slots' | 'saf' | 'registers'>('slots');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedSlotForInspect, setSelectedSlotForInspect] = useState<number>(0);
  const [importedState, setImportedState] = useState<SaveStateData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh slots list
  const refreshSlots = () => {
    const list = listSavedSlots(gameId);
    setSlots(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
      setImportedState(null);
      setImportError(null);
    }
  }, [isOpen, gameId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleSaveToSlot = (slotNumber: number) => {
    try {
      const snapshot = currentEngineState();
      const newState = createSaveState(gameId, gameTitle, slotNumber, snapshot);
      const success = saveStateToSlot(newState);
      if (success) {
        refreshSlots();
        showToast(`Saved progress to Slot ${slotNumber === 0 ? '0 (Quick Save)' : slotNumber}!`);
      } else {
        showToast('Storage write failed. Please check permissions.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error serializing current game state.');
    }
  };

  const handleLoadSlot = (state: SaveStateData) => {
    onApplyState(state);
    showToast(`Restored game state from Slot ${state.slot === 0 ? '0 (Quick Save)' : state.slot}!`);
    onClose();
  };

  const handleDeleteSlot = (slotNumber: number) => {
    deleteStateSlot(gameId, slotNumber);
    refreshSlots();
    showToast(`Slot ${slotNumber} removed.`);
  };

  const handleExportSlot = (state: SaveStateData) => {
    exportStateToFile(state);
    showToast(`Exported .nxstate memory dump for Slot ${state.slot}.`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const parsed = await importStateFromFile(file);
      setImportedState(parsed);
      showToast(`Loaded memory dump: ${file.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse memory dump file';
      setImportError(msg);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyImported = () => {
    if (!importedState) return;
    onApplyState(importedState);
    showToast('Imported memory dump applied to live engine!');
    onClose();
  };

  if (!isOpen) return null;

  const currentInspectedState = slots[selectedSlotForInspect] || Object.values(slots)[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-xs font-bold rounded-xl shadow-2xl border border-cyan-400/50 animate-bounce">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Save State & Memory Dump
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  ARM64 / SAF
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Game:</span>
                <span className="text-white font-medium">{gameTitle}</span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] font-mono text-slate-500 truncate max-w-[240px] sm:max-w-none">
                  {ANDROID_SAF_DEFAULT_PATH}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('slots')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'slots'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save size={14} />
            <span>Memory Slots (0-4)</span>
          </button>
          <button
            onClick={() => setActiveTab('saf')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'saf'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen size={14} />
            <span>Android File I/O (.nxstate)</span>
          </button>
          <button
            onClick={() => setActiveTab('registers')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'registers'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu size={14} />
            <span>ARM64 CPU Registers</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: SLOTS */}
          {activeTab === 'slots' && (
            <div className="space-y-4">
              {/* Quick Save Action Strip */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-300">
                    Live Engine Ready: Click Quick Save or select a memory slot below.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveToSlot(0)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Quick Save (Slot 0)</span>
                  </button>
                  {slots[0] && (
                    <button
                      onClick={() => handleLoadSlot(slots[0])}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer"
                    >
                      <Play size={14} />
                      <span>Quick Load</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Slot Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[0, 1, 2, 3, 4].map((slotNum) => {
                  const data = slots[slotNum];
                  const isQuickSave = slotNum === 0;

                  return (
                    <div
                      key={slotNum}
                      className={`relative rounded-xl border p-4 transition-all ${
                        data
                          ? 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                          : 'bg-slate-900/40 border-slate-800/80 border-dashed'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                              isQuickSave
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isQuickSave ? 'Slot 0 (Quick)' : `Slot ${slotNum}`}
                          </span>
                          {data && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {data.dateString}
                            </span>
                          )}
                        </div>

                        {data && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleExportSlot(data)}
                              title="Export .nxstate to Android filesystem"
                              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slotNum)}
                              title="Delete snapshot"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Slot Body */}
                      {data ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                            <div>
                              <span className="text-slate-500 block">Score</span>
                              <span className="font-bold font-mono text-amber-400">
                                {data.engineState.score} PTS
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Time</span>
                              <span className="font-bold font-mono text-slate-300">
                                {formatPlaytime(data.engineState.playtimeSeconds)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Position (X, Z)</span>
                              <span className="font-bold font-mono text-cyan-400 truncate block">
                                {data.engineState.playerPos[0].toFixed(1)},{' '}
                                {data.engineState.playerPos[2].toFixed(1)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                            <span>ARM64 PC: {data.registers.pc}</span>
                            <span>Heap CRC: {data.memoryMap.heapSegment.checksumCRC32}</span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleLoadSlot(data)}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                            >
                              <Play size={14} />
                              <span>Load State</span>
                            </button>
                            <button
                              onClick={() => handleSaveToSlot(slotNum)}
                              className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Save size={13} />
                              <span>Overwrite</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-5 text-center space-y-2">
                          <p className="text-xs text-slate-500">Empty State Slot</p>
                          <button
                            onClick={() => handleSaveToSlot(slotNum)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Save size={13} />
                            <span>Save Current State</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID SAF FILE I/O */}
          {activeTab === 'saf' && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <FolderOpen size={18} />
                  <span>Android Storage Access Framework (SAF) Interoperability</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Export complete memory snapshots directly to your device filesystem or import externally dumped 
                  <code className="text-cyan-300 font-mono mx-1">.nxstate</code> memory dumps. 
                  Files comply with the Horizon OS memory mapping standard and include full guest ARM64 register state.
                </p>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>SAF Directory: {ANDROID_SAF_DEFAULT_PATH}</span>
                  <span className="text-emerald-400 text-[10px]">READ/WRITE GRANTED</span>
                </div>
              </div>

              {/* Import & Export Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                      <Download size={16} className="text-cyan-400" />
                      <span>Export Memory Dump</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Generate an instant <code className="text-slate-300">.nxstate</code> binary dump of the current live game execution frame.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const snapshot = currentEngineState();
                      const dump = createSaveState(gameId, gameTitle, 0, snapshot);
                      exportStateToFile(dump);
                      showToast('Generated and downloaded .nxstate memory dump file.');
                    }}
                    className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Download Live Memory Dump (.nxstate)</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                      <Upload size={16} className="text-emerald-400" />
                      <span>Import Memory Dump</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select an existing <code className="text-slate-300">.nxstate</code> file from local Android storage or SD card.
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".nxstate,.json,.bin"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 bg-slate-700 hover:bg-slate-600 active:scale-98 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 border border-slate-600 shadow transition-all cursor-pointer"
                    >
                      <Upload size={15} />
                      <span>Choose .nxstate File</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Imported State Verification Banner */}
              {importedState && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 size={16} />
                      <span>Valid Memory Dump Parsed</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300">
                      Magic: {importedState.magic} (Schema v{importedState.version})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Game</span>
                      <span className="font-semibold text-white">{importedState.gameTitle}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Score</span>
                      <span className="font-bold text-amber-400">{importedState.engineState.score}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Playtime</span>
                      <span className="font-mono text-slate-300">
                        {formatPlaytime(importedState.engineState.playtimeSeconds)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Guest PC</span>
                      <span className="font-mono text-cyan-400">{importedState.registers.pc}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyImported}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Play size={15} />
                    <span>Restore Dump into Active GameEngine</span>
                  </button>
                </div>
              )}

              {/* Error Banner */}
              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-3 text-xs text-rose-300">
                  <AlertCircle size={18} className="shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REGISTERS & VIRTUAL MEMORY */}
          {activeTab === 'registers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Viewing Horizon ARM64 Register Context for:
                </span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSlotForInspect(s)}
                      disabled={!slots[s]}
                      className={`px-2 py-1 text-xs rounded font-mono cursor-pointer ${
                        selectedSlotForInspect === s
                          ? 'bg-cyan-600 text-white'
                          : slots[s]
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-900/50 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      Slot {s}
                    </button>
                  ))}
                </div>
              </div>

              {currentInspectedState ? (
                <div className="space-y-3">
                  {/* System Registers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">PC (Program Counter)</span>
                      <span className="text-cyan-400 font-bold">{currentInspectedState.registers.pc}</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">SP (Stack Pointer)</span>
                      <span className="text-emerald-400 font-bold">{currentInspectedState.registers.sp}</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">TPIDRRO_EL0 (TLS)</span>
                      <span className="text-purple-400 font-bold">{currentInspectedState.registers.tpidrro_el0}</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">PSTATE (NZCV)</span>
                      <span className="text-amber-400 font-bold">{currentInspectedState.registers.pstate}</span>
                    </div>
                  </div>

                  {/* General Purpose Registers X0 - X30 */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">
                      General-Purpose Registers (X0 - X30)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 font-mono text-[11px]">
                      {currentInspectedState.registers.x.map((val, idx) => (
                        <div key={idx} className="flex justify-between bg-slate-900/80 px-2 py-1 rounded">
                          <span className="text-slate-500">X{idx.toString().padStart(2, '0')}:</span>
                          <span className="text-slate-300 truncate ml-1">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Horizon Memory Segments */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">
                      Horizon OS Virtual Memory Layout
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                      <div className="bg-slate-900/80 p-2 rounded">
                        <span className="text-slate-500 block">.text (Code)</span>
                        <span className="text-cyan-400">{currentInspectedState.memoryMap.textSegment.base}</span>
                        <span className="text-slate-400 text-[10px] block">
                          Size: {(currentInspectedState.memoryMap.textSegment.sizeBytes / (1024 * 1024)).toFixed(1)} MB ({currentInspectedState.memoryMap.textSegment.perms})
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded">
                        <span className="text-slate-500 block">.data (Heap)</span>
                        <span className="text-emerald-400">{currentInspectedState.memoryMap.heapSegment.base}</span>
                        <span className="text-slate-400 text-[10px] block">
                          Alloc: {(currentInspectedState.memoryMap.heapSegment.allocatedBytes / (1024 * 1024)).toFixed(0)} MB
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded">
                        <span className="text-slate-500 block">NVN GPU Buffers</span>
                        <span className="text-amber-400">VRAM: {currentInspectedState.memoryMap.nvnCommandBuffer.vramUsedMB} MB</span>
                        <span className="text-slate-400 text-[10px] block">
                          Submitted: {currentInspectedState.memoryMap.nvnCommandBuffer.submittedBuffers}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Save a memory slot first to inspect ARM64 registers.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>NXNative Memory State v1.4.2</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
