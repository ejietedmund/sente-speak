import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  fullWidth = false,
  icon,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const variants = {
    primary: "bg-primary text-primary-text border-primary hover:brightness-110",
    secondary: "bg-surface text-ink border-primary hover:bg-paper",
    ghost: "bg-transparent text-ink border-transparent underline underline-offset-4",
  };

  return (
    <button
      type={type}
      className={`inline-flex min-h-[3.5rem] items-center justify-center gap-3 rounded-control border-2 px-6 py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...rest}
    >
      {icon && (
        <span className="shrink-0 text-xl font-bold" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}
