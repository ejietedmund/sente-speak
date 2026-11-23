import type { ReactNode } from "react";

interface StatusBannerProps {
  tone: "info" | "success" | "warning" | "error";
  title: string;
  children?: ReactNode;
}

const styles = {
  info: "border-primary bg-surface text-ink",
  success: "border-accent bg-accent-soft text-ink",
  warning: "border-warning bg-warning-soft text-ink",
  error: "border-danger bg-danger-soft text-ink",
};

const badges = {
  info: "i",
  success: "✓",
  warning: "!",
  error: "!",
};

export function StatusBanner({ tone, title, children }: StatusBannerProps) {
  const role = tone === "error" ? "alert" : "status";
  return (
    <div role={role} className={`flex gap-3 rounded-xl border-2 p-4 ${styles[tone]}`}>
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-current text-base font-bold"
      >
        {badges[tone]}
      </span>
      <div>
        <p className="font-bold">{title}</p>
        {children && <div className="mt-1 text-sm leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
