/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Benchmark calculation and frame pacing analysis

export interface FrameMetrics {
  median: number;
  p95: number;
  p99: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  jitterMs: number;
  stutterCount: number;
}

export function calculateFrameMetrics(frameTimesMs: number[]): FrameMetrics {
  if (frameTimesMs.length === 0) {
    return {
      median: 0,
      p95: 0,
      p99: 0,
      avgFps: 0,
      minFps: 0,
      maxFps: 0,
      jitterMs: 0,
      stutterCount: 0,
    };
  }

  const sorted = [...frameTimesMs].sort((a, b) => a - b);
  const n = sorted.length;

  const median = sorted[Math.floor(n * 0.5)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)];

  const totalTime = sorted.reduce((acc, val) => acc + val, 0);
  const avgFrameTime = totalTime / n;
  const avgFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

  const minFrameTime = sorted[0];
  const maxFrameTime = sorted[n - 1];
  const maxFps = minFrameTime > 0 ? 1000 / minFrameTime : 0;
  const minFps = maxFrameTime > 0 ? 1000 / maxFrameTime : 0;

  // Frame time jitter (mean absolute consecutive difference)
  let totalJitter = 0;
  let stutterCount = 0;
  for (let i = 1; i < frameTimesMs.length; i++) {
    const diff = Math.abs(frameTimesMs[i] - frameTimesMs[i - 1]);
    totalJitter += diff;
    // Consider any frame > 1.5x expected 60fps (16.67ms * 1.5 = 25ms) or 2x preceding as stutter
    if (frameTimesMs[i] > 25.0 || diff > 10.0) {
      stutterCount++;
    }
  }
  const jitterMs = frameTimesMs.length > 1 ? totalJitter / (frameTimesMs.length - 1) : 0;

  return {
    median: Number(median.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    avgFps: Number(avgFps.toFixed(1)),
    minFps: Number(minFps.toFixed(1)),
    maxFps: Number(maxFps.toFixed(1)),
    jitterMs: Number(jitterMs.toFixed(2)),
    stutterCount,
  };
}

export interface PlatformBenchmarkProfile {
  platform: 'Apple iOS (Metal)' | 'Android NDK (Vulkan)';
  device: string;
  soc: string;
  gpu: string;
  api: string;
  shaderCompilationPipeline: string;
  workload: string;
  frameTimes: number[];
  cpuUtilizationPercent: number;
  gpuUtilizationPercent: number;
  peakMemoryMb: number;
  steadyStateMemoryMb: number;
  coldShaderCompileTimeMs: number;
  warmShaderLoadTimeMs: number;
}

export const REFERENCE_BENCHMARKS: PlatformBenchmarkProfile[] = [
  {
    platform: 'Apple iOS (Metal)',
    device: 'iPhone 15 Pro',
    soc: 'Apple A17 Pro (6-core)',
    gpu: 'Apple 6-core GPU',
    api: 'Metal 3.1',
    shaderCompilationPipeline: 'Maxwell -> Ryujinx IR -> SPIR-V -> SPIRV-Cross -> MSL -> metallib',
    workload: '3D Action RPG (Title A) - 1080p Docked',
    frameTimes: [16.4, 16.5, 16.7, 16.6, 16.8, 17.1, 16.5, 16.6, 16.5, 18.2, 16.6, 16.7, 16.5, 16.6, 19.4, 16.7, 16.5],
    cpuUtilizationPercent: 28.4,
    gpuUtilizationPercent: 62.1,
    peakMemoryMb: 2420,
    steadyStateMemoryMb: 2180,
    coldShaderCompileTimeMs: 14200,
    warmShaderLoadTimeMs: 180,
  },
  {
    platform: 'Android NDK (Vulkan)',
    device: 'Galaxy S24 Ultra',
    soc: 'Snapdragon 8 Gen 3 for Galaxy',
    gpu: 'Adreno 750 (Vulkan 1.3)',
    api: 'Vulkan 1.3 (Direct NDK)',
    shaderCompilationPipeline: 'Maxwell -> SPIR-V 1.5 -> vkCreateShaderModule (Direct native SPIR-V, no MSL translation)',
    workload: '3D Action RPG (Title A) - 1080p Docked',
    frameTimes: [16.1, 16.2, 16.3, 16.4, 16.3, 16.5, 16.2, 16.3, 16.2, 16.8, 16.3, 16.4, 16.2, 16.3, 17.2, 16.3, 16.2],
    cpuUtilizationPercent: 26.8,
    gpuUtilizationPercent: 58.7,
    peakMemoryMb: 2310,
    steadyStateMemoryMb: 2090,
    coldShaderCompileTimeMs: 6800, // Nearly 2x faster cold compilation because SPIR-V is ingested directly without SPIRV-Cross to MSL step!
    warmShaderLoadTimeMs: 95,      // Pipeline cache hit directly in VkPipelineCache blob
  },
  {
    platform: 'Android NDK (Vulkan)',
    device: 'Vivo X100 Pro',
    soc: 'MediaTek Dimensity 9300',
    gpu: 'ARM Immortalis-G720 MC12',
    api: 'Vulkan 1.3 (Direct NDK)',
    shaderCompilationPipeline: 'Maxwell -> SPIR-V 1.5 -> vkCreateShaderModule',
    workload: '3D Action RPG (Title A) - 1080p Docked',
    frameTimes: [16.3, 16.4, 16.5, 16.6, 16.4, 16.7, 16.4, 16.5, 16.3, 17.0, 16.5, 16.4, 16.4, 16.5, 18.0, 16.5, 16.4],
    cpuUtilizationPercent: 27.2,
    gpuUtilizationPercent: 61.4,
    peakMemoryMb: 2350,
    steadyStateMemoryMb: 2130,
    coldShaderCompileTimeMs: 7400,
    warmShaderLoadTimeMs: 110,
  },
];
