"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import { computeSafestPath, DEFAULT_HEAT_ZONES, type LatLng } from "@/lib/safe-path";

const DELHI_CENTER: LatLng = { lat: 28.6139, lng: 77.209 };

function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

function MapClicks({ onPlace }: { onPlace: (ll: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPlace({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function SafeRouteMap({
  start,
  end,
  pickMode,
  onSetStart,
  onSetEnd,
}: {
  start: LatLng;
  end: LatLng;
  pickMode: "start" | "end";
  onSetStart: (ll: LatLng) => void;
  onSetEnd: (ll: LatLng) => void;
}) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const { path, isDirectSafe } = useMemo(
    () => computeSafestPath(start, end, DEFAULT_HEAT_ZONES),
    [start, end],
  );
  const directPath: LatLng[] = [start, end];

  return (
    <MapContainer
      center={[DELHI_CENTER.lat, DELHI_CENTER.lng]}
      zoom={13}
      className="h-[min(70vh,520px)] w-full rounded-xl z-0"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClicks onPlace={pickMode === "start" ? onSetStart : onSetEnd} />

      {DEFAULT_HEAT_ZONES.map((z) => (
        <Circle
          key={z.id}
          center={[z.lat, z.lng]}
          radius={z.radiusM}
          pathOptions={{
            color: "#dc2626",
            fillColor: "#ef4444",
            fillOpacity: 0.35,
            weight: 2,
          }}
        >
          <Popup>
            <span className="text-sm font-semibold">{z.label}</span>
            <p className="text-xs text-slate-600">High-incident heat zone (demo)</p>
          </Popup>
        </Circle>
      ))}

      {!isDirectSafe && (
        <Polyline
          positions={directPath.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#94a3b8", weight: 3, dashArray: "8 12" }}
        />
      )}

      <Polyline
        positions={path.map((p) => [p.lat, p.lng])}
        pathOptions={{ color: "#059669", weight: 5 }}
      />

      <Marker position={[start.lat, start.lng]}>
        <Popup>Start</Popup>
      </Marker>
      <Marker position={[end.lat, end.lng]}>
        <Popup>Destination</Popup>
      </Marker>
    </MapContainer>
  );
}
