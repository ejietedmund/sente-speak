import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

type Priority = "polite" | "assertive";

interface Announcement {
  id: number;
  message: string;
}

interface AnnouncerContextValue {
  announce: (message: string, priority?: Priority) => void;
  clear: () => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState<Announcement | null>(null);
  const [assertive, setAssertive] = useState<Announcement | null>(null);
  const counter = useRef(0);

  const announce = useCallback((message: string, priority: Priority = "polite") => {
    if (!message.trim()) return;
    counter.current += 1;
    const next = { id: counter.current, message };
    if (priority === "assertive") setAssertive(next);
    else setPolite(next);
  }, []);

  const clear = useCallback(() => {
    setPolite(null);
    setAssertive(null);
  }, []);

  const value = useMemo(() => ({ announce, clear }), [announce, clear]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {polite && <span key={polite.id}>{polite.message}</span>}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive && <span key={assertive.id}>{assertive.message}</span>}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer(): AnnouncerContextValue {
  const context = useContext(AnnouncerContext);
  if (!context) throw new Error("useAnnouncer must be used inside AnnouncerProvider");
  return context;
}
