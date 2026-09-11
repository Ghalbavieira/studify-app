"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useActiveStudy } from "@/lib/active-study";

export function StudyNavigationGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const active = useActiveStudy();

  useEffect(() => {
    if (active && pathname !== "/estudos") router.replace("/estudos");
  }, [active, pathname, router]);

  useEffect(() => {
    if (!active) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [active]);

  return null;
}
