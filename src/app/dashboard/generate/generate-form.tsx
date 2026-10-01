"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, BriefcaseBusiness, Building2, CheckCircle2, MapPin, Rocket, Search, Settings2, Users } from "lucide-react";
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
import { Field, ToggleRow } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import {
  BUSINESS_CATEGORIES,
  COUNTRIES,
  DISCOVERY_SOURCE_RULES,
} from "@/lib/constants";
import type { DiscoverySourceValue } from "@/lib/constants";
import { getCities, getRegions } from "@/lib/locations";
import { leadSearchCriteriaSchema, type LeadSearchCriteriaOutput } from "@/lib/schemas";
import { leadService } from "@/services/lead-service";
import { ApiError } from "@/services/http";
import { errorMessage } from "@/hooks/use-lead-data";
import type { LeadSearchCriteria } from "@/types";

const DEFAULT_VALUES: LeadSearchCriteriaOutput = {
  source: "google_maps",
  country: "United States",
  region: "",
  city: "",
  radiusKm: 15,
  categories: [],
  service: DISCOVERY_SOURCE_RULES.google_maps.defaultService,
  leadType: DISCOVERY_SOURCE_RULES.google_maps.defaultLeadType,
  requestedLeadCount: 3,
  minimumScore: 0,
  requireEmail: false,
  requirePhone: false,
  requireDecisionMaker: false,
  excludedDomains: [],
  additionalInstructions: "",
};

const SOURCE_OPTIONS = [
  { value: "google_maps", label: "Local businesses", sourceLabel: "Google Maps", icon: MapPin },
  { value: "linkedin_public_search", label: "LinkedIn opportunities", sourceLabel: "Public LinkedIn search", icon: Building2 },
  { value: "job_platform_public_search", label: "Public client projects", sourceLabel: "Job platforms", icon: BriefcaseBusiness },
  { value: "agency_collaboration_public_search", label: "Agency partners", sourceLabel: "Agency collaboration", icon: Users },
  { value: "google_intent_public_search", label: "Buying intent", sourceLabel: "Google search", icon: Search },
] as const satisfies ReadonlyArray<{
  value: DiscoverySourceValue;
  label: string;
  sourceLabel: string;
  icon: typeof MapPin;
}>;

export function GenerateLeadsForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState("");
  const [savedRequestId, setSavedRequestId] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<LeadSearchCriteria | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LeadSearchCriteriaOutput>({
    resolver: zodResolver(leadSearchCriteriaSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  // useWatch keeps the live request summary in sync without breaking memoization.
  const values = useWatch({ control, defaultValue: DEFAULT_VALUES }) as LeadSearchCriteriaOutput;
  const regionOptions = getRegions(values.country);
  const cityOptions = getCities(values.country, values.region);
  const sourceRules = DISCOVERY_SOURCE_RULES[values.source];
  const isLocal = values.source === "google_maps";
  const isAgency = values.source === "agency_collaboration_public_search";
  const categoryOptions = isAgency
    ? ["Digital Agencies", "Marketing Agencies", "Design Agencies", "Web Development Agencies", "SEO Agencies", "Creative Agencies"]
    : BUSINESS_CATEGORIES;
  const instructionExamples: Record<DiscoverySourceValue, string> = {
    google_maps: "For example: prioritise dentists with outdated booking flows.",
    linkedin_public_search: "For example: prioritise recent public requests for a website redesign.",
    job_platform_public_search: "For example: prioritise fixed-price website redesign projects.",
    agency_collaboration_public_search: "For example: prioritise agencies requesting WordPress overflow support.",
    google_intent_public_search: "For example: prioritise open website redesign RFPs with a visible deadline.",
  };
  const selectedSource = SOURCE_OPTIONS.find((source) => source.value === values.source);
  const contactRequirements = [
    values.requireEmail ? "Email" : null,
    values.requirePhone ? "Phone" : null,
    values.requireDecisionMaker ? "Decision maker" : null,
  ].filter(Boolean).join(", ");

  const mutation = useMutation({
    mutationFn: (criteria: LeadSearchCriteria) => leadService.createRequest(criteria),
    onSuccess: (result) => {
      setConfirmOpen(false);
      if (result.dispatched) {
        toast.success("Lead generation started", { description: result.detail });
      } else {
        toast.warning("Request saved; generation has not started", { description: result.detail });
      }
      router.push(`/dashboard/requests/${result.request.id}`);
    },
    onError: (error) => {
      const message = errorMessage(error);
      setSubmitError(message);
      setConfirmOpen(false);
      if (error instanceof ApiError && error.details && typeof error.details === "object") {
        const details = error.details as { requestId?: string; fieldErrors?: Record<string, string> };
        if (details.requestId) setSavedRequestId(details.requestId);
        if (details.fieldErrors) {
          for (const [key, message] of Object.entries(details.fieldErrors)) {
            if (key in DEFAULT_VALUES) setError(key as keyof LeadSearchCriteriaOutput, { type: "server", message });
          }
          setAdvancedOpen(true);
        }
      }
      toast.error("The lead search could not be started", { description: message });
    },
  });

  const onSubmit = handleSubmit((formValues: LeadSearchCriteriaOutput) => {
    if (mutation.isPending) return;
    setSubmitError("");
    setSavedRequestId("");
    setPendingValues(formValues);
    setConfirmOpen(true);
  }, (validationErrors) => {
    if (["radiusKm", "minimumScore", "excludedDomains", "additionalInstructions"].some((key) => key in validationErrors)) {
      setAdvancedOpen(true);
    }
  });

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: "Source", value: selectedSource?.sourceLabel ?? "Not selected" },
    { label: "Location", value: [values.city, values.region, values.country].filter(Boolean).join(", ") },
    { label: "Category", value: values.categories.join(", ") || "Not selected" },
    { label: "Service", value: values.service || "Not selected" },
    ...(isLocal ? [{ label: "Radius", value: `${values.radiusKm} km` }] : []),
    { label: "Leads", value: String(values.requestedLeadCount ?? 3) },
  ];
  const confirmationRows = [
    ...summaryRows,
    { label: "Quality score", value: `${values.minimumScore}+` },
    { label: "Contact required", value: contactRequirements || "None" },
    { label: "Excluded domains", value: values.excludedDomains.join(", ") || "None" },
    { label: "Instructions", value: values.additionalInstructions || "Standard source rules (no custom instructions)" },
  ];

  return (
    <>
      <PageHeader
        title="Generate Leads"
        description="Tell us who you need. We will find and rank the leads."
      />

      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>1. Choose your lead goal</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <fieldset>
                    <legend className="sr-only">Choose a lead goal and discovery source</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                      {SOURCE_OPTIONS.map((option, index) => {
                        const Icon = option.icon;
                        return (
                          <label key={option.value} className="relative cursor-pointer">
                            <input
                              type="radio"
                              className="peer sr-only"
                              name={field.name}
                              value={option.value}
                              checked={field.value === option.value}
                              ref={index === 0 ? field.ref : undefined}
                              onBlur={field.onBlur}
                              disabled={mutation.isPending}
                              onChange={() => {
                                const rules = DISCOVERY_SOURCE_RULES[option.value];
                                field.onChange(option.value);
                                clearErrors();
                                setSubmitError("");
                                setSavedRequestId("");
                                setValue("categories", option.value === "agency_collaboration_public_search" ? ["Digital Agencies"] : [], { shouldDirty: true });
                                setValue("radiusKm", 15, { shouldDirty: true });
                                setValue("leadType", rules.defaultLeadType, { shouldDirty: true, shouldValidate: true });
                                setValue("service", rules.defaultService, { shouldDirty: true, shouldValidate: true });
                              }}
                            />
                            <span className="flex min-h-24 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 transition-colors hover:bg-[var(--app-panel-muted)] peer-checked:border-teal-500 peer-checked:bg-teal-500/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-500 peer-disabled:opacity-60">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--app-panel-muted)] text-[var(--app-text-muted)]">
                                <Icon className="size-5" aria-hidden />
                              </span>
                              <span className="min-w-0 pr-2">
                                <span className="block text-sm font-semibold text-[var(--app-text)]">{option.label}</span>
                                <span className="mt-1 block text-xs text-[var(--app-text-muted)]">{option.sourceLabel}</span>
                              </span>
                            </span>
                            {field.value === option.value ? <CheckCircle2 className="absolute right-2 top-2 size-4 text-teal-500" aria-hidden /> : null}
                          </label>
                        );
                      })}
                    </div>
                    {errors.source ? <p role="alert" className="mt-2 text-xs text-danger-600">{errors.source.message}</p> : null}
                  </fieldset>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Set your target</CardTitle>
              <CardDescription>{sourceRules.guidance}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="rounded-lg bg-[var(--app-panel-muted)] p-3 text-sm text-[var(--app-text-muted)]">
                {isLocal ? "Required: country and a city/area or state/region. Radius applies to Google Maps." : "Required: country, category and service. State and city are optional; radius does not apply to this source."}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field id="country" label="Country (required)" error={errors.country?.message}>
                <Controller
                  control={control}
                  name="country"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(next) => {
                        field.onChange(next);
                        setValue("region", "", { shouldDirty: true, shouldValidate: true });
                        setValue("city", "", { shouldDirty: true, shouldValidate: true });
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
                label="State / Region (optional)"
                hint={regionOptions.length > 0 ? "Select an option for the chosen country." : "Enter a state or region."}
                error={errors.region?.message}
              >
                {regionOptions.length > 0 ? (
                  <Controller
                    control={control}
                    name="region"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(next) => {
                          field.onChange(next);
                          setValue("city", "", { shouldDirty: true, shouldValidate: true });
                        }}
                      >
                        <SelectTrigger id="region" aria-invalid={Boolean(errors.region)}>
                          <SelectValue placeholder="Select state or region" />
                        </SelectTrigger>
                        <SelectContent>
                          {regionOptions.map((region) => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <Input
                    id="region"
                    placeholder="Enter state or region"
                    aria-invalid={Boolean(errors.region)}
                    {...register("region")}
                  />
                )}
              </Field>

              <Field
                id="city"
                label={isLocal ? "City / Area (or state required)" : "City / Area (optional)"}
                hint={cityOptions.length > 0 ? "Choose a suggestion or type a specific area." : "Enter a city or area."}
                error={errors.city?.message}
              >
                <Input
                  id="city"
                  list={cityOptions.length > 0 ? "city-options" : undefined}
                  placeholder="Type a city/area, or leave empty for country-wide search"
                  aria-invalid={Boolean(errors.city)}
                  {...register("city")}
                />
                {cityOptions.length > 0 ? (
                  <datalist id="city-options">
                    {cityOptions.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                ) : null}
              </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="categories"
                label={isAgency ? "Agency category (required)" : "Business category (required)"}
                hint="Choose one or more categories. You can also type your own."
                error={errors.categories?.message}
              >
                <Controller
                  control={control}
                  name="categories"
                  render={({ field }) => (
                    <MultiSelect
                      id="categories"
                      options={categoryOptions}
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

              <Field
                id="service"
                label="Service to offer (required)"
                hint="A suitable service is selected automatically; change it only if needed."
                error={errors.service?.message}
              >
                <Controller
                  control={control}
                  name="service"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="service" aria-invalid={Boolean(errors.service)}>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceRules.services.map((service) => (
                          <SelectItem key={service} value={service}>
                            {service}
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
              <CardTitle>3. How many leads?</CardTitle>
              <CardDescription>Start with a small test batch.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                id="requestedLeadCount"
                label="Lead count (required)"
                hint="Between 1 and 1000 leads per request."
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

            </CardContent>
          </Card>

          <Card>
            <details open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden">
                <span>
                  <span className="block text-sm font-semibold text-[var(--app-text)]">Advanced options (optional)</span>
                  <span className="mt-0.5 block text-xs text-[var(--app-text-muted)]">
                    Quality score, contact requirements, exclusions and notes.
                  </span>
                </span>
                <Settings2 className="size-4 shrink-0 text-[var(--app-text-muted)]" aria-hidden />
              </summary>
              <CardContent className="space-y-5 border-t border-[var(--app-border)] pt-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {isLocal ? <Field
                    id="radiusKm"
                    label="Search radius (km) — Google Maps only"
                    hint="Local business search preference."
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
                  </Field> : null}

                  <Field
                    id="minimumScore"
                    label="Minimum quality score (optional)"
                    hint="0 applies no extra score cutoff. Higher scores can return fewer leads."
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
                      description="Require a public email address."
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
                      description="Require a phone number."
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

                <Field
                  id="excludedDomains"
                  label="Businesses or domains to exclude (optional)"
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
                  label="Additional instructions (optional)"
                  hint="Leave empty to use the selected source’s standard search rules. Up to 1000 characters."
                  error={errors.additionalInstructions?.message}
                >
                  <Textarea
                    id="additionalInstructions"
                    rows={4}
                    placeholder={instructionExamples[values.source]}
                    aria-invalid={Boolean(errors.additionalInstructions)}
                    {...register("additionalInstructions")}
                  />
                </Field>
              </CardContent>
            </details>
          </Card>
          {submitError ? <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
            <p>{submitError}</p>
            {savedRequestId ? <a className="mt-2 block underline" href={`/dashboard/requests/${savedRequestId}`}>View the saved request before submitting again</a> : null}
          </div> : null}
          <div className="space-y-2">
            <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full bg-teal-500 text-slate-950 hover:bg-teal-400 sm:w-auto sm:min-w-60">
              <Rocket aria-hidden /> Generate Leads
            </Button>
            <p className="text-xs text-[var(--app-text-muted)]">Emails are sent only after approval.</p>
          </div>
        </div>

        <div className="xl:col-span-1">
          <Card className="xl:sticky xl:top-20">
            <CardHeader>
              <CardTitle>Your search</CardTitle>
              <CardDescription>Check your selections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <dl className="divide-y divide-[var(--app-border)]">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex gap-3 py-2 first:pt-0">
                    <dt className="w-20 shrink-0 text-xs text-[var(--app-text-muted)]">{row.label}</dt>
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
                  <span>{Object.values(errors).map(error => typeof error?.message === "string" ? error.message : "Check the highlighted field.").join(" ")}</span>
                </div>
              ) : null}

              <p className="mt-4 border-t border-[var(--app-border)] pt-4 text-xs text-[var(--app-text-muted)]">
                Quality score: {values.minimumScore}+ · Contact required: {contactRequirements || "None"}
              </p>
            </CardContent>
          </Card>
          <p className="mt-4 text-center text-xs text-[var(--app-text-muted)]">Find leads → Verify → Score → Review</p>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!mutation.isPending) setConfirmOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start lead generation?</DialogTitle>
            <DialogDescription>
              Review your search before submitting. Track progress on the request details page.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <dl className="divide-y divide-[var(--app-border)] text-xs">
              {confirmationRows.map((row) => (
                <div key={row.label} className="flex gap-3 py-2 first:pt-0">
                  <dt className="w-36 shrink-0 text-[var(--app-text-muted)]">{row.label}</dt>
                  <dd className="min-w-0 flex-1 break-words font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" disabled={mutation.isPending} onClick={() => setConfirmOpen(false)}>
              Back to the form
            </Button>
            <Button
              loading={mutation.isPending}
              onClick={() => pendingValues && mutation.mutate(pendingValues)}
            >
              <Rocket aria-hidden />
              Generate Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
