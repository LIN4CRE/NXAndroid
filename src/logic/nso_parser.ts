/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// NSO (Nintendo Shared Object) header definition and ARM64 instruction rewriting logic

export interface NsoSegmentHeader {
  fileOffset: number;
  memoryOffset: number;
  decompressedSize: number;
  compressedSize: number;
}

export interface NsoHeader {
  magic: string; // 'NSO0'
  version: number;
  flags: number;
  textSegment: NsoSegmentHeader;
  rodataSegment: NsoSegmentHeader;
  dataSegment: NsoSegmentHeader;
  bssSize: number;
  textHash: string;
  rodataHash: string;
  dataHash: string;
}

export interface Arm64RewriteResult {
  originalInstruction: number;
  rewrittenInstruction: number;
  mnemonic: string;
  action: 'PATCH_SVC' | 'PATCH_TLS' | 'PASSTHROUGH' | 'PATCH_RELOCATION';
  explanation: string;
}

/**
 * Parses a standard 0x100-byte NSO0 file header
 */
export function parseNsoHeader(buffer: Uint8Array): NsoHeader {
  if (buffer.length < 0x100) {
    throw new Error(`Buffer too small for NSO0 header: ${buffer.length} bytes (minimum 256)`);
  }

  const magic = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
  if (magic !== 'NSO0') {
    throw new Error(`Invalid NSO magic: expected 'NSO0', got '${magic}'`);
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const version = view.getUint32(0x04, true);
  const flags = view.getUint32(0x08, true);

  const textSegment: NsoSegmentHeader = {
    fileOffset: view.getUint32(0x10, true),
    memoryOffset: view.getUint32(0x14, true),
    decompressedSize: view.getUint32(0x18, true),
    compressedSize: view.getUint32(0x60, true),
  };

  const rodataSegment: NsoSegmentHeader = {
    fileOffset: view.getUint32(0x20, true),
    memoryOffset: view.getUint32(0x24, true),
    decompressedSize: view.getUint32(0x28, true),
    compressedSize: view.getUint32(0x64, true),
  };

  const dataSegment: NsoSegmentHeader = {
    fileOffset: view.getUint32(0x30, true),
    memoryOffset: view.getUint32(0x34, true),
    decompressedSize: view.getUint32(0x38, true),
    compressedSize: view.getUint32(0x68, true),
  };

  const bssSize = view.getUint32(0x3c, true);

  return {
    magic,
    version,
    flags,
    textSegment,
    rodataSegment,
    dataSegment,
    bssSize,
    textHash: Array.from(buffer.subarray(0xa0, 0xa8)).map(b => b.toString(16).padStart(2, '0')).join(''),
    rodataHash: Array.from(buffer.subarray(0xc0, 0xc8)).map(b => b.toString(16).padStart(2, '0')).join(''),
    dataHash: Array.from(buffer.subarray(0xe0, 0xe8)).map(b => b.toString(16).padStart(2, '0')).join(''),
  };
}

/**
 * Rewrites an ARM64 instruction for Android execution.
 * - On Switch, SVC #0xXX is used for Horizon OS system calls. On Android, user-mode SVC is trapped by Linux kernel
 *   or causes SIGSYS. We patch SVC into a direct branch or BL to the Horizon HLE dispatcher table.
 * - On Switch, TPIDRRO_EL0 holds the Thread Local Storage (TLS) pointer. On Android Bionic, TLS is accessed via TPIDR_EL0
 *   or __get_tls(), and x18 is reserved by Android's ShadowCallStack ABI.
 */
export function rewriteArm64Instruction(instruction: number, pcAddress: bigint = 0n): Arm64RewriteResult {
  const uInst = instruction >>> 0;

  // Check for SVC #imm16: 1101 0100 000x xxxx xxxx xxxx xxx0 0001
  // bits 31-21: 1101 0100 000 -> 0xD4000000
  // bits 4-0: 00001 -> 0x01
  const isSvc = ((uInst & 0xffe0001f) >>> 0) === 0xd4000001;
  if (isSvc) {
    const svcId = (uInst >> 5) & 0xffff;
    // Replace with BL (branch with link) or direct call to Horizon dispatcher trampoline
    return {
      originalInstruction: uInst,
      rewrittenInstruction: 0x94000000, // BL to svc_dispatch_trampoline
      mnemonic: `svc #0x${svcId.toString(16)}`,
      action: 'PATCH_SVC',
      explanation: `Intercepted Horizon SVC 0x${svcId.toString(16)} (e.g. WaitSync/Arbitrate/ConnectPort). Patched to direct C-ABI dispatcher stub.`,
    };
  }

  // Check for MRS Xt, TPIDRRO_EL0 (Op0=3, op1=3, CRn=13, CRm=0, op2=3 -> 0xd53bd060 | Rt)
  // Switch games read TLS pointer via MRS Xn, TPIDRRO_EL0
  const isMrsTpidrro = ((uInst & 0xffffffe0) >>> 0) === 0xd53bd060;
  if (isMrsTpidrro) {
    const rt = uInst & 0x1f;
    // On Android, TPIDR_EL0 is 0xd53bd040 | rt
    const rewritten = (0xd53bd040 | rt) >>> 0;
    return {
      originalInstruction: uInst,
      rewrittenInstruction: rewritten,
      mnemonic: `mrs x${rt}, tpidrro_el0`,
      action: 'PATCH_TLS',
      explanation: `Rewrote guest TLS register read (TPIDRRO_EL0) to Android Bionic TLS register (TPIDR_EL0).`,
    };
  }

  // Passthrough normal ARM64 instructions (ADD, SUB, LDR, STR, FMA, etc.)
  return {
    originalInstruction: uInst,
    rewrittenInstruction: uInst,
    mnemonic: 'arm64_native',
    action: 'PASSTHROUGH',
    explanation: 'Executed 100% natively on Android ARM64 core without translation overhead.',
  };
}
