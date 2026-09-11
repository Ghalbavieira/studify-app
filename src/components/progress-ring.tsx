export function ProgressRing({ value, label }: { value: number; label: string }) {
  const progress = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-20 shrink-0" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--line)" strokeWidth="4" />
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--success)" strokeWidth="4" pathLength="100" strokeDasharray={`${progress} 100`} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-medium tabular-nums">{progress}%</span>
      </div>
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">Meta semanal</p>
      </div>
    </div>
  );
}
