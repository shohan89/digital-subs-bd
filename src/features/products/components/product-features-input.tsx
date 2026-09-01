"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProductFeaturesInputProps = {
  value: string[];
  onChange: (features: string[]) => void;
  disabled?: boolean;
};

/** Plain controlled `string[]`, not RHF's `useFieldArray` — that expects object-shaped items
 * (each needs its own stable `.id`), which would mean mapping to/from `{ value: string }` for no
 * real benefit here; this list is short and has no per-item form fields beyond the text itself. */
export function ProductFeaturesInput({ value, onChange, disabled }: ProductFeaturesInputProps) {
  const [draft, setDraft] = useState("");

  function addFeature() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addFeature();
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 4K Ultra HD streaming"
          disabled={disabled}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={addFeature} disabled={disabled || !draft.trim()}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {value.map((feature, index) => (
            <li
              key={`${index}-${feature}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-sm"
            >
              <span className="truncate">{feature}</span>
              <button
                type="button"
                onClick={() => removeAt(index)}
                disabled={disabled}
                aria-label={`Remove ${feature}`}
                className="shrink-0 text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
