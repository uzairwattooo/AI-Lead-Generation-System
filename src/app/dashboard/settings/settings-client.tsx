"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Save } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, ToggleRow } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { useSettings, useUpdateSettings } from "@/hooks/use-lead-data";
import { workspaceSettingsSchema, type WorkspaceSettingsInput } from "@/lib/schemas";
import { publicEnv } from "@/lib/public-env";

export function SettingsClient() {
  const { data, isPending, isError, error, refetch } = useSettings();
  const updateSettings = useUpdateSettings();
  const [confirmAutoApprove, setConfirmAutoApprove] = React.useState(false);

  const form = useForm<WorkspaceSettingsInput>({
    resolver: zodResolver(workspaceSettingsSchema),
    values: data,
    mode: "onBlur",
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = form;

  const autoApprove = useWatch({ control, name: "autoApproveLeads" });

  if (isError) {
    return (
      <>
        <PageHeader title="Settings" />
        <Card>
          <ErrorState
            title="Settings could not be loaded"
            description={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />
        </Card>
      </>
    );
  }

  if (isPending || !data) {
    return (
      <>
        <PageHeader title="Settings" />
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </>
    );
  }

  const onSubmit = handleSubmit((values) => updateSettings.mutate(values));

  return (
    <>
      <PageHeader
        title="Settings"
        description="Approval policy, outreach limits and sender identity for this workspace."
      />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Approval policy</CardTitle>
            <CardDescription>
              Controls whether a person must approve each lead before the Outreach Agent contacts it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              control={control}
              name="autoApproveLeads"
              render={({ field }) => (
                <ToggleRow
                  id="autoApproveLeads"
                  label="Automatically approve qualifying leads"
                  description="When off, every lead waits in the approval queue. When on, leads at or above the minimum score enter outreach without review."
                >
                  <Switch
                    id="autoApproveLeads"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConfirmAutoApprove(true);
                      } else {
                        field.onChange(false);
                      }
                    }}
                  />
                </ToggleRow>
              )}
            />

            {autoApprove ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-warn-100 bg-amber-warn-50 px-3 py-2 text-xs text-amber-warn-700 dark:border-amber-warn-700 dark:bg-amber-warn-700/20 dark:text-amber-warn-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Automatic approval is enabled. Leads will be contacted without a manual decision.
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="minimumApprovalScore"
                label="Minimum approval score"
                hint="Leads below this score are flagged in the approval queue."
                error={errors.minimumApprovalScore?.message}
              >
                <Input
                  id="minimumApprovalScore"
                  type="number"
                  min={0}
                  max={100}
                  aria-invalid={Boolean(errors.minimumApprovalScore)}
                  {...register("minimumApprovalScore", { valueAsNumber: true })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Controller
                control={control}
                name="requireEmailBeforeOutreach"
                render={({ field }) => (
                  <ToggleRow
                    id="requireEmailBeforeOutreach"
                    label="Require a verified email before outreach"
                    description="Blocks leads without a validated email address from entering the send queue."
                  >
                    <Switch
                      id="requireEmailBeforeOutreach"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </ToggleRow>
                )}
              />
              <Controller
                control={control}
                name="requireOutreachCopyApproval"
                render={({ field }) => (
                  <ToggleRow
                    id="requireOutreachCopyApproval"
                    label="Review generated emails before sending"
                    description="Each generated email waits for approval on the Outreach page."
                  >
                    <Switch
                      id="requireOutreachCopyApproval"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </ToggleRow>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outreach limits</CardTitle>
            <CardDescription>How aggressively the Outreach Agent follows up.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              id="dailyOutreachLimit"
              label="Daily email limit"
              error={errors.dailyOutreachLimit?.message}
            >
              <Input
                id="dailyOutreachLimit"
                type="number"
                min={1}
                max={2000}
                aria-invalid={Boolean(errors.dailyOutreachLimit)}
                {...register("dailyOutreachLimit", { valueAsNumber: true })}
              />
            </Field>
            <Field
              id="followUpCount"
              label="Follow-ups per lead"
              hint="Between 0 and 3."
              error={errors.followUpCount?.message}
            >
              <Input
                id="followUpCount"
                type="number"
                min={0}
                max={3}
                aria-invalid={Boolean(errors.followUpCount)}
                {...register("followUpCount", { valueAsNumber: true })}
              />
            </Field>
            <Field
              id="followUpIntervalDays"
              label="Days between follow-ups"
              error={errors.followUpIntervalDays?.message}
            >
              <Input
                id="followUpIntervalDays"
                type="number"
                min={1}
                max={30}
                aria-invalid={Boolean(errors.followUpIntervalDays)}
                {...register("followUpIntervalDays", { valueAsNumber: true })}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sender identity and alerts</CardTitle>
            <CardDescription>Used in generated emails and review notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="senderName" label="Sender name" error={errors.senderName?.message}>
                <Input
                  id="senderName"
                  aria-invalid={Boolean(errors.senderName)}
                  {...register("senderName")}
                />
              </Field>
              <Field id="senderEmail" label="Sender email" error={errors.senderEmail?.message}>
                <Input
                  id="senderEmail"
                  type="email"
                  aria-invalid={Boolean(errors.senderEmail)}
                  {...register("senderEmail")}
                />
              </Field>
            </div>
            <Controller
              control={control}
              name="notifyOnNeedsReview"
              render={({ field }) => (
                <ToggleRow
                  id="notifyOnNeedsReview"
                  label="Notify me when something needs review"
                  description="Shows a badge in the top bar when the agents escalate an item."
                >
                  <Switch
                    id="notifyOnNeedsReview"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </ToggleRow>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backend connection</CardTitle>
            <CardDescription>Read-only. Configured through environment variables.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-[var(--app-border)] text-xs">
              <div className="flex gap-3 py-2 first:pt-0">
                <dt className="w-48 shrink-0 text-[var(--app-text-muted)]">Data source</dt>
                <dd className="font-medium">
                  {publicEnv.demoMode ? "Demo adapter (no live backend)" : "Supabase"}
                </dd>
              </div>
              <div className="flex gap-3 py-2">
                <dt className="w-48 shrink-0 text-[var(--app-text-muted)]">Supabase project</dt>
                <dd className="min-w-0 break-all font-medium">
                  {publicEnv.supabaseUrl || "Not configured"}
                </dd>
              </div>
              <div className="flex gap-3 py-2">
                <dt className="w-48 shrink-0 text-[var(--app-text-muted)]">Agent workflows</dt>
                <dd className="font-medium">
                  Configured server-side. Webhook URLs and secrets are never sent to the browser.
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit" loading={updateSettings.isPending} disabled={!isDirty}>
            <Save aria-hidden />
            Save settings
          </Button>
        </div>
      </form>

      <Dialog open={confirmAutoApprove} onOpenChange={setConfirmAutoApprove}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enable automatic approval?</DialogTitle>
            <DialogDescription>
              Leads scoring at or above the minimum approval score will be sent to the Outreach Agent
              without a manual decision. Your team will no longer see them in the approval queue first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmAutoApprove(false)}>
              Keep manual approval
            </Button>
            <Button
              onClick={() => {
                setValue("autoApproveLeads", true, { shouldDirty: true });
                setConfirmAutoApprove(false);
              }}
            >
              Enable automatic approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
