"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function fixIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

// ── Hexagon vertices from center + radius (km) ─────────────────────────────
function hexagonLatLngs(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): [number, number][] {
  const latDeg = radiusKm / 111;
  const lngDeg = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    pts.push([
      centerLat + latDeg * Math.cos(angle),
      centerLng + lngDeg * Math.sin(angle),
    ]);
  }
  return pts;
}

// ── Zone colour palette ────────────────────────────────────────────────────
const ZONE_COLORS: Record<string, { stroke: string; fill: string; label: string }> = {
  GREEN:  { stroke: "#15803d", fill: "#22c55e", label: "Safe Zone"    },
  YELLOW: { stroke: "#a16207", fill: "#eab308", label: "Caution Zone" },
  ORANGE: { stroke: "#c2410c", fill: "#f97316", label: "Alert Zone"   },
  RED:    { stroke: "#b91c1c", fill: "#ef4444", label: "Danger Zone"  },
};

// ── User icon (pulsing blue dot) ───────────────────────────────────────────
function makeUserIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 22px; height: 22px;
      background: #1d4ed8;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 5px rgba(29,78,216,0.35);
      animation: pulse-user 1.8s ease-in-out infinite;
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// ── Zone label icon ────────────────────────────────────────────────────────
function makeZoneLabelIcon(label: string, score: number, fill: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background: ${fill};
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      letter-spacing: 0.03em;
    ">${label} · ${Math.round(score)}</div>`,
    iconSize: undefined,
    iconAnchor: undefined,
  });
}

// ── Fly to location on position change ────────────────────────────────────
function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { animate: true, duration: 1 });
  }, [lat, lng, map]);
  return null;
}

// ── Public types ───────────────────────────────────────────────────────────
export interface ThreatZoneData {
  id: string;
  lat: number;
  lng: number;
  location: string;
  score: number;
  zone: string;
  summary: string;
  expiresAt: string;
}

export interface GeoTrackingMapProps {
  lat: number;
  lng: number;
  accuracy?: number;
  threatZones?: ThreatZoneData[];
}

// ── Main component ─────────────────────────────────────────────────────────
export default function GeoTrackingMap({
  lat,
  lng,
  accuracy,
  threatZones = [],
}: GeoTrackingMapProps) {
  useEffect(() => { fixIcons(); }, []);

  return (
    <>
      <style>{`
        @keyframes pulse-user {
          0%,100% { box-shadow: 0 0 0 5px rgba(29,78,216,0.35); }
          50%      { box-shadow: 0 0 0 14px rgba(29,78,216,0); }
        }
      `}</style>

      <MapContainer
        center={[lat, lng]}
        zoom={14}
        className="h-full w-full rounded-xl z-0"
        scrollWheelZoom
      >
        {/* Satellite imagery */}
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        {/* Road & city labels */}
        <TileLayer
          attribution=""
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
          opacity={0.85}
        />

        <FlyToLocation lat={lat} lng={lng} />

        {/* ── Threat zone hexagons ── */}
        {threatZones.map((tz) => {
          const c = ZONE_COLORS[tz.zone] ?? ZONE_COLORS.GREEN;
          const hexPts = hexagonLatLngs(tz.lat, tz.lng, 0.55); // ~550m radius
          return (
            <Polygon
              key={tz.id}
              positions={hexPts}
              pathOptions={{
                color:       c.stroke,
                fillColor:   c.fill,
                fillOpacity: 0.28,
                weight:      2.5,
                dashArray:   tz.zone === "RED" ? undefined : "6 4",
              }}
            >
              {/* Floating label directly on the polygon */}
              <Tooltip
                permanent
                direction="center"
                offset={[0, 0]}
                opacity={1}
                className="zone-label-tooltip"
              >
                <span style={{
                  background: c.fill,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 11,
                  padding: "2px 10px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.04em",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  display: "inline-block",
                }}>
                  {c.label} · {Math.round(tz.score)}
                </span>
              </Tooltip>

              {/* Popup on click */}
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <span style={{
                    background: c.fill, color: "#fff",
                    borderRadius: 999, padding: "2px 12px",
                    fontWeight: 700, fontSize: 12, display: "inline-block",
                    marginBottom: 6,
                  }}>
                    {c.label} — {Math.round(tz.score)}/100
                  </span>
                  <p style={{ fontSize: 12, color: "#374151", margin: "0 0 4px" }}>{tz.summary}</p>
                  <p style={{ fontSize: 10, color: "#9ca3af" }}>{tz.location}</p>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Accuracy circle */}
        {accuracy && accuracy > 10 && (
          <Circle
            center={[lat, lng]}
            radius={accuracy}
            pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.12, weight: 1.5 }}
          />
        )}

        {/* User location marker */}
        <Marker position={[lat, lng]} icon={makeUserIcon()}>
          <Popup>
            <b>You are here</b><br />
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              {lat.toFixed(6)}, {lng.toFixed(6)}
              {accuracy && ` · ±${Math.round(accuracy)}m`}
            </span>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Remove default leaflet tooltip border/bg */}
      <style>{`
        .zone-label-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .zone-label-tooltip::before { display: none !important; }
      `}</style>
    </>
  );
}
