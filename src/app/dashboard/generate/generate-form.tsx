"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Rocket } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, ToggleRow, describedBy } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import {
  BUSINESS_CATEGORIES,
  COUNTRIES,
  LEAD_TYPES,
  REGIONS_BY_COUNTRY,
  SERVICES,
} from "@/lib/constants";
import { leadSearchCriteriaSchema, type LeadSearchCriteriaOutput } from "@/lib/schemas";
import { leadService } from "@/services/lead-service";
import { errorMessage } from "@/hooks/use-lead-data";
import type { LeadSearchCriteria } from "@/types";

const DEFAULT_VALUES: LeadSearchCriteriaOutput = {
  country: "United States",
  region: "",
  city: "",
  radiusKm: 30,
  categories: [],
  service: "",
  leadType: "",
  requestedLeadCount: 100,
  minimumScore: 70,
  requireEmail: true,
  requirePhone: false,
  requireDecisionMaker: false,
  excludedDomains: [],
  additionalInstructions: "",
};

export function GenerateLeadsForm() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<LeadSearchCriteria | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LeadSearchCriteriaOutput>({
    resolver: zodResolver(leadSearchCriteriaSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  // useWatch keeps the live request summary in sync without breaking memoization.
  const values = useWatch({ control, defaultValue: DEFAULT_VALUES }) as LeadSearchCriteriaOutput;
  const regionOptions = REGIONS_BY_COUNTRY[values.country] ?? [];

  const mutation = useMutation({
    mutationFn: (criteria: LeadSearchCriteria) => leadService.createRequest(criteria),
    onSuccess: (result) => {
      setConfirmOpen(false);
      toast.success("Lead generation started", {
        description: result.dispatched
          ? result.detail
          : "The request was recorded. Connect the n8n webhook to trigger the agent.",
      });
      router.push(`/dashboard/requests/${result.request.id}`);
    },
    onError: (error) =>
      toast.error("The lead search could not be started", { description: errorMessage(error) }),
  });

  const onSubmit = handleSubmit((formValues: LeadSearchCriteriaOutput) => {
    setPendingValues(formValues);
    setConfirmOpen(true);
  });

  const summaryRows: Array<{ label: string; value: string }> = [
    {
      label: "Target area",
      value: [values.city, values.region, values.country].filter(Boolean).join(", ") || values.country,
    },
    { label: "Search radius", value: `${values.radiusKm} km` },
    { label: "Business categories", value: values.categories.join(", ") || "Not selected" },
    { label: "Service to offer", value: values.service || "Not selected" },
    { label: "Lead type", value: values.leadType || "Not selected" },
    { label: "Leads requested", value: String(values.requestedLeadCount) },
    { label: "Minimum lead score", value: String(values.minimumScore) },
    {
      label: "Required contact data",
      value:
        [
          values.requireEmail ? "Email" : null,
          values.requirePhone ? "Phone" : null,
          values.requireDecisionMaker ? "Decision maker" : null,
        ]
          .filter(Boolean)
          .join(", ") || "No hard requirements",
    },
    { label: "Excluded domains", value: values.excludedDomains.join(", ") || "None" },
    { label: "Additional instructions", value: values.additionalInstructions || "None" },
  ];

  return (
    <>
      <PageHeader
        title="Generate Leads"
        description="Describe the market you want to reach. The Opportunity Hunter Agent will search public business sources, verify contact details and score every result before it reaches your approval queue."
      />

      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Target market</CardTitle>
              <CardDescription>Where the agent should look for businesses.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="country" label="Target country" error={errors.country?.message}>
                <Controller
                  control={control}
                  name="country"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(next) => {
                        field.onChange(next);
                        setValue("region", "");
                      }}
                    >
                      <SelectTrigger id="country" aria-invalid={Boolean(errors.country)}>
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field
                id="region"
                label="State or region"
                hint={regionOptions.length > 0 ? "Suggestions are available for this country." : "Optional."}
                error={errors.region?.message}
              >
                <Input
                  id="region"
                  list={regionOptions.length > 0 ? "region-options" : undefined}
                  placeholder="For example Texas"
                  aria-invalid={Boolean(errors.region)}
                  aria-describedby={describedBy("region", "hint", errors.region?.message)}
                  {...register("region")}
                />
                {regionOptions.length > 0 ? (
                  <datalist id="region-options">
                    {regionOptions.map((region) => (
                      <option key={region} value={region} />
                    ))}
                  </datalist>
                ) : null}
              </Field>

              <Field id="city" label="City or area" hint="Optional." error={errors.city?.message}>
                <Input
                  id="city"
                  placeholder="For example Austin"
                  aria-invalid={Boolean(errors.city)}
                  {...register("city")}
                />
              </Field>

              <Field
                id="radiusKm"
                label="Search radius (km)"
                hint="Between 1 and 500 kilometres."
                error={errors.radiusKm?.message}
              >
                <Input
                  id="radiusKm"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  aria-invalid={Boolean(errors.radiusKm)}
                  {...register("radiusKm", { valueAsNumber: true })}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What to look for</CardTitle>
              <CardDescription>
                Categories, the service you want to offer and the kind of lead you need.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                id="categories"
                label="Business categories"
                hint="Select one or more categories, or add a custom category."
                error={errors.categories?.message}
              >
                <Controller
                  control={control}
                  name="categories"
                  render={({ field }) => (
                    <MultiSelect
                      id="categories"
                      options={BUSINESS_CATEGORIES}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select business categories"
                      allowCustom
                      customLabel="Custom category"
                      invalid={Boolean(errors.categories)}
                    />
                  )}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="service" label="Service to offer" error={errors.service?.message}>
                  <Controller
                    control={control}
                    name="service"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="service" aria-invalid={Boolean(errors.service)}>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICES.map((service) => (
                            <SelectItem key={service} value={service}>
                              {service}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                <Field id="leadType" label="Lead type" error={errors.leadType?.message}>
                  <Controller
                    control={control}
                    name="leadType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="leadType" aria-invalid={Boolean(errors.leadType)}>
                          <SelectValue placeholder="Select a lead type" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality requirements</CardTitle>
              <CardDescription>
                Leads that do not meet these requirements are rejected before they reach your queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  id="requestedLeadCount"
                  label="Required number of leads"
                  hint="Up to 1000 leads per run."
                  error={errors.requestedLeadCount?.message}
                >
                  <Input
                    id="requestedLeadCount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    aria-invalid={Boolean(errors.requestedLeadCount)}
                    {...register("requestedLeadCount", { valueAsNumber: true })}
                  />
                </Field>

                <Field
                  id="minimumScore"
                  label="Minimum lead score"
                  hint="80 and above is high potential, 60 to 79 is medium."
                  error={errors.minimumScore?.message}
                >
                  <Input
                    id="minimumScore"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    aria-invalid={Boolean(errors.minimumScore)}
                    {...register("minimumScore", { valueAsNumber: true })}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <Controller
                  control={control}
                  name="requireEmail"
                  render={({ field }) => (
                    <ToggleRow
                      id="requireEmail"
                      label="Email required"
                      description="Only keep leads with a validated public email address."
                    >
                      <Switch id="requireEmail" checked={field.value} onCheckedChange={field.onChange} />
                    </ToggleRow>
                  )}
                />
                <Controller
                  control={control}
                  name="requirePhone"
                  render={({ field }) => (
                    <ToggleRow
                      id="requirePhone"
                      label="Phone required"
                      description="Only keep leads with a validated phone number."
                    >
                      <Switch id="requirePhone" checked={field.value} onCheckedChange={field.onChange} />
                    </ToggleRow>
                  )}
                />
                <Controller
                  control={control}
                  name="requireDecisionMaker"
                  render={({ field }) => (
                    <ToggleRow
                      id="requireDecisionMaker"
                      label="Decision-maker required"
                      description="Only keep leads with a named owner or manager."
                    >
                      <Switch
                        id="requireDecisionMaker"
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
              <CardTitle>Exclusions and instructions</CardTitle>
              <CardDescription>Optional refinements passed to the agent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                id="excludedDomains"
                label="Businesses or domains to exclude"
                hint="Press Enter after each domain, for example competitor.com."
                error={errors.excludedDomains?.message ?? errors.excludedDomains?.root?.message}
              >
                <Controller
                  control={control}
                  name="excludedDomains"
                  render={({ field }) => (
                    <TagInput
                      id="excludedDomains"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="competitor.com"
                      invalid={Boolean(errors.excludedDomains)}
                    />
                  )}
                />
              </Field>

              <Field
                id="additionalInstructions"
                label="Additional instructions"
                hint="Up to 1000 characters."
                error={errors.additionalInstructions?.message}
              >
                <Textarea
                  id="additionalInstructions"
                  rows={4}
                  placeholder="For example: prioritise practices with outdated booking flows."
                  aria-invalid={Boolean(errors.additionalInstructions)}
                  {...register("additionalInstructions")}
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-1">
          <Card className="xl:sticky xl:top-20">
            <CardHeader>
              <CardTitle>Request summary</CardTitle>
              <CardDescription>Review before starting the agent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <dl className="divide-y divide-[var(--app-border)]">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex gap-3 py-2 first:pt-0">
                    <dt className="w-36 shrink-0 text-xs text-[var(--app-text-muted)]">{row.label}</dt>
                    <dd className="min-w-0 flex-1 break-words text-xs font-medium text-[var(--app-text)]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {Object.keys(errors).length > 0 ? (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-700 dark:bg-danger-700/20 dark:text-danger-100"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Some fields need attention before the search can start.</span>
                </div>
              ) : null}

              <Button type="submit" size="lg" className="mt-4 w-full">
                <Rocket aria-hidden />
                Start Lead Generation
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start lead generation?</DialogTitle>
            <DialogDescription>
              The Opportunity Hunter Agent will begin searching immediately. You can cancel the run at any
              time from the request details page.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <dl className="divide-y divide-[var(--app-border)] text-xs">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex gap-3 py-2 first:pt-0">
                  <dt className="w-36 shrink-0 text-[var(--app-text-muted)]">{row.label}</dt>
                  <dd className="min-w-0 flex-1 break-words font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Back to the form
            </Button>
            <Button
              loading={mutation.isPending}
              onClick={() => pendingValues && mutation.mutate(pendingValues)}
            >
              <Rocket aria-hidden />
              Start Lead Generation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
