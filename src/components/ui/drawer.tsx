"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogOverlay } from "./dialog";

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;
export const DrawerTitle = DialogPrimitive.Title;
export const DrawerDescription = DialogPrimitive.Description;

/** Right-hand side sheet used for lead details and mobile navigation. */
export const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: "left" | "right";
  }
>(function DrawerContent({ className, children, side = "right", ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "animate-fade-in fixed inset-y-0 z-50 flex w-full flex-col bg-[var(--app-panel)] shadow-(--shadow-overlay)",
          side === "right"
            ? "right-0 max-w-xl border-l border-[var(--app-border)]"
            : "left-0 max-w-72 border-r border-[var(--app-border)]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 rounded-md p-1 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]"
          aria-label="Close panel"
        >
          <X className="size-4" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
