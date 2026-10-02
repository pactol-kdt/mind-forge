import { type HTMLAttributes, type ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
  glow?: boolean;
}

export function Card({
  children,
  padded = true,
  glow = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-3xl border border-slate-700/80 bg-slate-900/80 backdrop-blur-sm",
        glow ? "shadow-[0_0_40px_rgba(34,211,238,0.12)]" : "shadow-lg shadow-black/20",
        padded ? "p-5 sm:p-6" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
