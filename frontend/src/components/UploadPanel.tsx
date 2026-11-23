import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "./Button";
import { StatusBanner } from "./StatusBanner";

interface UploadPanelProps {
  file: File | null;
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onIdentify: () => void;
  onCancel: () => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
const MAX_BYTES = 12 * 1024 * 1024;

export function UploadPanel({ file, previewUrl, onSelect, onRemove, onIdentify, onCancel }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Only JPG, JPEG and PNG images are supported. Choose another file.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("This image is larger than 12 MB. Choose a smaller photo.");
      return;
    }
    setError(null);
    onSelect(selected);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border-2 border-line bg-surface p-5">
        <label htmlFor="banknote-image" className="block text-base font-bold">
          Choose a banknote photo
        </label>
        <p id="image-help" className="mb-3 mt-1 text-sm text-muted">
          JPG, JPEG or PNG. Use a clear photo with the whole banknote visible.
        </p>
        <input
          ref={inputRef}
          id="banknote-image"
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          onChange={handleChange}
          aria-describedby="image-help"
          className="block w-full min-h-[3.5rem] rounded-control border-2 border-line bg-paper p-3 text-base"
        />
      </div>

      {error && <StatusBanner tone="error" title={error} />}

      {file && previewUrl && (
        <div className="rounded-2xl border-2 border-line bg-surface p-4">
          <p className="font-bold">Selected image: {file.name}</p>
          <img
            src={previewUrl}
            alt="Preview of the selected banknote"
            className="mt-3 max-h-72 w-full rounded-xl border border-line bg-paper object-contain"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>
              Replace image
            </Button>
            <Button variant="secondary" onClick={onRemove}>
              Remove image
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={onIdentify} disabled={!file} icon="◎">
          Identify banknote
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
