import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: "default" | "success" | "warning" | "error";
  labelledBy?: string;
}

const tones = {
  default: "border-line bg-surface",
  success: "border-accent bg-accent-soft",
  warning: "border-warning bg-warning-soft",
  error: "border-danger bg-danger-soft",
};

export function Card({ children, className = "", tone = "default", labelledBy }: CardProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`rounded-2xl border-2 p-5 shadow-card sm:p-7 ${tones[tone]} ${className}`}
    >
      {children}
    </section>
  );
}
