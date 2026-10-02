import { type ReactNode } from "react";

interface MobileContainerProps {
  children: ReactNode;
  className?: string;
}

export function MobileContainer({ children, className = "" }: MobileContainerProps) {
  return (
    <div
      className={[
        "mx-auto flex min-h-dvh w-full max-w-[480px] flex-col",
        "px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
