/**
 * Shipment pool clustering (Phase 5 §5.3) — pure functions.
 *
 * Clusters pending pool entries that are:
 *   - within `consolidationRadiusKm` of each other (straight-line, per backlog
 *     rule 10 — proximity checks only)
 *   - with overlapping time windows (entries without windows join freely)
 *   - with compatible vehicle requirements (rule from Phase 2 §2.3: entries
 *     with different explicit requiredVehicleClass never consolidate)
 *   - total cluster weight ≤ maxGroupWeightKg
 *
 * Greedy single-linkage: sort by origin proximity, seed a cluster, grow it
 * with every compatible neighbour, repeat on the remainder.
 */

export interface PoolEntryLike {
  shipmentId: string;
  status: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  packageWeightKg: number;
  requiredVehicleClass: string | null;
  windowEarliestAt: Date | null;
  windowLatestAt: Date | null;
}

export interface ClusterConstraints {
  consolidationRadiusKm: number;
  maxGroupWeightKg: number;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function windowsOverlap(
  a: PoolEntryLike,
  b: PoolEntryLike,
): boolean {
  // Entries without a requested window are always joinable.
  if (!a.windowEarliestAt || !a.windowLatestAt || !b.windowEarliestAt || !b.windowLatestAt) {
    return true;
  }
  return a.windowEarliestAt <= b.windowLatestAt && b.windowEarliestAt <= a.windowLatestAt;
}

export function vehicleClassesCompatible(a: PoolEntryLike, b: PoolEntryLike): boolean {
  if (!a.requiredVehicleClass || !b.requiredVehicleClass) return true;
  return a.requiredVehicleClass === b.requiredVehicleClass;
}

export function clusterPoolEntries(
  entries: PoolEntryLike[],
  constraints: ClusterConstraints,
): PoolEntryLike[][] {
  const remaining = [...entries];
  const clusters: PoolEntryLike[][] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift() as PoolEntryLike;
    const cluster: PoolEntryLike[] = [seed];
    let weight = seed.packageWeightKg;

    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      const candidate = remaining[i];
      const anchor = cluster[cluster.length - 1];
      const withinRadius =
        haversineKm(anchor.originLat, anchor.originLng, candidate.originLat, candidate.originLng) <=
        constraints.consolidationRadiusKm;
      if (
        withinRadius &&
        windowsOverlap(anchor, candidate) &&
        vehicleClassesCompatible(anchor, candidate) &&
        weight + candidate.packageWeightKg <= constraints.maxGroupWeightKg
      ) {
        cluster.push(candidate);
        weight += candidate.packageWeightKg;
        remaining.splice(i, 1);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}
