"use client";

import type { RefObject } from "react";
import type {
  GameControlsHandle,
  GameTouchControls,
  TouchButtonMapping,
  TouchButtonSlot,
} from "@/components/games/registry";

export interface TouchControlsProps {
  controls: GameTouchControls;
  targetRef: RefObject<GameControlsHandle | null>;
}

function TouchButton({
  slot,
  mapping,
  targetRef,
  className,
  label,
}: {
  slot: TouchButtonSlot;
  mapping: TouchButtonMapping;
  targetRef: RefObject<GameControlsHandle | null>;
  className: string;
  label: string;
}) {
  const { code, mode, enabled } = mapping;

  // touch-action: none (CSS) already suppresses scroll/zoom on these buttons;
  // React attaches touch listeners as passive, so preventDefault() here would throw.
  const start = () => {
    if (!enabled) return;
    targetRef.current?.handleKeyDown(code);
    if (mode === "tap") targetRef.current?.handleKeyUp(code);
  };

  const end = () => {
    if (!enabled || mode === "tap") return;
    targetRef.current?.handleKeyUp(code);
  };

  return (
    <button
      type="button"
      aria-label={label}
      data-slot={slot}
      className={className}
      disabled={!enabled}
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export function TouchControls({ controls, targetRef }: TouchControlsProps) {
  return (
    <div className="touch-controls" aria-hidden={false}>
      <div className="dpad">
        <TouchButton
          slot="up"
          mapping={controls.up}
          targetRef={targetRef}
          className="dpad-btn dpad-up"
          label="↑"
        />
        <TouchButton
          slot="left"
          mapping={controls.left}
          targetRef={targetRef}
          className="dpad-btn dpad-left"
          label="←"
        />
        <TouchButton
          slot="right"
          mapping={controls.right}
          targetRef={targetRef}
          className="dpad-btn dpad-right"
          label="→"
        />
        <TouchButton
          slot="down"
          mapping={controls.down}
          targetRef={targetRef}
          className="dpad-btn dpad-down"
          label="↓"
        />
      </div>
      <div className="action-buttons">
        <TouchButton
          slot="b"
          mapping={controls.b}
          targetRef={targetRef}
          className="action-btn action-b"
          label="B"
        />
        <TouchButton
          slot="a"
          mapping={controls.a}
          targetRef={targetRef}
          className="action-btn action-a"
          label="A"
        />
      </div>
    </div>
  );
}
