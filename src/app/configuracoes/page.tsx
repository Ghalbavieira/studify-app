"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { GoalForm } from "@/components/goal-form";
import { secondaryButtonClass } from "@/components/study-ui";
import { exportStudyData, useStudyData, refreshStudyData } from "@/lib/study-store";

export default function ConfiguracoesPage() {
  const { data, mode } = useStudyData();
  const [message, setMessage] = useState("");
  return <AppShell><div className="mx-auto max-w-4xl"><header className="border-b border-line pb-5"><p className="text-sm text-muted">Seu espaço de estudo</p><h1 className="mt-1 text-3xl font-semibold">Configurações</h1></header><section className="border-b border-line py-6"><h2 className="mb-5 text-xl font-semibold">Objetivo e prova</h2><GoalForm key={data.goal?.id ?? "new-goal"} /></section><section className="border-b border-line py-6"><h2 className="text-xl font-semibold">Seus dados</h2><p className="mt-3 text-sm text-secondary">{mode === "cloud" ? "Conta conectada ao Supabase. Seus registros são sincronizados e separados dos dados de outros usuários." : "Modo local: os registros ficam apenas neste navegador. Exporte uma cópia para guardá-los."}</p><div className="mt-4 flex flex-wrap gap-3"><button className={secondaryButtonClass} onClick={() => { try { const blob = new Blob([exportStudyData()], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `studify-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage("Arquivo de dados preparado para download."); } catch { setMessage("Não foi possível exportar. Tente novamente."); } }}>Exportar meus dados</button>{mode === "cloud" && <button onClick={() => void refreshStudyData()} className={secondaryButtonClass}>Atualizar dados</button>}</div><p role="status" className="mt-3 text-sm text-accent">{message}</p></section><section className="py-6"><h2 className="text-xl font-semibold">Aparência</h2><p className="mt-3 text-sm text-muted">Tema escuro, cores sólidas e contraste para leitura prolongada. As animações respeitam a preferência de movimento reduzido do dispositivo.</p></section></div></AppShell>;
}
