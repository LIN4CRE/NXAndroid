/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNsoHeader, rewriteArm64Instruction } from './nso_parser.ts';
import { translateNvnFormatToVk, NvnFormat, VkFormat } from './nvn_vk_mapping.ts';
import { calculateFrameMetrics } from './benchmarks.ts';

test('NSO Header Parser correctly parses valid NSO0 header buffer', () => {
  const buffer = new Uint8Array(0x100);
  // Magic 'NSO0' = 0x4E, 0x53, 0x4F, 0x30
  buffer[0] = 0x4e;
  buffer[1] = 0x53;
  buffer[2] = 0x4f;
  buffer[3] = 0x30;

  const view = new DataView(buffer.buffer);
  view.setUint32(0x04, 1, true); // Version
  view.setUint32(0x08, 0x7, true); // Flags (text, rodata, data compressed)
  view.setUint32(0x10, 0x1000, true); // Text file offset
  view.setUint32(0x14, 0x0000, true); // Text memory offset
  view.setUint32(0x18, 0x50000, true); // Text decompressed size
  view.setUint32(0x60, 0x22000, true); // Text compressed size
  view.setUint32(0x3c, 0x8000, true); // BSS size

  const parsed = parseNsoHeader(buffer);
  assert.equal(parsed.magic, 'NSO0');
  assert.equal(parsed.version, 1);
  assert.equal(parsed.textSegment.decompressedSize, 0x50000);
  assert.equal(parsed.textSegment.compressedSize, 0x22000);
  assert.equal(parsed.bssSize, 0x8000);
});

test('ARM64 instruction rewriter detects Horizon SVC and patches to C-ABI dispatcher', () => {
  // SVC #0x18 (svcWaitSynchronization): 0xD4000301 (imm16 = 0x18 -> bits 5-20: 0x18 << 5 = 0x300, 0xd4000001 | 0x300 = 0xd4000301)
  const svcInst = 0xd4000301;
  const result = rewriteArm64Instruction(svcInst);
  assert.equal(result.action, 'PATCH_SVC');
  assert.equal(result.mnemonic, 'svc #0x18');
  assert.equal(result.rewrittenInstruction, 0x94000000);
});

test('ARM64 instruction rewriter patches guest TLS TPIDRRO_EL0 to Android Bionic TPIDR_EL0', () => {
  // MRS X0, TPIDRRO_EL0 = 0xd53bd060
  const mrsTpidrro = 0xd53bd060;
  const result = rewriteArm64Instruction(mrsTpidrro);
  assert.equal(result.action, 'PATCH_TLS');
  assert.equal(result.rewrittenInstruction, 0xd53bd040); // MRS X0, TPIDR_EL0
});

test('ARM64 instruction rewriter leaves standard ALU instructions as native passthrough', () => {
  // ADD X0, X1, X2 = 0x8b020020
  const addInst = 0x8b020020;
  const result = rewriteArm64Instruction(addInst);
  assert.equal(result.action, 'PASSTHROUGH');
  assert.equal(result.rewrittenInstruction, addInst);
});

test('NVN to Vulkan format mapping translates textures accurately', () => {
  const rgba8 = translateNvnFormatToVk(NvnFormat.NVN_FORMAT_RGBA8);
  assert.equal(rgba8.vkFormat, VkFormat.VK_FORMAT_R8G8B8A8_UNORM);
  assert.equal(rgba8.isCompressed, false);

  const astc = translateNvnFormatToVk(NvnFormat.NVN_FORMAT_ASTC_4x4);
  assert.equal(astc.vkFormat, VkFormat.VK_FORMAT_ASTC_4x4_UNORM_BLOCK);
  assert.equal(astc.isCompressed, true);

  const depth = translateNvnFormatToVk(NvnFormat.NVN_FORMAT_DEPTH32F);
  assert.equal(depth.vkFormat, VkFormat.VK_FORMAT_D32_SFLOAT);
  assert.equal(depth.isDepthStencil, true);
});

test('Frame pacing metrics calculation outputs correct statistics', () => {
  const sampleFrames = [16.6, 16.7, 16.6, 16.5, 33.3, 16.6, 16.7, 16.6, 16.5, 16.6];
  const metrics = calculateFrameMetrics(sampleFrames);

  assert.ok(metrics.median >= 16.5 && metrics.median <= 16.7);
  assert.ok(metrics.p95 >= 16.7);
  assert.ok(metrics.avgFps > 50 && metrics.avgFps < 65);
  assert.equal(metrics.stutterCount >= 1, true); // The 33.3ms frame is a stutter
});

import {
  createSaveState,
  serializeSaveState,
  deserializeSaveState,
  SAVE_STATE_MAGIC,
  formatPlaytime,
} from '../games/saveState.ts';

test('SaveState creates valid state with ARM64 CPU registers and Horizon memory map', () => {
  const engineSnapshot = {
    score: 350,
    playerPos: [2.5, 0.5, -12.4] as [number, number, number],
    playerVelY: 0,
    cameraPos: [2.5, 3.5, -4.4] as [number, number, number],
    playtimeSeconds: 42,
    targets: [{ id: 0, x: 2.5, y: 0.7, z: -15.0, collected: false }],
  };

  const state = createSaveState('odyssey', 'Odyssey Odyssey 3D', 1, engineSnapshot);

  assert.equal(state.magic, SAVE_STATE_MAGIC);
  assert.equal(state.version, 1);
  assert.equal(state.gameId, 'odyssey');
  assert.equal(state.slot, 1);
  assert.equal(state.engineState.score, 350);
  assert.deepEqual(state.engineState.playerPos, [2.5, 0.5, -12.4]);

  // ARM64 CPU Registers check
  assert.equal(state.registers.pc, '0x0000007100084a20');
  assert.equal(state.registers.sp, '0x0000007fe0812ff0');
  assert.equal(state.registers.x.length, 31);
  assert.ok(state.registers.x[0].includes('0000015e')); // 350 in hex = 0x15e

  // Memory map check
  assert.equal(state.memoryMap.heapSegment.allocatedBytes, 67108864);
  assert.ok(state.androidStoragePath.includes('/sdcard/Android/data/org.nxnative.emu/files/savestates/'));
});

test('SaveState serializes and deserializes accurately with round-trip fidelity', () => {
  const engineSnapshot = {
    score: 800,
    playerPos: [-4.0, 1.2, -30.0] as [number, number, number],
    playerVelY: 3.5,
    cameraPos: [-4.0, 3.5, -22.0] as [number, number, number],
    playtimeSeconds: 125,
    targets: [{ id: 1, x: 0, y: 0.7, z: -20, collected: true }],
  };

  const original = createSaveState('botw', 'Breath of the Wild Realm', 2, engineSnapshot);
  const serialized = serializeSaveState(original);
  assert.ok(typeof serialized === 'string');

  const restored = deserializeSaveState(serialized);
  assert.equal(restored.magic, original.magic);
  assert.equal(restored.gameId, original.gameId);
  assert.equal(restored.slot, original.slot);
  assert.equal(restored.engineState.score, 800);
  assert.deepEqual(restored.engineState.playerPos, [-4.0, 1.2, -30.0]);
  assert.equal(restored.registers.x.length, 31);
});

test('SaveState deserializer rejects corrupted or incompatible state files', () => {
  // Missing magic
  assert.throws(() => {
    deserializeSaveState(JSON.stringify({ gameId: 'botw', slot: 1 }));
  }, /Incompatible or invalid state magic header/);

  // Invalid JSON
  assert.throws(() => {
    deserializeSaveState('not valid json content');
  }, /Invalid JSON format/);
});

test('formatPlaytime correctly formats seconds into mm:ss', () => {
  assert.equal(formatPlaytime(0), '00:00');
  assert.equal(formatPlaytime(65), '01:05');
  assert.equal(formatPlaytime(3599), '59:59');
});

import {
  calculateOnePercentLow,
  createPerformanceTracker,
  getMemoryStats,
  MAX_HISTORY_SAMPLES,
} from '../games/performance.ts';

test('calculateOnePercentLow correctly identifies the 1% low FPS from history', () => {
  const stableHistory = [60, 60, 59, 60, 58, 60, 60, 60, 59, 60];
  assert.equal(calculateOnePercentLow(stableHistory), 58);

  const historyWithDrops = [60, 60, 60, 60, 60, 24, 60, 60, 60, 60];
  assert.equal(calculateOnePercentLow(historyWithDrops), 24);

  assert.equal(calculateOnePercentLow([]), 60);
});

test('createPerformanceTracker initializes default stats with accurate bounds', () => {
  const tracker = createPerformanceTracker();
  assert.equal(tracker.fpsHistory.length, MAX_HISTORY_SAMPLES);
  assert.equal(tracker.currentStats.fps, 60);
  assert.equal(tracker.currentStats.onePercentLowFps, 55);
  assert.ok(tracker.currentStats.guestHeapMB > 0);
  assert.equal(tracker.frameCount, 0);
});

test('getMemoryStats returns positive used and total heap values', () => {
  const mem = getMemoryStats();
  assert.ok(mem.usedMB > 0);
  assert.ok(mem.totalMB >= mem.usedMB);
});


