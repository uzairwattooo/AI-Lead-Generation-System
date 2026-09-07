import { z } from "zod";

const domainPattern = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/**
 * Validation for the Generate Leads form. The parsed output is the exact
 * payload posted to `POST /api/lead-requests`.
 */
export const leadSearchCriteriaSchema = z.object({
  country: z.string().min(1, "Select a target country"),
  region: z.string().max(120, "Region name is too long"),
  city: z.string().max(120, "City name is too long"),
  radiusKm: z
    .number({ error: "Enter a search radius" })
    .int("Use a whole number of kilometres")
    .min(1, "Radius must be at least 1 km")
    .max(500, "Radius cannot exceed 500 km"),
  categories: z
    .array(z.string().min(1))
    .min(1, "Select at least one business category")
    .max(8, "Select up to 8 categories"),
  service: z.string().min(1, "Select the service to offer"),
  leadType: z.string().min(1, "Select a lead type"),
  requestedLeadCount: z
    .number({ error: "Enter how many leads you need" })
    .int("Use a whole number")
    .min(1, "Request at least 1 lead")
    .max(1000, "Request at most 1000 leads per run"),
  minimumScore: z
    .number({ error: "Enter a minimum lead score" })
    .int("Use a whole number")
    .min(0, "Minimum score cannot be below 0")
    .max(100, "Minimum score cannot exceed 100"),
  requireEmail: z.boolean(),
  requirePhone: z.boolean(),
  requireDecisionMaker: z.boolean(),
  excludedDomains: z
    .array(z.string().regex(domainPattern, "Enter a valid domain, for example competitor.com"))
    .max(100, "Too many excluded domains"),
  additionalInstructions: z.string().max(1000, "Keep instructions under 1000 characters"),
});

export type LeadSearchCriteriaInput = z.input<typeof leadSearchCriteriaSchema>;
export type LeadSearchCriteriaOutput = z.output<typeof leadSearchCriteriaSchema>;

export const signInSchema = z.object({
  email: z.string().min(1, "Enter your email address").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const rejectionSchema = z.object({
  reason: z.string().min(1, "Select a rejection reason"),
  note: z.string().max(500, "Keep the note under 500 characters").optional(),
});
export type RejectionInput = z.infer<typeof rejectionSchema>;

export const workspaceSettingsSchema = z.object({
  autoApproveLeads: z.boolean(),
  minimumApprovalScore: z.number().int().min(0).max(100),
  requireEmailBeforeOutreach: z.boolean(),
  requireOutreachCopyApproval: z.boolean(),
  dailyOutreachLimit: z.number().int().min(1, "Send at least 1 email per day").max(2000),
  followUpCount: z.number().int().min(0).max(3),
  followUpIntervalDays: z.number().int().min(1).max(30),
  notifyOnNeedsReview: z.boolean(),
  senderName: z.string().min(1, "Enter the sender name").max(120),
  senderEmail: z.string().min(1, "Enter the sender email").email("Enter a valid email address"),
});
export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;

export const noteSchema = z.object({
  body: z.string().min(1, "Write a note before saving").max(1000),
});
export type NoteInput = z.infer<typeof noteSchema>;
