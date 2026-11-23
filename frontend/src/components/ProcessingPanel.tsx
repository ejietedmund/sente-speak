interface ProcessingPanelProps {
  message?: string;
}

export function ProcessingPanel({ message = "Identifying banknote…" }: ProcessingPanelProps) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-4 rounded-xl border-2 border-primary bg-surface p-5">
      <span aria-hidden="true" className="sente-pulse h-5 w-5 rounded-full bg-primary" />
      <div>
        <p className="text-lg font-bold">{message}</p>
        <p className="text-sm text-muted">Keep the image steady. This usually takes a few seconds.</p>
      </div>
    </div>
  );
}
