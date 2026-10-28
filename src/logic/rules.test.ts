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
