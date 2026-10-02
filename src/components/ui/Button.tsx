import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-cyan-400 text-slate-950 hover:bg-cyan-300 active:bg-cyan-500 shadow-[0_0_24px_rgba(34,211,238,0.35)]",
  secondary:
    "bg-slate-800 text-slate-100 border border-slate-600 hover:bg-slate-700 active:bg-slate-800",
  ghost: "bg-transparent text-slate-300 hover:bg-slate-800/60 active:bg-slate-800",
  danger: "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
  xl: "min-h-14 px-6 text-lg font-semibold",
};

export function Button({
  children,
  variant = "primary",
  size = "lg",
  fullWidth,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "disabled:opacity-40 disabled:pointer-events-none",
        "touch-manipulation select-none",
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
