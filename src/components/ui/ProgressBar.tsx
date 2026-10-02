interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  tone?: "cyan" | "amber" | "rose";
}

const tones = {
  cyan: "bg-cyan-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "cyan",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="w-full" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      {label ? (
        <div className="mb-1.5 flex justify-between text-xs text-slate-400">
          <span>{label}</span>
          <span>{Math.ceil(value / 1000)}s</span>
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${tones[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
