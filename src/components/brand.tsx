import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="Studify — início" className="inline-flex items-center gap-3">
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className="size-9 shrink-0 text-highlight">
        <path d="M5 6h9l2 3 2-3h9v21h-9l-2 2-2-2H5V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M16 10v14M9 12h3M9 17h3M20 12h3M20 17h3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M20 3v5l2-1 2 1V3" fill="currentColor" />
      </svg>
      {!compact && <span className="text-xl font-semibold tracking-tight text-foreground">studify</span>}
    </Link>
  );
}
