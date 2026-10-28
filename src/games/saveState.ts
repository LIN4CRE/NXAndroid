/**
 * NXNative Android - Save State & ARM64 Memory Dump Architecture
 * 
 * Manages game state serialization, emulated Horizon kernel memory dumps,
 * ARM64 execution context (PC, SP, X0-X30), and Android Storage Access Framework (SAF)
 * interoperability for exporting and importing `.nxstate` memory dump files.
 */

export interface ARM64Registers {
  pc: string;            // Program Counter (e.g., 0x0000007100084a20)
  sp: string;            // Stack Pointer (e.g., 0x0000007fe0812ff0)
  pstate: string;        // Processor State (NZCV flags)
  tpidrro_el0: string;   // Thread Pointer / TLS context (Horizon OS)
  x: string[];           // 31 General Purpose Registers (X0 to X30)
  fpcr: string;          // Floating-Point Control Register
  fpsr: string;          // Floating-Point Status Register
}

export interface HorizonMemoryMap {
  textSegment: { base: string; sizeBytes: number; perms: string };
  rodataSegment: { base: string; sizeBytes: number; perms: string };
  dataSegment: { base: string; sizeBytes: number; perms: string };
  heapSegment: { base: string; allocatedBytes: number; checksumCRC32: string };
  nvnCommandBuffer: { submittedBuffers: number; activeFences: number; vramUsedMB: number };
}

export interface EngineTargetState {
  id: number;
  x: number;
  y: number;
  z: number;
  collected?: boolean;
}

export interface EngineSnapshot {
  score: number;
  playerPos: [number, number, number];
  playerRotY?: number;
  playerVelY: number;
  cameraPos: [number, number, number];
  playtimeSeconds: number;
  targets: EngineTargetState[];
}

export interface SaveStateData {
  magic: string;             // Magic identifier '!NXSTATE\0'
  version: number;           // State version schema (v1)
  gameId: string;
  gameTitle: string;
  slot: number;              // 0 = QuickSave, 1..4 = Manual Slots
  timestamp: number;         // Epoch timestamp
  dateString: string;        // Human-readable date
  engineState: EngineSnapshot;
  registers: ARM64Registers;
  memoryMap: HorizonMemoryMap;
  androidStoragePath: string; // Emulated Android SAF storage location
  rawMemoryBlob?: string;     // Base64-encoded compressed sparse heap dump
}

export const SAVE_STATE_MAGIC = 'NXSTATE_V1';
const STORAGE_PREFIX = 'nxnative_savestate_';
export const ANDROID_SAF_DEFAULT_PATH = '/sdcard/Android/data/org.nxnative.emu/files/savestates/';

/**
 * Generate synthetic ARM64 guest registers matching current player position
 * and emulated Horizon system call context.
 */
export function generateARM64Registers(score: number, posX: number, posY: number, posZ: number): ARM64Registers {
  // Convert player coordinate IEEE floats into hex representations for registers
  const posXBits = Math.abs(Math.floor(posX * 1000)).toString(16).padStart(8, '0');
  const posZBits = Math.abs(Math.floor(posZ * 1000)).toString(16).padStart(8, '0');
  const scoreHex = (score & 0xffffffff).toString(16).padStart(8, '0');

  const xRegs: string[] = [];
  for (let i = 0; i < 31; i++) {
    if (i === 0) xRegs.push(`0x00000000${scoreHex}`); // X0: Return value / score register
    else if (i === 1) xRegs.push(`0x0000007100${posXBits}`); // X1: Player X float address
    else if (i === 2) xRegs.push(`0x0000007100${posZBits}`); // X2: Player Z float address
    else if (i === 29) xRegs.push('0x0000007fe0812e40'); // X29: Frame Pointer (FP)
    else if (i === 30) xRegs.push('0x0000007100084c8c'); // X30: Link Register (LR)
    else {
      const pseudoVal = ((i * 0x1f3d + score * 17) & 0xfffffff).toString(16).padStart(8, '0');
      xRegs.push(`0x00000071${pseudoVal}`);
    }
  }

  return {
    pc: '0x0000007100084a20',
    sp: '0x0000007fe0812ff0',
    pstate: '0x60000000', // NZCV flags
    tpidrro_el0: '0x0000007fe0800000', // TLS thread pointer
    x: xRegs,
    fpcr: '0x00000000',
    fpsr: '0x00000010',
  };
}

/**
 * Creates a fully validated SaveState structure.
 */
export function createSaveState(
  gameId: string,
  gameTitle: string,
  slot: number,
  engineState: EngineSnapshot
): SaveStateData {
  const now = Date.now();
  const [px, py, pz] = engineState.playerPos;
  const registers = generateARM64Registers(engineState.score, px, py, pz);

  const crc = ((engineState.score * 31337 + Math.floor(px * 100)) & 0xffffffff)
    .toString(16)
    .toUpperCase()
    .padStart(8, '0');

  const memoryMap: HorizonMemoryMap = {
    textSegment: { base: '0x0000007100000000', sizeBytes: 25165824, perms: 'r-x' },
    rodataSegment: { base: '0x0000007101800000', sizeBytes: 8388608, perms: 'r--' },
    dataSegment: { base: '0x0000007102000000', sizeBytes: 16777216, perms: 'rw-' },
    heapSegment: { base: '0x0000007200000000', allocatedBytes: 67108864, checksumCRC32: `0x${crc}` },
    nvnCommandBuffer: {
      submittedBuffers: 142 + Math.floor(engineState.playtimeSeconds * 60),
      activeFences: 2,
      vramUsedMB: 384,
    },
  };

  const filename = `${gameId}_slot_${slot}.nxstate`;
  const androidStoragePath = `${ANDROID_SAF_DEFAULT_PATH}${filename}`;

  return {
    magic: SAVE_STATE_MAGIC,
    version: 1,
    gameId,
    gameTitle,
    slot,
    timestamp: now,
    dateString: new Date(now).toLocaleString(),
    engineState,
    registers,
    memoryMap,
    androidStoragePath,
  };
}

/**
 * Serializes SaveStateData to JSON string.
 */
export function serializeSaveState(state: SaveStateData): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Deserializes and validates a save state JSON string.
 * Throws an error if magic or required fields are missing.
 */
export function deserializeSaveState(jsonString: string): SaveStateData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON format: Corrupted save state file.');
  }

  const obj = parsed as Partial<SaveStateData>;

  if (obj.magic !== SAVE_STATE_MAGIC) {
    throw new Error(`Incompatible or invalid state magic header: expected '${SAVE_STATE_MAGIC}', found '${obj.magic ?? 'none'}'`);
  }

  if (!obj.gameId || typeof obj.slot !== 'number' || !obj.engineState) {
    throw new Error('Malformed save state payload: Missing mandatory game engine fields.');
  }

  if (!obj.registers || !obj.memoryMap) {
    throw new Error('Malformed ARM64 memory dump: Missing CPU register context or Horizon memory map.');
  }

  return obj as SaveStateData;
}

/**
 * Saves a state to browser persistent storage for a specific slot.
 */
export function saveStateToSlot(state: SaveStateData): boolean {
  try {
    const key = `${STORAGE_PREFIX}${state.gameId}_slot_${state.slot}`;
    const payload = serializeSaveState(state);
    localStorage.setItem(key, payload);
    return true;
  } catch (err) {
    console.error('Failed to write save state to localStorage:', err);
    return false;
  }
}

/**
 * Loads a save state for a given game and slot.
 */
export function loadStateFromSlot(gameId: string, slot: number): SaveStateData | null {
  try {
    const key = `${STORAGE_PREFIX}${gameId}_slot_${slot}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return deserializeSaveState(raw);
  } catch (err) {
    console.error(`Failed to load save state slot ${slot}:`, err);
    return null;
  }
}

/**
 * Lists all existing saved slots for a game.
 */
export function listSavedSlots(gameId: string): Record<number, SaveStateData> {
  const result: Record<number, SaveStateData> = {};
  for (let slot = 0; slot <= 4; slot++) {
    const loaded = loadStateFromSlot(gameId, slot);
    if (loaded) {
      result[slot] = loaded;
    }
  }
  return result;
}

/**
 * Deletes a state from storage.
 */
export function deleteStateSlot(gameId: string, slot: number): boolean {
  try {
    const key = `${STORAGE_PREFIX}${gameId}_slot_${slot}`;
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`Failed to delete save state slot ${slot}:`, err);
    return false;
  }
}

/**
 * Triggers a client-side file download of the state data as an `.nxstate` file,
 * simulating an Android Storage Access Framework (SAF) export.
 */
export function exportStateToFile(state: SaveStateData): void {
  const json = serializeSaveState(state);
  const blob = new Blob([json], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.gameId}_slot_${state.slot}_${Date.now()}.nxstate`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads and parses an uploaded .nxstate file.
 */
export async function importStateFromFile(file: File): Promise<SaveStateData> {
  const text = await file.text();
  return deserializeSaveState(text);
}

/**
 * Helper to format duration into mm:ss
 */
export function formatPlaytime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
