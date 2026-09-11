"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { initializeCloudData, initializeLocalData, setStudyError } from "@/lib/study-store";
import { StudyNavigationGuard } from "./study-navigation-guard";

export function StudyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      initializeLocalData();
      const sync = (event: StorageEvent) => { if (event.key === "studify.data.v1") initializeLocalData(); };
      window.addEventListener("storage", sync);
      return () => window.removeEventListener("storage", sync);
    }
    try {
      const client = getSupabaseClient();
      let active = true;
      let lastUser: string | null | undefined;
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        const userId = session?.user.id ?? null;
        if (userId === lastUser) return;
        lastUser = userId;
        setTimeout(() => { if (active) void initializeCloudData(userId); }, 0);
      });
      return () => { active = false; subscription.unsubscribe(); };
    } catch (error) {
      setStudyError(error instanceof Error ? error.message : "Confira a configuração do Supabase.");
    }
  }, []);
  return <>
    <StudyNavigationGuard />
    {children}
  </>;
}
