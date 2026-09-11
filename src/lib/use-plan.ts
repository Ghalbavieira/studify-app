"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { StudifyPlan } from "@/lib/plans";

export type PlanState = {
  plan: StudifyPlan;
  status: "active" | "trialing" | "past_due" | "canceled";
  loading: boolean;
};

export function usePlan(): PlanState {
  const [state, setState] = useState<PlanState>({ plan: "free", status: "active", loading: true });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          if (alive) setState({ plan: "free", status: "active", loading: false });
          return;
        }
        const { data } = await supabase.from("profiles").select("plan, plan_status").eq("id", auth.user.id).maybeSingle();
        if (!alive) return;
        const plan = data?.plan === "pro" ? "pro" : "free";
        const status = ["active", "trialing", "past_due", "canceled"].includes(data?.plan_status ?? "")
          ? data!.plan_status as PlanState["status"]
          : "active";
        setState({ plan, status, loading: false });
      } catch {
        if (alive) setState({ plan: "free", status: "active", loading: false });
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  return state;
}
