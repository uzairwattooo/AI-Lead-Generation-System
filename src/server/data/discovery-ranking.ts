export interface DiscoveryContactRecord {
  id: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  sourceLinks: readonly unknown[];
  discoveredAt: string;
}

export function discoveryContactCoverage(record: DiscoveryContactRecord): number {
  return (record.email ? 4 : 0)
    + (record.website ? 3 : 0)
    + (record.phone ? 2 : 0)
    + (record.sourceLinks.length ? 1 : 0);
}

/**
 * Marks, but never removes, the strongest records in one discovery request.
 */
export function recommendedDiscoveryIds<T extends DiscoveryContactRecord>(
  records: readonly T[],
  limit = 2,
): Map<string, number> {
  const ranked = [...records].sort(
    (a, b) =>
      discoveryContactCoverage(b) - discoveryContactCoverage(a)
      || Date.parse(a.discoveredAt) - Date.parse(b.discoveredAt)
      || a.id.localeCompare(b.id),
  );
  return new Map(ranked.slice(0, Math.max(0, limit)).map((record, index) => [record.id, index + 1]));
}
