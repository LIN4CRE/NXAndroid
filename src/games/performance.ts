/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  onePercentLowFps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  jsHeapUsedMB: number;
  jsHeapTotalMB: number;
  estimatedVramMB: number;
  guestHeapMB: number;
  fpsHistory: number[]; // Last N fps values for sparkline
  frameTimeHistory: number[]; // Last N frame times in ms
}

export const MAX_HISTORY_SAMPLES = 40;

export interface PerformanceTracker {
  lastTimestamp: number;
  frameCount: number;
  lastFpsTimestamp: number;
  fpsHistory: number[];
  frameTimeHistory: number[];
  currentStats: PerformanceMetrics;
}

export function createPerformanceTracker(): PerformanceTracker {
  return {
    lastTimestamp: 0,
    frameCount: 0,
    lastFpsTimestamp: 0,
    fpsHistory: new Array(MAX_HISTORY_SAMPLES).fill(60),
    frameTimeHistory: new Array(MAX_HISTORY_SAMPLES).fill(16.6),
    currentStats: {
      fps: 60,
      frameTimeMs: 16.6,
      avgFps: 60,
      minFps: 58,
      maxFps: 60,
      onePercentLowFps: 55,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      jsHeapUsedMB: 0,
      jsHeapTotalMB: 0,
      estimatedVramMB: 0,
      guestHeapMB: 38.4,
      fpsHistory: new Array(MAX_HISTORY_SAMPLES).fill(60),
      frameTimeHistory: new Array(MAX_HISTORY_SAMPLES).fill(16.6),
    },
  };
}

/**
 * Calculates 1% low FPS from history of frame times or FPS values.
 */
export function calculateOnePercentLow(history: number[]): number {
  if (!history || history.length === 0) return 60;
  const sorted = [...history].sort((a, b) => a - b);
  // Bottom 10% or lowest 1-2 values
  const index = Math.max(0, Math.floor(sorted.length * 0.05));
  return Math.round(sorted[index]);
}

/**
 * Estimates VRAM in Megabytes based on geometries, textures, and screen resolution.
 */
export function estimateVramUsage(
  renderer: THREE.WebGLRenderer,
  triangles: number,
  geometriesCount: number,
  texturesCount: number
): number {
  const pixelRatio = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
  const size = renderer.getSize(new THREE.Vector2());
  const width = size.x * pixelRatio;
  const height = size.y * pixelRatio;

  // Framebuffer + Depth/Stencil: ~8 bytes per pixel (RGBA8 + D24S8) * width * height
  const fboBytes = width * height * 8;

  // Geometry VRAM estimate: ~48 bytes per vertex (pos: 12, normal: 12, uv: 8, index: 4, overhead: 12)
  const vertices = triangles * 3;
  const geomBytes = (vertices * 48) + (geometriesCount * 4096);

  // Textures VRAM estimate: average 2MB per active texture map or min 8MB
  const texBytes = Math.max(texturesCount * 2 * 1024 * 1024, 4 * 1024 * 1024);

  const totalBytes = fboBytes + geomBytes + texBytes;
  return Number((totalBytes / (1024 * 1024)).toFixed(1));
}

/**
 * Reads browser JS heap stats if available (Chromium / Android WebView), or falls back safely.
 */
export function getMemoryStats(): { usedMB: number; totalMB: number } {
  if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
    const mem = (window.performance as any).memory;
    const usedMB = Number((mem.usedJSHeapSize / (1024 * 1024)).toFixed(1));
    const totalMB = Number((mem.totalJSHeapSize / (1024 * 1024)).toFixed(1));
    return { usedMB, totalMB };
  }
  // Safe estimation fallback for browsers without memory API
  return { usedMB: 48.2, totalMB: 84.0 };
}

/**
 * Updates tracker on each rendered frame.
 * Captures Three.js render calls, triangles, and memory statistics.
 */
export function samplePerformanceFrame(
  tracker: PerformanceTracker,
  now: number,
  renderer: THREE.WebGLRenderer
): PerformanceMetrics {
  const dtMs = tracker.lastTimestamp > 0 ? Math.max(1, now - tracker.lastTimestamp) : 16.6;
  tracker.lastTimestamp = now;

  const instantFps = Math.min(120, Math.max(1, Math.round(1000 / dtMs)));

  // Update ring buffers
  tracker.fpsHistory.push(instantFps);
  if (tracker.fpsHistory.length > MAX_HISTORY_SAMPLES) {
    tracker.fpsHistory.shift();
  }

  tracker.frameTimeHistory.push(Number(dtMs.toFixed(1)));
  if (tracker.frameTimeHistory.length > MAX_HISTORY_SAMPLES) {
    tracker.frameTimeHistory.shift();
  }

  tracker.frameCount++;

  // Read Three.js renderer info
  const info = renderer.info;
  const drawCalls = info.render.calls;
  const triangles = info.render.triangles;
  const geometries = info.memory.geometries;
  const textures = info.memory.textures;

  const mem = getMemoryStats();
  const vram = estimateVramUsage(renderer, triangles, geometries, textures);

  // Horizon OS guest memory emulation: baseline 32MB + proportional to geometries/triangles
  const guestHeapMB = Number((32.0 + (triangles / 2000) * 1.5).toFixed(1));

  // Compute aggregated stats
  const sum = tracker.fpsHistory.reduce((acc, v) => acc + v, 0);
  const avgFps = Math.round(sum / tracker.fpsHistory.length);
  const minFps = Math.min(...tracker.fpsHistory);
  const maxFps = Math.max(...tracker.fpsHistory);
  const onePercentLow = calculateOnePercentLow(tracker.fpsHistory);

  tracker.currentStats = {
    fps: instantFps,
    frameTimeMs: Number(dtMs.toFixed(1)),
    avgFps,
    minFps,
    maxFps,
    onePercentLowFps: onePercentLow,
    drawCalls,
    triangles,
    geometries,
    textures,
    jsHeapUsedMB: mem.usedMB,
    jsHeapTotalMB: mem.totalMB,
    estimatedVramMB: vram,
    guestHeapMB,
    fpsHistory: [...tracker.fpsHistory],
    frameTimeHistory: [...tracker.frameTimeHistory],
  };

  return tracker.currentStats;
}
