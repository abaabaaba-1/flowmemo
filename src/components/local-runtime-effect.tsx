"use client";

import { useEffect } from "react";

export function LocalRuntimeEffect() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_FLOWMEMO_RUNTIME !== "local") return;

    const disableNextDevPortalPointerEvents = () => {
      document.querySelectorAll<HTMLElement>("nextjs-portal").forEach((portal) => {
        portal.style.pointerEvents = "none";
      });
    };

    disableNextDevPortalPointerEvents();
    const observer = new MutationObserver(disableNextDevPortalPointerEvents);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
