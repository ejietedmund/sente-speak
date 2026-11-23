import { Button } from "./Button";
import type { View } from "../types";

interface AppHeaderProps {
  view: View;
  onNavigate: (view: View) => void;
  speechLabel: string;
}

export function AppHeader({ view, onNavigate, speechLabel }: AppHeaderProps) {
  const items: { view: View; label: string }[] = [
    { view: "home", label: "Home / Scan" },
    { view: "settings", label: "Settings" },
    { view: "about", label: "About" },
  ];
  const active = ["home", "camera", "upload", "result", "uncertain"].includes(view)
    ? "home"
    : view;

  return (
    <header className="border-b-2 border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xl font-extrabold tracking-tight text-primary sm:text-2xl">SENTE SPEAK</p>
          <p className="text-sm text-muted">Ugandan banknote identification by voice</p>
        </div>
        <p className="text-sm font-semibold text-muted" aria-label={`Speech status: ${speechLabel}`}>
          {speechLabel}
        </p>
      </div>
      <nav aria-label="Main navigation" className="mx-auto max-w-5xl px-4 pb-3 sm:px-6">
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.view}>
              <Button
                variant={active === item.view ? "primary" : "secondary"}
                aria-current={active === item.view ? "page" : undefined}
                onClick={() => onNavigate(item.view)}
                className="min-h-[3rem] px-4 text-sm sm:text-base"
              >
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
