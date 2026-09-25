"use client";

import { useEffect, useState } from "react";

/** Shared fullscreen state for the live map and the isolated visual preview. */
export function useMapFullscreen(): {
  fullscreen: boolean;
  toggleFullscreen: () => void;
} {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
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
  };
}
