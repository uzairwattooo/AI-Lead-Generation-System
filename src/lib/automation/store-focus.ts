/** Public-evidence targeting for potential online-store support automation. */
export const ONLINE_STORE_CATEGORIES = [
  "Online stores & social sellers",
  "Fashion & clothing stores",
  "Beauty & skincare stores",
  "Electronics & accessories stores",
  "Home & furniture stores",
  "Jewellery & gift stores",
  "Online food & grocery stores",
  "Fitness & supplements stores",
] as const;

export function isOnlineStoreSearch(category: string): boolean {
  return /online|e[\s-]?commerce|social sell|\bstores?\b/i.test(category);
}

export function isStoreOpportunity(signals: readonly { label: string }[]): boolean {
  const labels = new Set(signals.map(signal => signal.label));
  return labels.has("Online sales enquiries") && [
    "WhatsApp contact channel", "Social contact channel", "Customer enquiry channel",
  ].some(label => labels.has(label));
}
