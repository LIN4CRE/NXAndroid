/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface ThreeVisualizerProps {
  explodedProgress: number; // 0.0 (compact) to 1.0 (fully exploded)
  activeLayer: 'all' | 'guest' | 'translation' | 'host';
  onSelectSubsystem: (subsystemId: string) => void;
  selectedSubsystemId: string | null;
  cameraPreset: 'isometric' | 'top' | 'front' | 'side';
  showDataTraffic: boolean;
}

export const ThreeVisualizer: React.FC<ThreeVisualizerProps> = ({
  explodedProgress,
  activeLayer,
  onSelectSubsystem,
  selectedSubsystemId,
  cameraPreset,
  showDataTraffic,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const propsRef = useRef({
    explodedProgress,
    activeLayer,
    onSelectSubsystem,
    selectedSubsystemId,
    cameraPreset,
    showDataTraffic,
  });
  propsRef.current = {
    explodedProgress,
    activeLayer,
    onSelectSubsystem,
    selectedSubsystemId,
    cameraPreset,
    showDataTraffic,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL from renderer string (SwiftShader, llvmpipe, softpipe, WARP)
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
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyHorizonColor = new THREE.Color(0x0a0f1d);
    scene.background = skyHorizonColor;
    // Gentle linear fog that does not obscure foreground objects
    scene.fog = new THREE.Fog(0x0a0f1d, 35, 90);

    // Studio Environment
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch (e) {
      // Fallback safe for software WebGL
    }

    // Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(10, 8, 12);
    camera.lookAt(0, 2.0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2.0, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.update();

    (window as any).THREE = THREE;
    (window as any).__DEBUG_THREE = { scene, camera, renderer };

    // Lighting rig: Ambient light + warm key light + cool hemisphere fill + rim light
    const ambientLight = new THREE.AmbientLight(0xdce7f9, 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 3.5);
    keyLight.position.set(12, 18, 10);
    keyLight.castShadow = !isSoftwareGl;
    scene.add(keyLight);
    scene.add(keyLight.target);
    keyLight.target.position.set(0, 2.0, 0);

    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x1e293b, 1.8);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    rimLight.position.set(-10, 8, -10);
    scene.add(rimLight);

    // Procedural grid floor with polygon offset
    const floorGeo = new THREE.PlaneGeometry(70, 70);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.02;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // Grid helper
    const grid = new THREE.GridHelper(50, 50, 0x1e293b, 0x0f172a);
    grid.position.y = 0.0;
    scene.add(grid);

    // Contact shadow plane beneath the rig
    const shadowGeo = new THREE.PlaneGeometry(18, 18);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.01;
    scene.add(contactShadow);

    // Main Rig Group
    const rootRig = new THREE.Group();
    scene.add(rootRig);
    (window as any).__DEBUG_THREE = { scene, camera, rootRig };

    // Layer Groups
    const hostGroup = new THREE.Group();
    const translationGroup = new THREE.Group();
    const guestGroup = new THREE.Group();
    rootRig.add(hostGroup);
    rootRig.add(translationGroup);
    rootRig.add(guestGroup);

    // Robust PBR Materials with high diffuse visibility
    const pcbGreenMat = new THREE.MeshStandardMaterial({
      color: 0x14532d, // Rich forest PCB green
      roughness: 0.4,
      metalness: 0.3,
    });
    const siliconDarkMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Visible slate silicon
      roughness: 0.3,
      metalness: 0.5,
    });
    const goldPinMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // Bright gold
      roughness: 0.2,
      metalness: 0.8,
    });
    const aluminumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Clean brushed aluminum
      roughness: 0.35,
      metalness: 0.6,
    });
    const copperHeatMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Rich amber copper
      roughness: 0.3,
      metalness: 0.6,
    });
    const vulkanRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Vibrant Vulkan Red
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.2,
    });
    const armBlueMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, // Vibrant ARM Blue
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.2,
    });
    const neonCyanMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan
      roughness: 0.25,
      metalness: 0.5,
      emissive: 0x164e63,
      emissiveIntensity: 0.3,
    });
    const androidGreenMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Android Green
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x14532d,
      emissiveIntensity: 0.2,
    });

    // -------------------------------------------------------------
    // BUILD LAYER 1: HOST ANDROID PLATFORM & GPU (BOTTOM)
    // Composite 3-12 part procedural model
    // -------------------------------------------------------------
    const hostBaseMesh = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.4, 9.0), pcbGreenMat);
    hostBaseMesh.position.y = 0.2;
    hostBaseMesh.castShadow = !isSoftwareGl;
    hostBaseMesh.receiveShadow = !isSoftwareGl;
    hostBaseMesh.userData = { id: 'host-pcb', name: 'Android System Board (Host Motherboard)' };
    hostGroup.add(hostBaseMesh);

    // Snapdragon / Mali SoC Die
    const socDieMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 3.6), siliconDarkMat);
    socDieMesh.position.set(0, 0.5, 0);
    socDieMesh.castShadow = !isSoftwareGl;
    socDieMesh.userData = { id: 'host-soc', name: 'Qualcomm Snapdragon 8 Gen 3 / Dimensity 9300 SoC' };
    hostGroup.add(socDieMesh);

    // Adreno 750 / Immortalis Vulkan 1.3 Hardware Block
    const vulkanGpuMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 1.8), vulkanRedMat);
    vulkanGpuMesh.position.set(1.8, 0.65, -1.5);
    vulkanGpuMesh.userData = { id: 'host-gpu', name: 'Adreno 750 / Immortalis-G720 Vulkan 1.3 GPU' };
    hostGroup.add(vulkanGpuMesh);

    // Android Bionic ARM64 CPU Cores (Kryo / Cortex-X4)
    const cpuClusterMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 1.8), armBlueMat);
    cpuClusterMesh.position.set(-1.8, 0.65, -1.5);
    cpuClusterMesh.userData = { id: 'host-cpu', name: 'Host ARM64 CPU Cluster (Cortex-X4 / Kryo Cores)' };
    hostGroup.add(cpuClusterMesh);

    // Android Bionic Unified LPDDR5X RAM Module
    const ramBarMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 1.4), aluminumMat);
    ramBarMesh.position.set(0, 0.65, 2.2);
    ramBarMesh.userData = { id: 'host-ram', name: 'Host LPDDR5X Memory Pool (Dual mmap & memfd_create)' };
    hostGroup.add(ramBarMesh);

    // Host Gold BGA Pins along perimeter
    const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8);
    const pinInst = new THREE.InstancedMesh(pinGeo, goldPinMat, 28);
    const tempMat4 = new THREE.Matrix4();
    let pinIdx = 0;
    for (let i = -3.8; i <= 3.8; i += 1.2) {
      tempMat4.setPosition(i, 0.15, -4.2);
      pinInst.setMatrixAt(pinIdx++, tempMat4);
      tempMat4.setPosition(i, 0.15, 4.2);
      pinInst.setMatrixAt(pinIdx++, tempMat4);
    }
    pinInst.computeBoundingSphere();
    hostGroup.add(pinInst);

    // -------------------------------------------------------------
    // BUILD LAYER 2: NXNATIVE TRANSLATION & HLE RUNTIME (MIDDLE)
    // -------------------------------------------------------------
    const transBaseMesh = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.35, 8.2), aluminumMat);
    transBaseMesh.position.y = 2.2;
    transBaseMesh.userData = { id: 'trans-bridge', name: 'NXNative Translation Interconnect Substrate' };
    translationGroup.add(transBaseMesh);

    // NSO ARM64 Binary Rewriter Core
    const rewriterBlock = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), neonCyanMat);
    rewriterBlock.position.set(-2.2, 2.5, -2.0);
    rewriterBlock.userData = { id: 'trans-rewriter', name: 'ARM64 NSO Rewriter (SVC #0 & TLS Patcher)' };
    translationGroup.add(rewriterBlock);

    // NVN-to-Vulkan 1.3 State & Command Translator
    const nvnVkBlock = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 2.4), vulkanRedMat);
    nvnVkBlock.position.set(2.2, 2.5, -2.0);
    nvnVkBlock.userData = { id: 'trans-nvn-vk', name: 'NVN to Vulkan 1.3 State & Barrier Translator' };
    translationGroup.add(nvnVkBlock);

    // Maxwell -> SPIR-V Direct Shader Engine
    const shaderBlock = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 2.0), copperHeatMat);
    shaderBlock.position.set(2.2, 2.5, 1.8);
    shaderBlock.userData = { id: 'trans-shader', name: 'Maxwell to SPIR-V 1.5 Shader Pipeline (Zero MSL)' };
    translationGroup.add(shaderBlock);

    // Horizon OS Kernel HLE Dispatcher (Futex & IPC)
    const horizonBlock = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.0), armBlueMat);
    horizonBlock.position.set(-2.2, 2.5, 1.8);
    horizonBlock.userData = { id: 'trans-horizon', name: 'Horizon OS Kernel HLE (Futex sync & IPC Gateway)' };
    translationGroup.add(horizonBlock);

    // -------------------------------------------------------------
    // BUILD LAYER 3: NINTENDO SWITCH GUEST ENVIRONMENT (TOP)
    // -------------------------------------------------------------
    const guestBaseMesh = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.3, 7.4), siliconDarkMat);
    guestBaseMesh.position.y = 4.2;
    guestBaseMesh.userData = { id: 'guest-board', name: 'Nintendo Switch Virtual Architecture Substrate' };
    guestGroup.add(guestBaseMesh);

    // Tegra X1 Maxwell GPU Silicon Block
    const tegraGpuMesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 2.8), copperHeatMat);
    tegraGpuMesh.position.set(0, 4.5, -1.4);
    tegraGpuMesh.userData = { id: 'guest-tegra', name: 'NVIDIA Tegra X1 Maxwell GPU Block (NVN Target)' };
    guestGroup.add(tegraGpuMesh);

    // Switch 4GB Guest Memory Space Container
    const guestRamMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 1.8), aluminumMat);
    guestRamMesh.position.set(0, 4.45, 1.8);
    guestRamMesh.userData = { id: 'guest-ram', name: 'Switch 4GB Virtual Address Space (NSO Heap)' };
    guestGroup.add(guestRamMesh);

    // Joy-Con / HID Input Stream Gateway
    const joyconMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.8), neonCyanMat);
    joyconMesh.position.set(2.4, 4.45, 0);
    joyconMesh.userData = { id: 'guest-hid', name: 'HID Joy-Con Shared Memory Gateway' };
    guestGroup.add(joyconMesh);

    // Audio Renderer audren:u Gateway
    const audioMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.8), armBlueMat);
    audioMesh.position.set(-2.4, 4.45, 0);
    audioMesh.userData = { id: 'guest-audio', name: 'audren:u 48kHz Audio Output Node' };
    guestGroup.add(audioMesh);

    // -------------------------------------------------------------
    // DATA TRAFFIC PARTICLES (Connecting Guest NVN to Host Vulkan)
    // -------------------------------------------------------------
    const particleCount = 48;
    const particleGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const particleInst = new THREE.InstancedMesh(particleGeo, particleMat, particleCount);
    particleInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(particleInst);

    // Interactive Raycaster for part selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const allPickable = [
        hostBaseMesh, socDieMesh, vulkanGpuMesh, cpuClusterMesh, ramBarMesh,
        transBaseMesh, rewriterBlock, nvnVkBlock, shaderBlock, horizonBlock,
        guestBaseMesh, tegraGpuMesh, guestRamMesh, joyconMesh, audioMesh,
      ];
      const intersects = raycaster.intersectObjects(allPickable, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData?.id) {
          propsRef.current.onSelectSubsystem(hit.userData.id);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Damped Camera Target Helpers
    const currentCamPos = camera.position.clone();
    const targetCamPos = camera.position.clone();
    const currentCamLook = new THREE.Vector3(0, 1.2, 0);
    const targetCamLook = new THREE.Vector3(0, 1.2, 0);

    // Animation Loop with Software-WebGL Pacing Guard
    let frameId = 0;
    let clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl?.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (gl) gl.flush();
      let polls = 0;
      const poll = () => {
        polls++;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED && polls < 6) {
          frameId = window.setTimeout(poll, 10);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 60);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const dummyMat4 = new THREE.Matrix4();
    const particlePositions: THREE.Vector3[] = [];
    for (let i = 0; i < particleCount; i++) {
      particlePositions.push(new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5,
        (Math.random() - 0.5) * 5
      ));
    }

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const currentProps = propsRef.current;

      // Exponential damping on exploded view spacing
      const targetSeparation = currentProps.explodedProgress * 3.2;
      guestGroup.position.y = THREE.MathUtils.damp(guestGroup.position.y, targetSeparation * 1.5, 4.0, delta);
      translationGroup.position.y = THREE.MathUtils.damp(translationGroup.position.y, targetSeparation * 0.75, 4.0, delta);
      hostGroup.position.y = THREE.MathUtils.damp(hostGroup.position.y, 0, 4.0, delta);

      // Layer Filter visibility
      if (currentProps.activeLayer === 'guest') {
        guestGroup.visible = true;
        translationGroup.visible = false;
        hostGroup.visible = false;
      } else if (currentProps.activeLayer === 'translation') {
        guestGroup.visible = false;
        translationGroup.visible = true;
        hostGroup.visible = false;
      } else if (currentProps.activeLayer === 'host') {
        guestGroup.visible = false;
        translationGroup.visible = false;
        hostGroup.visible = true;
      } else {
        guestGroup.visible = true;
        translationGroup.visible = true;
        hostGroup.visible = true;
      }

      // Camera preset transitions with smooth exponential damping
      if (currentProps.cameraPreset === 'isometric') {
        targetCamPos.set(11, 10 + targetSeparation * 0.5, 13);
        targetCamLook.set(0, 1.5 + targetSeparation * 0.5, 0);
      } else if (currentProps.cameraPreset === 'top') {
        targetCamPos.set(0.1, 18 + targetSeparation, 0.1);
        targetCamLook.set(0, 0, 0);
      } else if (currentProps.cameraPreset === 'front') {
        targetCamPos.set(0, 4 + targetSeparation * 0.5, 16);
        targetCamLook.set(0, 2 + targetSeparation * 0.5, 0);
      } else if (currentProps.cameraPreset === 'side') {
        targetCamPos.set(16, 4 + targetSeparation * 0.5, 0);
        targetCamLook.set(0, 2 + targetSeparation * 0.5, 0);
      }

      // Continuous subtle turntable rotation if idle
      if (!isSoftwareGl) {
        rootRig.rotation.y = elapsed * 0.08;
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 3.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 3.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 3.5, delta);

      currentCamLook.x = THREE.MathUtils.damp(currentCamLook.x, targetCamLook.x, 3.5, delta);
      currentCamLook.y = THREE.MathUtils.damp(currentCamLook.y, targetCamLook.y, 3.5, delta);
      currentCamLook.z = THREE.MathUtils.damp(currentCamLook.z, targetCamLook.z, 3.5, delta);
      controls.target.copy(currentCamLook);
      controls.update();

      // Animate data traffic particles if enabled
      if (currentProps.showDataTraffic && !isSoftwareGl) {
        particleInst.visible = true;
        const speed = 2.5;
        const maxY = 4.5 + guestGroup.position.y;
        const minY = 0.5;
        for (let i = 0; i < particleCount; i++) {
          const p = particlePositions[i];
          p.y -= speed * delta;
          if (p.y < minY) p.y = maxY;
          dummyMat4.setPosition(p.x, p.y, p.z);
          particleInst.setMatrixAt(i, dummyMat4);
        }
        particleInst.instanceMatrix.needsUpdate = true;
      } else {
        particleInst.visible = false;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    // Window resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none bg-slate-950"
      style={{ touchAction: 'none' }}
    />
  );
};
