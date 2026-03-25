export type LatLng = { lat: number; lng: number };

export type HeatZone = {
  id: string;
  lat: number;
  lng: number;
  radiusM: number;
  label: string;
};

/** Demo heat zones near central Delhi (authorities flag high-incident areas). */
export const DEFAULT_HEAT_ZONES: HeatZone[] = [
  { id: "hz1", lat: 28.6152, lng: 77.2198, radiusM: 380, label: "Heat zone A" },
  { id: "hz2", lat: 28.6075, lng: 77.2345, radiusM: 320, label: "Heat zone B" },
  { id: "hz3", lat: 28.621, lng: 77.241, radiusM: 260, label: "Heat zone C" },
];

function metersPerDegree(lat: number) {
  const cos = Math.cos((lat * Math.PI) / 180);
  return { lat: 111_320, lng: 111_320 * Math.max(0.2, cos) };
}

function toLocalM(a: LatLng, p: LatLng) {
  const m = metersPerDegree(a.lat);
  return {
    x: (p.lng - a.lng) * m.lng,
    y: (p.lat - a.lat) * m.lat,
  };
}

function distM(a: LatLng, b: LatLng) {
  const { x: bx, y: by } = toLocalM(a, b);
  return Math.hypot(bx, by);
}

/** Closest point on segment AB to C; returns distance in meters and t in [0,1]. */
function pointToSegmentM(c: LatLng, a: LatLng, b: LatLng) {
  const B = toLocalM(a, b);
  const C = toLocalM(a, c);
  const abx = B.x,
    aby = B.y;
  const denom = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, (C.x * abx + C.y * aby) / denom));
  const px = t * abx,
    py = t * aby;
  return { dist: Math.hypot(C.x - px, C.y - py), t };
}

function segmentHitsZone(a: LatLng, b: LatLng, z: HeatZone) {
  const center = { lat: z.lat, lng: z.lng };
  if (distM(center, a) <= z.radiusM || distM(center, b) <= z.radiusM) return true;
  const { dist, t } = pointToSegmentM(center, a, b);
  return dist <= z.radiusM && t > 0 && t < 1;
}

export function pathIntersectsAnyZone(
  points: LatLng[],
  zones: HeatZone[],
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    for (const z of zones) {
      if (segmentHitsZone(a, b, z)) return true;
    }
  }
  return false;
}

function offsetPerpendicularM(mid: LatLng, from: LatLng, to: LatLng, distMeters: number, sign: 1 | -1): LatLng {
  const m = metersPerDegree(mid.lat);
  const { x: vx, y: vy } = toLocalM(from, to);
  const len = Math.hypot(vx, vy) || 1;
  const nx = (-vy / len) * sign * distMeters;
  const ny = (vx / len) * sign * distMeters;
  return {
    lat: mid.lat + ny / m.lat,
    lng: mid.lng + nx / m.lng,
  };
}

/**
 * If the straight line crosses a heat zone, try a single detour waypoint
 * perpendicular to the chord at the midpoint. Falls back to [start, end].
 */
export function computeSafestPath(
  start: LatLng,
  end: LatLng,
  zones: HeatZone[],
): { path: LatLng[]; isDirectSafe: boolean } {
  const direct: LatLng[] = [start, end];
  if (!pathIntersectsAnyZone(direct, zones)) {
    return { path: direct, isDirectSafe: true };
  }

  const mid: LatLng = {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2,
  };

  for (const meters of [150, 250, 400, 600, 900, 1200]) {
    for (const sign of [1, -1] as const) {
      const w = offsetPerpendicularM(mid, start, end, meters, sign);
      const p1: LatLng[] = [start, w, end];
      if (!pathIntersectsAnyZone(p1, zones)) {
        return { path: p1, isDirectSafe: false };
      }
    }
  }

  return { path: direct, isDirectSafe: false };
}

export function pathLengthM(points: LatLng[]) {
  let sum = 0;
  for (let i = 0; i < points.length - 1; i++) {
    sum += distM(points[i], points[i + 1]);
  }
  return sum;
}
