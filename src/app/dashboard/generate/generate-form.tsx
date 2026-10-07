"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { BriefcaseBusiness, Building2, CheckCircle2, MapPin, Rocket, Search, Users } from "lucide-react";
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
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_CATEGORIES, COUNTRIES, DISCOVERY_SOURCE_RULES } from "@/lib/constants";
import type { DiscoverySourceValue } from "@/lib/constants";
import { getCities, getRegions } from "@/lib/locations";
import { leadSearchCriteriaSchema, type LeadSearchCriteriaOutput } from "@/lib/schemas";
import { errorMessage } from "@/hooks/use-lead-data";
import { leadService } from "@/services/lead-service";
import type { LeadSearchCriteria } from "@/types";

const DEFAULT_VALUES: LeadSearchCriteriaOutput = {
  source: "google_maps",
  country: "United States",
  region: "",
  city: "",
  radiusKm: 25,
  categories: [],
  service: DISCOVERY_SOURCE_RULES.google_maps.defaultService,
  leadType: DISCOVERY_SOURCE_RULES.google_maps.defaultLeadType,
  requestedLeadCount: 5,
  minimumScore: 0,
  requireEmail: false,
  requirePhone: false,
  requireDecisionMaker: false,
  excludedDomains: [],
  additionalInstructions: "",
};

const SOURCE_OPTIONS = [
  { value: "google_maps", label: "Local businesses", sourceLabel: "Google Maps", icon: MapPin },
  { value: "linkedin_public_search", label: "LinkedIn opportunities", sourceLabel: "Public LinkedIn", icon: Building2 },
  { value: "job_platform_public_search", label: "Client projects", sourceLabel: "Job platforms", icon: BriefcaseBusiness },
  { value: "agency_collaboration_public_search", label: "Agency partners", sourceLabel: "Agency listings", icon: Users },
  { value: "google_intent_public_search", label: "Buying intent", sourceLabel: "Google search", icon: Search },
] as const satisfies ReadonlyArray<{
  value: DiscoverySourceValue;
  label: string;
  sourceLabel: string;
  icon: typeof MapPin;
}>;

export function GenerateLeadsForm() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<LeadSearchCriteria | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<LeadSearchCriteriaOutput>({
    resolver: zodResolver(leadSearchCriteriaSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const values = useWatch({ control, defaultValue: DEFAULT_VALUES }) as LeadSearchCriteriaOutput;
  const regionOptions = getRegions(values.country);
  const cityOptions = getCities(values.country, values.region);
  const isAgency = values.source === "agency_collaboration_public_search";
  const categoryOptions = isAgency
    ? ["Digital Agencies", "Marketing Agencies", "Design Agencies", "Web Development Agencies", "SEO Agencies", "Creative Agencies"]
    : BUSINESS_CATEGORIES;

  const mutation = useMutation({
    mutationFn: (criteria: LeadSearchCriteria) => leadService.createRequest(criteria),
    onSuccess: (result) => {
      setConfirmOpen(false);
      if (result.dispatched) toast.success("Lead discovery started", { description: result.detail });
      else toast.warning("Request saved; discovery has not started", { description: result.detail });
      router.push(`/dashboard/requests/${result.request.id}`);
    },
    onError: (error) => {
      setConfirmOpen(false);
      toast.error("Lead discovery could not be started", { description: errorMessage(error) });
    },
  });

  const onSubmit = handleSubmit((formValues) => {
    if (mutation.isPending) return;
    setPendingValues(formValues);
    setConfirmOpen(true);
  });

  const selectedSource = SOURCE_OPTIONS.find((option) => option.value === values.source);
  const location = [values.city, values.region, values.country].filter(Boolean).join(", ");
  const summaryRows = [
    { label: "Source", value: selectedSource?.sourceLabel ?? "Not selected" },
    { label: "Area", value: location || "Not selected" },
    { label: "Business type", value: values.categories.join(", ") || "Not selected" },
    { label: "Leads", value: String(values.requestedLeadCount) },
  ];

  return (
    <>
      <PageHeader
        title="Generate Leads"
        description="Choose a source, target area and lead count. Every discovered business will be kept for human review."
      />

      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>1. Choose a source</CardTitle>
              <CardDescription>The selected discovery worker will collect public business records.</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <fieldset>
                    <legend className="sr-only">Choose a lead source</legend>
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
                                setValue("categories", option.value === "agency_collaboration_public_search" ? ["Digital Agencies"] : [], { shouldDirty: true });
                                setValue("leadType", rules.defaultLeadType, { shouldDirty: true });
                                setValue("service", rules.defaultService, { shouldDirty: true });
                              }}
                            />
                            <span className="flex min-h-24 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 transition-colors hover:bg-[var(--app-panel-muted)] peer-checked:border-teal-500 peer-checked:bg-teal-500/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-500">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--app-panel-muted)] text-[var(--app-text-muted)]">
                                <Icon className="size-5" aria-hidden />
                              </span>
                              <span>
                                <span className="block text-sm font-semibold">{option.label}</span>
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
              <CardTitle>2. Select the target area</CardTitle>
              <CardDescription>Choose the business type and the location to search.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field id="categories" label="Business type" error={errors.categories?.message}>
                <Controller
                  control={control}
                  name="categories"
                  render={({ field }) => (
                    <MultiSelect
                      id="categories"
                      options={categoryOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="For example: Dentists"
                      allowCustom
                      customLabel="Custom business type"
                      invalid={Boolean(errors.categories)}
                    />
                  )}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field id="country" label="Country" error={errors.country?.message}>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(next) => {
                          field.onChange(next);
                          setValue("region", "", { shouldDirty: true });
                          setValue("city", "", { shouldDirty: true });
                        }}
                      >
                        <SelectTrigger id="country"><SelectValue placeholder="Select country" /></SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                <Field id="region" label="State / Region" error={errors.region?.message}>
                  {regionOptions.length ? (
                    <Controller
                      control={control}
                      name="region"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={(next) => { field.onChange(next); setValue("city", "", { shouldDirty: true }); }}>
                          <SelectTrigger id="region"><SelectValue placeholder="Select state" /></SelectTrigger>
                          <SelectContent>
                            {regionOptions.map((region) => <SelectItem key={region} value={region}>{region}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : <Input id="region" placeholder="State or region" {...register("region")} />}
                </Field>

                <Field id="city" label="City / Area" error={errors.city?.message}>
                  <Input id="city" list={cityOptions.length ? "city-options" : undefined} placeholder="City or area" {...register("city")} />
                  {cityOptions.length ? <datalist id="city-options">{cityOptions.map((city) => <option key={city} value={city} />)}</datalist> : null}
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Choose the lead count</CardTitle>
              <CardDescription>All discovered records are shown, even when a phone, email or website is missing.</CardDescription>
            </CardHeader>
            <CardContent>
              <Field id="requestedLeadCount" label="Number of leads" hint="1 to 1000 leads per request." error={errors.requestedLeadCount?.message}>
                <Input id="requestedLeadCount" type="number" inputMode="numeric" min={1} max={1000} {...register("requestedLeadCount", { valueAsNumber: true })} />
              </Field>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full bg-teal-500 text-slate-950 hover:bg-teal-400 sm:w-auto sm:min-w-60">
            <Rocket aria-hidden /> Generate Leads
          </Button>
          <p className="text-xs text-[var(--app-text-muted)]">Discovery never sends email. Outreach begins only after your human review and approval.</p>
        </div>

        <div className="xl:col-span-1">
          <Card className="xl:sticky xl:top-20">
            <CardHeader>
              <CardTitle>Your search</CardTitle>
              <CardDescription>Simple discovery, followed by human review.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-[var(--app-border)]">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex gap-3 py-2 first:pt-0">
                    <dt className="w-24 shrink-0 text-xs text-[var(--app-text-muted)]">{row.label}</dt>
                    <dd className="min-w-0 flex-1 break-words text-xs font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 rounded-lg border border-teal-500/25 bg-teal-500/10 p-3 text-xs text-[var(--app-text-muted)]">
                The two strongest records will be marked Recommended. Every other discovered lead remains available in the table.
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!mutation.isPending) setConfirmOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start lead discovery?</DialogTitle>
            <DialogDescription>The results will stop at human review. Missing contact fields will not remove a business.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <dl className="divide-y divide-[var(--app-border)] text-xs">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex gap-3 py-2 first:pt-0">
                  <dt className="w-32 shrink-0 text-[var(--app-text-muted)]">{row.label}</dt>
                  <dd className="min-w-0 flex-1 break-words font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" disabled={mutation.isPending} onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button loading={mutation.isPending} onClick={() => pendingValues && mutation.mutate(pendingValues)}><Rocket aria-hidden />Start discovery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
