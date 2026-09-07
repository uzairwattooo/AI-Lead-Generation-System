"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REJECTION_REASONS } from "@/lib/constants";
import { rejectionSchema, type RejectionInput } from "@/lib/schemas";

export function RejectDialog({
  open,
  onOpenChange,
  count,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  loading: boolean;
  onConfirm: (reason: string, note?: string) => void;
}) {
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<RejectionInput>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: "", note: "" },
  });

  React.useEffect(() => {
    if (!open) reset({ reason: "", note: "" });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit((values) => onConfirm(values.reason, values.note))} noValidate>
          <DialogHeader>
            <DialogTitle>
              Reject {count} lead{count === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              Rejected leads stay in the database with the reason recorded, and are never contacted.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field id="reason" label="Rejection reason" error={errors.reason?.message}>
              <Controller
                control={control}
                name="reason"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="reason" aria-invalid={Boolean(errors.reason)}>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REJECTION_REASONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field id="note" label="Note (optional)" error={errors.note?.message}>
              <Textarea id="note" rows={3} placeholder="Add context for your team" {...register("note")} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={loading}>
              Reject {count === 1 ? "lead" : "leads"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
