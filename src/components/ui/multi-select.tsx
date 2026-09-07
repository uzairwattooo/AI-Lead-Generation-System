"use client";

import * as React from "react";
import { ChevronDown, X } from "lucide-react";

import { Badge } from "./badge";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface MultiSelectProps {
  id: string;
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  /** Allows entries that are not part of `options`. */
  allowCustom?: boolean;
  customLabel?: string;
  invalid?: boolean;
  describedBy?: string;
}

export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Select options",
  allowCustom = false,
  customLabel = "Add a custom entry",
  invalid = false,
  describedBy,
}: MultiSelectProps) {
  const [custom, setCustom] = React.useState("");

  const toggle = (option: string) => {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed || value.includes(trimmed)) {
      setCustom("");
      return;
    }
    onChange([...value, trimmed]);
    setCustom("");
  };

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            id={id}
            type="button"
            data-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(
              "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-panel)] px-3 text-sm shadow-xs",
              "focus-visible:outline-2 focus-visible:outline-[var(--app-ring)]",
              invalid && "border-danger-500",
            )}
          >
            <span className={cn("truncate", value.length === 0 && "text-[var(--app-text-subtle)]")}>
              {value.length === 0
                ? placeholder
                : `${value.length} selected`}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
          <DropdownMenuLabel>Available options</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onCheckedChange={() => toggle(option)}
              onSelect={(event) => event.preventDefault()}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
          {allowCustom ? (
            <>
              <DropdownMenuSeparator />
              <div className="p-1.5">
                <label htmlFor={`${id}-custom`} className="mb-1 block text-[11px] font-medium text-[var(--app-text-muted)]">
                  {customLabel}
                </label>
                <div className="flex gap-1.5">
                  <Input
                    id={`${id}-custom`}
                    value={custom}
                    onChange={(event) => setCustom(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustom();
                      }
                    }}
                    placeholder="Custom category"
                    className="h-8"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={addCustom}>
                    Add
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <li key={item}>
              <Badge tone="info" className="pr-1">
                {item}
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  aria-label={`Remove ${item}`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-cobalt-100 dark:hover:bg-cobalt-800"
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
