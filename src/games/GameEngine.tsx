/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameInfo } from './types.ts';
import { sfx } from './audio.ts';
import { VirtualGamepad, GamepadState } from '../components/VirtualGamepad.tsx';
import { SaveStateModal } from '../components/SaveStateModal.tsx';
import {
  SaveStateData,
  EngineSnapshot,
  createSaveState,
  saveStateToSlot,
  loadStateFromSlot,
} from './saveState.ts';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Maximize2, Trophy, Heart, Save, CheckCircle2 } from 'lucide-react';

export const GameEngine: React.FC<{
  game: GameInfo;
  onExit: () => void;
}> = ({ game, onExit }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [fps, setFps] = useState<number>(60);
  const [gameMessage, setGameMessage] = useState<string>('Ready! Use Stick / WASD + (A)');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const engineLiveRef = useRef<{
    getSnapshot: () => EngineSnapshot;
    applySnapshot: (state: SaveStateData) => void;
  }>({
    getSnapshot: () => ({
      score: 0,
      playerPos: [0, 0.5, 0],
      playerVelY: 0,
      cameraPos: [0, 3.5, 8],
      playtimeSeconds: 0,
      targets: [],
    }),
    applySnapshot: () => {},
  });

  const showSaveToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Input state
  const inputRef = useRef({
    dx: 0,
    dy: 0,
    jump: false,
    actionA: false,
    actionB: false,
    actionX: false,
  });

  const handleStickMove = (x: number, y: number) => {
    inputRef.current.dx = x;
    inputRef.current.dy = y;
  };

  const handleButtonPress = (btn: keyof GamepadState, pressed: boolean) => {
    if (btn === 'a') inputRef.current.actionA = pressed;
    if (btn === 'b') inputRef.current.actionB = pressed;
    if (btn === 'x') inputRef.current.actionX = pressed;
    if (btn === 'a' && pressed) {
      inputRef.current.jump = true;
      if (soundEnabled) sfx.jump();
    }
  };


  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(
      game.id.includes('star') || game.id.includes('tegra') || game.id.includes('cyber')
        ? 0x050510
        : game.id.includes('kart') || game.id.includes('aero')
        ? 0x1e3a8a
        : 0x0f172a
    );

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 5, 9);
    camera.lookAt(0, 1.5, 0);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e6, 3.0);
    sun.position.set(10, 15, 10);
    scene.add(sun);

    // Ground Arena
    const arenaMat = new THREE.MeshStandardMaterial({
      color: game.id.includes('cyber') ? 0x0f172a : game.id.includes('zelda') ? 0x2e3a2f : 0x1e293b,
      roughness: 0.5,
      metalness: 0.2,
    });
    const arena = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), arenaMat);
    arena.rotation.x = -Math.PI / 2;
    scene.add(arena);

    // Grid helper
    const grid = new THREE.GridHelper(60, 40, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.01;
    scene.add(grid);

    // COMPOSITE PROCEDURAL HERO ACTOR (3-12 parts)
    const heroGroup = new THREE.Group();
    heroGroup.position.set(0, 0.5, 0);
    scene.add(heroGroup);

    // Hero Core Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(game.accentColor),
      roughness: 0.3,
      metalness: 0.6,
    });
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.2), bodyMat);
    bodyMesh.position.y = 0.4;
    heroGroup.add(bodyMesh);

    // Hero Head / Cockpit
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.8 });
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), headMat);
    headMesh.position.set(0, 0.85, 0.1);
    heroGroup.add(headMesh);

    // Wheels / Thrusters (4 corners)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 12), wheelMat);
    w1.rotation.z = Math.PI / 2;
    w1.position.set(-0.6, 0.25, 0.4);
    heroGroup.add(w1);

    const w2 = w1.clone();
    w2.position.set(0.6, 0.25, 0.4);
    heroGroup.add(w2);

    const w3 = w1.clone();
    w3.position.set(-0.6, 0.25, -0.4);
    heroGroup.add(w3);

    const w4 = w1.clone();
    w4.position.set(0.6, 0.25, -0.4);
    heroGroup.add(w4);

    // Interactive Collectibles / Targets
    const targets: THREE.Mesh[] = [];
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x78350f,
    });
    for (let i = 0; i < 8; i++) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), targetMat);
      star.position.set((Math.random() - 0.5) * 20, 0.7, -5 - Math.random() * 25);
      scene.add(star);
      targets.push(star);
    }

    // Keyboard handlers
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') inputRef.current.dy = -1;
      if (e.key === 'ArrowDown' || e.key === 's') inputRef.current.dy = 1;
      if (e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.dx = -1;
      if (e.key === 'ArrowRight' || e.key === 'd') inputRef.current.dx = 1;
      if (e.key === ' ' || e.key === 'j') {
        inputRef.current.jump = true;
        sfx.jump();
      }
      if (e.key === 'k') {
        inputRef.current.actionX = true;
        sfx.laser();
      }
      // F5 Quick Save
      if (e.key === 'F5') {
        e.preventDefault();
        const snap = engineLiveRef.current.getSnapshot();
        const state = createSaveState(game.id, game.title, 0, snap);
        saveStateToSlot(state);
        showSaveToast('Quick Saved to Slot 0');
      }
      // F8 Quick Load
      if (e.key === 'F8') {
        e.preventDefault();
        const loaded = loadStateFromSlot(game.id, 0);
        if (loaded) {
          engineLiveRef.current.applySnapshot(loaded);
        } else {
          showSaveToast('Slot 0 is empty');
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'ArrowDown', 's'].includes(e.key)) inputRef.current.dy = 0;
      if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) inputRef.current.dx = 0;
      if (e.key === 'k') inputRef.current.actionX = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Game loop state
    let frameId = 0;
    let posY = 0.5;
    let velY = 0;
    let localScore = 0;
    const sessionStartTime = performance.now();
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    // Expose engine snapshot extraction and restoration
    engineLiveRef.current = {
      getSnapshot: () => ({
        score: localScore,
        playerPos: [heroGroup.position.x, heroGroup.position.y, heroGroup.position.z],
        playerVelY: velY,
        cameraPos: [camera.position.x, camera.position.y, camera.position.z],
        playtimeSeconds: Math.floor((performance.now() - sessionStartTime) / 1000),
        targets: targets.map((t, idx) => ({
          id: idx,
          x: t.position.x,
          y: t.position.y,
          z: t.position.z,
        })),
      }),
      applySnapshot: (saved: SaveStateData) => {
        const s = saved.engineState;
        heroGroup.position.set(s.playerPos[0], s.playerPos[1], s.playerPos[2]);
        posY = s.playerPos[1];
        velY = s.playerVelY;
        localScore = s.score;
        setScore(localScore);
        camera.position.set(s.cameraPos[0], s.cameraPos[1], s.cameraPos[2]);
        camera.lookAt(s.playerPos[0], 1.5, s.playerPos[2]);
        if (s.targets && s.targets.length > 0) {
          s.targets.forEach((ts, idx) => {
            if (targets[idx]) {
              targets[idx].position.set(ts.x, ts.y, ts.z);
            }
          });
        }
        showSaveToast(`Restored Slot ${saved.slot === 0 ? '0 (Quick)' : saved.slot} (${s.score} PTS)`);
        if (soundEnabled) sfx.start();
      },
    };

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      frameCount++;
      if (now - lastFpsUpdate > 500) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }

      const input = inputRef.current;

      // Move Hero
      const speed = 7.0;
      heroGroup.position.x += input.dx * speed * dt;
      heroGroup.position.z += input.dy * speed * dt;

      // Jump / gravity
      if (input.jump && posY <= 0.51) {
        velY = 6.5;
        input.jump = false;
      }
      velY -= 15.0 * dt;
      posY += velY * dt;
      if (posY < 0.5) {
        posY = 0.5;
        velY = 0;
      }
      heroGroup.position.y = posY;

      // Smooth camera follow
      camera.position.x = THREE.MathUtils.damp(camera.position.x, heroGroup.position.x, 4.0, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, heroGroup.position.z + 8, 4.0, dt);
      camera.lookAt(heroGroup.position.x, 1.5, heroGroup.position.z);

      // Rotate targets & check collision
      for (const t of targets) {
        t.rotation.y += 2.0 * dt;
        const dist = t.position.distanceTo(heroGroup.position);
        if (dist < 1.2) {
          sfx.coin();
          localScore += 100;
          setScore(localScore);
          setGameMessage(`Star collected! +100 PTS`);
          // Respawn further ahead
          t.position.set(heroGroup.position.x + (Math.random() - 0.5) * 16, 0.7, heroGroup.position.z - 15 - Math.random() * 15);
        }
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [game]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* 3D Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Top HUD Game Header */}
      <div className="absolute top-3 inset-x-4 flex items-center justify-between z-40 pointer-events-none">
        {/* Left: Back Button & Game Title */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold shadow-2xl backdrop-blur-sm cursor-pointer active:scale-95 transition-transform"
          >
            <ArrowLeft size={16} />
            <span>Home</span>
          </button>
          <div className="bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs shadow-2xl flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">{game.title}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              {game.genre}
            </span>
          </div>
        </div>

        {/* Center: Live Game Status & Message */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-4 py-1.5 rounded-xl text-xs font-medium text-slate-300 shadow-2xl">
          <span className="text-cyan-400 font-bold">Status:</span>
          <span>{gameMessage}</span>
        </div>

        {/* Right: Save State, Score, FPS & Sound */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <button
            onClick={() => setIsSaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 hover:text-white text-xs font-semibold shadow-2xl backdrop-blur-sm cursor-pointer active:scale-95 transition-transform"
            title="Save State & Memory Dump (F5 Quick Save / F8 Quick Load)"
          >
            <Save size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">Save State</span>
            <span className="sm:hidden">Save</span>
          </button>
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-amber-400 shadow-2xl">
            <Trophy size={14} />
            <span>{score.toString().padStart(5, '0')}</span>
          </div>
          <div className="hidden md:flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-[11px] font-mono text-emerald-400 shadow-2xl">
            <span>{fps} FPS</span>
          </div>
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white shadow-2xl cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Floating Save/Load Toast */}
      {saveToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-cyan-600/95 text-white text-xs font-bold rounded-xl shadow-2xl border border-cyan-400/50 backdrop-blur-sm pointer-events-none">
          <CheckCircle2 size={16} />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Controls Hint Strip at Bottom Center */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center z-20 pointer-events-none">
        <div className="bg-slate-900/80 border border-slate-700/60 px-4 py-1 rounded-full text-[11px] font-mono text-slate-400 shadow-xl">
          {game.controlsSummary}
        </div>
      </div>

      {/* Joy-Con Virtual Touch Controller Overlay for Mobile Phones */}
      <VirtualGamepad
        onButtonPress={handleButtonPress}
        onStickMove={handleStickMove}
        visible={true}
      />

      {/* Save State & Horizon Memory Dump Modal */}
      <SaveStateModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        gameId={game.id}
        gameTitle={game.title}
        currentEngineState={() => engineLiveRef.current.getSnapshot()}
        onApplyState={(state) => engineLiveRef.current.applySnapshot(state)}
      />
    </div>
  );
};
