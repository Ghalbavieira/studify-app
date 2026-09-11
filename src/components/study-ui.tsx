import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Subject } from "@/lib/study-data";

export const subjectStyles: Record<Subject["color"], string> = {
  blue: "text-accent border-l-accent", violet: "text-highlight border-l-highlight",
  orange: "text-subject-orange border-l-subject-orange", green: "text-success border-l-success",
  amber: "text-attention border-l-attention", pink: "text-subject-pink border-l-subject-pink",
};
export const inputClass = "mt-1 w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground";
export const buttonClass = "rounded-md bg-primary px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButtonClass = "rounded-md border border-line px-3 py-2 text-sm text-secondary disabled:cursor-not-allowed disabled:opacity-50";
export function timeLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`;
}
export function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className="rounded-lg border border-dashed border-line p-6"><h2 className="font-semibold">{title}</h2><p className="mt-2 max-w-xl text-sm text-muted">{description}</p>{href && <Link href={href} className="mt-4 inline-flex items-center gap-2 text-sm text-accent">{action}<ArrowRight size={16} /></Link>}</div>;
}
