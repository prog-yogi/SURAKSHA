import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

// ── Types ──────────────────────────────────────────────────────────────────

interface LatLng { lat: number; lng: number }
interface ThreatCircle { id: string; lat: number; lng: number; radiusM: number; label: string; zone: string }

// ── Geometry helpers ────────────────────────────────────────────────────────

function metersPerDeg(lat: number) {
  const cos = Math.cos((lat * Math.PI) / 180);
  return { lat: 111_320, lng: 111_320 * Math.max(0.1, cos) };
}

function distM(a: LatLng, b: LatLng): number {
  const m = metersPerDeg((a.lat + b.lat) / 2);
  return Math.hypot((b.lat - a.lat) * m.lat, (b.lng - a.lng) * m.lng);
}

function segmentClosestDist(p: LatLng, a: LatLng, b: LatLng): number {
  const m = metersPerDeg(a.lat);
  const ax = (p.lng - a.lng) * m.lng, ay = (p.lat - a.lat) * m.lat;
  const bx = (b.lng - a.lng) * m.lng, by = (b.lat - a.lat) * m.lat;
  const denom = bx * bx + by * by || 1;
  const t = Math.max(0, Math.min(1, (ax * bx + ay * by) / denom));
  return Math.hypot(ax - t * bx, ay - t * by);
}

/** Returns threat circles that the given route path passes through */
function findThreatsOnRoute(coords: [number, number][], threats: ThreatCircle[]): ThreatCircle[] {
  const crossed: ThreatCircle[] = [];
  for (const threat of threats) {
    const center: LatLng = { lat: threat.lat, lng: threat.lng };
    let hit = false;
    for (let i = 0; i < coords.length - 1 && !hit; i++) {
      const a: LatLng = { lat: coords[i][1], lng: coords[i][0] };
      const b: LatLng = { lat: coords[i + 1][1], lng: coords[i + 1][0] };
      if (distM(center, a) < threat.radiusM || distM(center, b) < threat.radiusM) { hit = true; break; }
      if (segmentClosestDist(center, a, b) < threat.radiusM) hit = true;
    }
    if (hit) crossed.push(threat);
  }
  return crossed;
}

/** Compute a bypass waypoint perpendicular to the threat center from the midpoint of the route */
function bypassWaypoint(threatCenter: LatLng, routeMid: LatLng, clearanceM: number, sign: 1 | -1): LatLng {
  const m = metersPerDeg(routeMid.lat);
  // Direction vector from threat center to route midpoint
  const dx = (routeMid.lng - threatCenter.lng) * m.lng;
  const dy = (routeMid.lat - threatCenter.lat) * m.lat;
  const len = Math.hypot(dx, dy) || 1;
  // Scale to clearance distance and go perpendicular
  const perpX = (-dy / len) * clearanceM * sign;
  const perpY = (dx / len) * clearanceM * sign;
  return {
    lat: threatCenter.lat + perpY / m.lat,
    lng: threatCenter.lng + perpX / m.lng,
  };
}

// ── Geocode ──────────────────────────────────────────────────────────────

async function geocode(place: string): Promise<LatLng | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(place)}&format=json&limit=1&countrycodes=in`;
  const res = await fetch(url, { headers: { "User-Agent": "SURAKSHA-SafeRoute/1.0" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// ── OSRM route ────────────────────────────────────────────────────────────

async function osrmRoute(waypoints: LatLng[]): Promise<{ distance: number; duration: number; coordinates: [number, number][] } | null> {
  const coords = waypoints.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": "SURAKSHA-SafeRoute/1.0" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.routes?.length) return null;
  const r = data.routes[0];
  return {
    distance: r.distance,
    duration: r.duration,
    coordinates: r.geometry.coordinates,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: { from?: string; to?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.from || !body.to) {
    return NextResponse.json({ error: "Missing from or to" }, { status: 400 });
  }

  // 1. Geocode
  const [fromCoords, toCoords] = await Promise.all([geocode(body.from), geocode(body.to)]);
  if (!fromCoords) return NextResponse.json({ error: `Could not find: "${body.from}"` }, { status: 404 });
  if (!toCoords) return NextResponse.json({ error: `Could not find: "${body.to}"` }, { status: 404 });

  // 2. Load real threat zones from DB
  const now = new Date();
  const [geoFences, threatZones] = await Promise.all([
    prisma.geoFence.findMany({ where: { active: true, type: "circle" } }),
    prisma.threatZone.findMany({ where: { expiresAt: { gt: now }, status: "VERIFIED" } }),
  ]);

  // Merge into unified threat circles
  const threats: ThreatCircle[] = [
    ...geoFences
      .filter((f) => f.centerLat != null && f.centerLng != null && f.radius != null)
      .map((f) => ({
        id: f.id,
        lat: f.centerLat!,
        lng: f.centerLng!,
        radiusM: f.radius!,
        label: f.name,
        zone: f.zone,
      })),
    ...threatZones.map((t) => ({
      id: t.id,
      lat: t.lat,
      lng: t.lng,
      radiusM: t.score > 80 ? 1500 : t.score > 50 ? 900 : 500,
      label: t.location,
      zone: t.zone,
    })),
  ];

  // 3. Get NORMAL route (straight OSRM, no avoidance)
  const normalRoute = await osrmRoute([fromCoords, toCoords]);
  if (!normalRoute) {
    return NextResponse.json({ error: "No route found between these locations" }, { status: 404 });
  }

  // 4. Find which threats the normal route crosses
  const threatsOnNormal = findThreatsOnRoute(normalRoute.coordinates, threats);

  // 5. Build SAFE route with bypass waypoints around threats
  let safeRoute = normalRoute;
  let threatsAvoided: ThreatCircle[] = [];

  if (threatsOnNormal.length > 0) {
    // Build bypass waypoints for each cluster of threats
    // Strategy: for each threat zone, add a waypoint that goes around it
    const midPoint: LatLng = {
      lat: (fromCoords.lat + toCoords.lat) / 2,
      lng: (fromCoords.lng + toCoords.lng) / 2,
    };

    const bypassWaypoints: LatLng[] = [];
    const processedThreats = new Set<string>();

    for (const threat of threatsOnNormal) {
      if (processedThreats.has(threat.id)) continue;
      processedThreats.add(threat.id);

      const clearance = threat.radiusM * 2.5 + 500; // extra buffer beyond threat radius
      // Try both sides (sign +1 and -1), pick the one closer to midpoint
      const threatCenter: LatLng = { lat: threat.lat, lng: threat.lng };
      const wpA = bypassWaypoint(threatCenter, midPoint, clearance, 1);
      const wpB = bypassWaypoint(threatCenter, midPoint, clearance, -1);
      // Pick waypoint farther from threat cluster center (safer side)
      const distA = distM(wpA, { lat: toCoords.lat, lng: toCoords.lng });
      const distB = distM(wpB, { lat: toCoords.lat, lng: toCoords.lng });
      bypassWaypoints.push(distA < distB ? wpA : wpB);
    }

    // Sort bypass waypoints by distance from source
    bypassWaypoints.sort((a, b) => distM(fromCoords, a) - distM(fromCoords, b));

    // Try different waypoint combos to find a clean safe route
    const safeWaypoints = [fromCoords, ...bypassWaypoints, toCoords];
    const candidate = await osrmRoute(safeWaypoints);

    if (candidate) {
      const remainingThreats = findThreatsOnRoute(candidate.coordinates, threats);
      // Accept if it avoids at least some threats
      if (remainingThreats.length < threatsOnNormal.length) {
        safeRoute = candidate;
        threatsAvoided = threatsOnNormal.filter(
          (t) => !remainingThreats.find((r) => r.id === t.id)
        );
      }
    }
  }

  const normalSpeedKmh = parseFloat(((normalRoute.distance / 1000) / (normalRoute.duration / 3600)).toFixed(1));

  return NextResponse.json({
    fromCoords,
    toCoords,
    // Normal route (may pass through threats)
    normalRoute: {
      distance: normalRoute.distance,
      duration: normalRoute.duration,
      avgSpeedKmh: normalSpeedKmh,
      coordinates: normalRoute.coordinates,
      threatsCount: threatsOnNormal.length,
    },
    // Safe route (avoids threats via waypoints)
    safeRoute: {
      distance: safeRoute.distance,
      duration: safeRoute.duration,
      avgSpeedKmh: parseFloat(((safeRoute.distance / 1000) / (safeRoute.duration / 3600)).toFixed(1)),
      coordinates: safeRoute.coordinates,
      threatsAvoided: threatsAvoided.length,
      isSameAsNormal: safeRoute === normalRoute,
    },
    // Threat zones for map display (all loaded, not just crossed)
    threatCircles: threats.map((t) => ({
      id: t.id,
      lat: t.lat,
      lng: t.lng,
      radiusM: t.radiusM,
      label: t.label,
      zone: t.zone,
    })),
  });
}
