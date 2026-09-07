"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "./badge";
import { Button } from "./button";
import { Input } from "./input";

/** Free-form list input used for excluded businesses and domains. */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  invalid = false,
  describedBy,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = React.useState("");

  const add = () => {
    const entry = draft.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!entry || value.includes(entry)) {
      setDraft("");
      return;
    }
    onChange([...value, entry]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <li key={item}>
              <Badge tone="outline" className="pr-1">
                {item}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((entry) => entry !== item))}
                  aria-label={`Remove ${item}`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--app-panel-muted)]"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
