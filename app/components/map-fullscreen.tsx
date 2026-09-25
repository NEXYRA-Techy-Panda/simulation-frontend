"use client";

import { useEffect, useRef, useState } from "react";

/** Shared fullscreen state for the live map and the isolated visual preview. */
export function useMapFullscreen(onExit?: () => void): {
  fullscreen: boolean;
  toggleFullscreen: () => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
} {
  const [fullscreen, setFullscreen] = useState(false);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreen(false);
        onExitRef.current?.();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  return {
    fullscreen,
    toggleFullscreen: () => setFullscreen((value) => !value),
    openFullscreen: () => setFullscreen(true),
    closeFullscreen: () => setFullscreen(false),
  };
}
