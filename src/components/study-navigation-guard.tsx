"use client";
import { useEffect } from "react";
import { useActiveStudy } from "@/lib/active-study";
export function StudyNavigationGuard() {
  const active = useActiveStudy();
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
  return null;
}
