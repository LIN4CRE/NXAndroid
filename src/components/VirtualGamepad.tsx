/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { sfx } from '../games/audio.ts';

export interface GamepadState {
  stickX: number; // -1.0 to 1.0
  stickY: number; // -1.0 to 1.0
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  l: boolean;
  r: boolean;
  zl: boolean;
  zr: boolean;
  plus: boolean;
  minus: boolean;
}

export const VirtualGamepad: React.FC<{
  onButtonPress: (button: keyof GamepadState, pressed: boolean) => void;
  onStickMove: (x: number, y: number) => void;
  visible?: boolean;
}> = ({ onButtonPress, onStickMove, visible = true }) => {
  const stickBaseRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingStick, setIsDraggingStick] = useState<boolean>(false);
  const touchIdRef = useRef<number | null>(null);

  const vibrate = (ms = 15) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (e) {}
  };

  const handleStickStart = (clientX: number, clientY: number, id: number) => {
    touchIdRef.current = id;
    setIsDraggingStick(true);
    updateStick(clientX, clientY);
  };

  const updateStick = (clientX: number, clientY: number) => {
    if (!stickBaseRef.current) return;
    const rect = stickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2 - 10;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setStickPos({ x: dx, y: dy });
    const normX = dx / maxRadius;
    const normY = dy / maxRadius;
    onStickMove(normX, normY);
  };

  const handleStickEnd = () => {
    setIsDraggingStick(false);
    touchIdRef.current = null;
    setStickPos({ x: 0, y: 0 });
    onStickMove(0, 0);
  };

  // Touch handlers for analog stick
  const onStickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    vibrate(10);
    handleStickStart(touch.clientX, touch.clientY, touch.identifier);
  };

  const onStickTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!isDraggingStick) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        updateStick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const onStickTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        handleStickEnd();
        break;
      }
    }
  };

  const triggerButton = (btn: keyof GamepadState, pressed: boolean) => {
    if (pressed) {
      vibrate(18);
      sfx.click();
    }
    onButtonPress(btn, pressed);
  };

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden font-sans">
      {/* Ergonomic Shoulder Bumpers placed right above the thumb controls */}
      {/* Left Bumpers: ZL, L */}
      <div className="absolute bottom-36 left-4 flex gap-2 pointer-events-auto">
        <button
          onTouchStart={() => triggerButton('zl', true)}
          onTouchEnd={() => triggerButton('zl', false)}
          onMouseDown={() => triggerButton('zl', true)}
          onMouseUp={() => triggerButton('zl', false)}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 active:bg-cyan-600 text-cyan-300 active:text-white border border-cyan-500/40 text-xs font-mono font-bold shadow-xl backdrop-blur-sm cursor-pointer"
        >
          ZL
        </button>
        <button
          onTouchStart={() => triggerButton('l', true)}
          onTouchEnd={() => triggerButton('l', false)}
          onMouseDown={() => triggerButton('l', true)}
          onMouseUp={() => triggerButton('l', false)}
          className="px-3 py-1.5 rounded-xl bg-slate-900/90 active:bg-cyan-600 text-cyan-300 active:text-white border border-cyan-500/40 text-xs font-mono font-bold shadow-xl backdrop-blur-sm cursor-pointer"
        >
          L
        </button>
      </div>

      {/* Right Bumpers: R, ZR */}
      <div className="absolute bottom-36 right-4 flex gap-2 pointer-events-auto">
        <button
          onTouchStart={() => triggerButton('r', true)}
          onTouchEnd={() => triggerButton('r', false)}
          onMouseDown={() => triggerButton('r', true)}
          onMouseUp={() => triggerButton('r', false)}
          className="px-3 py-1.5 rounded-xl bg-slate-900/90 active:bg-rose-600 text-rose-300 active:text-white border border-rose-500/40 text-xs font-mono font-bold shadow-xl backdrop-blur-sm cursor-pointer"
        >
          R
        </button>
        <button
          onTouchStart={() => triggerButton('zr', true)}
          onTouchEnd={() => triggerButton('zr', false)}
          onMouseDown={() => triggerButton('zr', true)}
          onMouseUp={() => triggerButton('zr', false)}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 active:bg-rose-600 text-rose-300 active:text-white border border-rose-500/40 text-xs font-mono font-bold shadow-xl backdrop-blur-sm cursor-pointer"
        >
          ZR
        </button>
      </div>

      {/* LEFT JOY-CON WING (Analog Stick + D-Pad) */}
      <div className="absolute bottom-4 left-4 pointer-events-auto flex items-end gap-3">
        {/* Analog Stick Pod */}
        <div
          ref={stickBaseRef}
          onTouchStart={onStickTouchStart}
          onTouchMove={onStickTouchMove}
          onTouchEnd={onStickTouchEnd}
          onTouchCancel={handleStickEnd}
          className="w-28 h-28 rounded-full bg-slate-900/80 border-2 border-cyan-500/50 shadow-2xl flex items-center justify-center relative touch-none backdrop-blur-sm"
        >
          {/* Inner ring */}
          <div className="w-16 h-16 rounded-full border border-cyan-500/20 pointer-events-none" />
          
          {/* Draggable Stick Cap */}
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-cyan-400 shadow-xl absolute transition-transform ease-out pointer-events-none flex items-center justify-center"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
              transition: isDraggingStick ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <div className="w-5 h-5 rounded-full bg-cyan-400/30 border border-cyan-400/50" />
          </div>
        </div>

        {/* D-Pad Cross */}
        <div className="flex flex-col items-center">
          <button
            onTouchStart={() => triggerButton('dpadUp', true)}
            onTouchEnd={() => triggerButton('dpadUp', false)}
            className="w-8 h-8 rounded-t-md bg-slate-800/90 active:bg-cyan-600 text-slate-300 active:text-white border border-slate-700 flex items-center justify-center text-xs font-bold"
          >
            ▲
          </button>
          <div className="flex">
            <button
              onTouchStart={() => triggerButton('dpadLeft', true)}
              onTouchEnd={() => triggerButton('dpadLeft', false)}
              className="w-8 h-8 rounded-l-md bg-slate-800/90 active:bg-cyan-600 text-slate-300 active:text-white border border-slate-700 flex items-center justify-center text-xs font-bold"
            >
              ◀
            </button>
            <div className="w-8 h-8 bg-slate-900 border border-slate-800" />
            <button
              onTouchStart={() => triggerButton('dpadRight', true)}
              onTouchEnd={() => triggerButton('dpadRight', false)}
              className="w-8 h-8 rounded-r-md bg-slate-800/90 active:bg-cyan-600 text-slate-300 active:text-white border border-slate-700 flex items-center justify-center text-xs font-bold"
            >
              ▶
            </button>
          </div>
          <button
            onTouchStart={() => triggerButton('dpadDown', true)}
            onTouchEnd={() => triggerButton('dpadDown', false)}
            className="w-8 h-8 rounded-b-md bg-slate-800/90 active:bg-cyan-600 text-slate-300 active:text-white border border-slate-700 flex items-center justify-center text-xs font-bold"
          >
            ▼
          </button>
        </div>
      </div>

      {/* RIGHT JOY-CON WING (ABXY Diamond Pod) */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Top: (X) */}
          <button
            onTouchStart={() => triggerButton('x', true)}
            onTouchEnd={() => triggerButton('x', false)}
            onMouseDown={() => triggerButton('x', true)}
            onMouseUp={() => triggerButton('x', false)}
            className="absolute top-0 w-12 h-12 rounded-full bg-slate-800/90 active:bg-blue-600 border border-slate-700 active:border-blue-400 text-white font-bold text-sm shadow-xl flex items-center justify-center"
          >
            X
          </button>

          {/* Right: (A) - Primary Confirm */}
          <button
            onTouchStart={() => triggerButton('a', true)}
            onTouchEnd={() => triggerButton('a', false)}
            onMouseDown={() => triggerButton('a', true)}
            onMouseUp={() => triggerButton('a', false)}
            className="absolute right-0 w-12 h-12 rounded-full bg-rose-600 active:bg-rose-500 border-2 border-rose-400 text-white font-extrabold text-sm shadow-2xl flex items-center justify-center"
          >
            A
          </button>

          {/* Bottom: (B) - Cancel / Jump / Back */}
          <button
            onTouchStart={() => triggerButton('b', true)}
            onTouchEnd={() => triggerButton('b', false)}
            onMouseDown={() => triggerButton('b', true)}
            onMouseUp={() => triggerButton('b', false)}
            className="absolute bottom-0 w-12 h-12 rounded-full bg-amber-600 active:bg-amber-500 border border-amber-400 text-white font-bold text-sm shadow-xl flex items-center justify-center"
          >
            B
          </button>

          {/* Left: (Y) */}
          <button
            onTouchStart={() => triggerButton('y', true)}
            onTouchEnd={() => triggerButton('y', false)}
            onMouseDown={() => triggerButton('y', true)}
            onMouseUp={() => triggerButton('y', false)}
            className="absolute left-0 w-12 h-12 rounded-full bg-emerald-600 active:bg-emerald-500 border border-emerald-400 text-white font-bold text-sm shadow-xl flex items-center justify-center"
          >
            Y
          </button>
        </div>
      </div>
    </div>
  );
};
