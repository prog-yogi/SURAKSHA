"use client";

import { useEffect } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

export interface ThreatCircleData {
  id: string;
  lat: number;
  lng: number;
  radiusM: number;
  label: string;
  zone: string;
}

interface Props {
  normalCoordinates: [number, number][];  // [lng, lat] OSRM format
  safeCoordinates: [number, number][];
  fromCoords: { lat: number; lng: number };
  toCoords: { lat: number; lng: number };
  fromPlace: string;
  toPlace: string;
  threatCircles?: ThreatCircleData[];
  isSameRoute?: boolean;
}

function zoneColor(zone: string) {
  if (zone === "RED") return { color: "#dc2626", fill: "#ef4444" };
  if (zone === "ORANGE") return { color: "#ea580c", fill: "#f97316" };
  return { color: "#ca8a04", fill: "#eab308" };
}

export default function OsrmRouteMap({
  normalCoordinates,
  safeCoordinates,
  fromCoords,
  toCoords,
  fromPlace,
  toPlace,
  threatCircles = [],
  isSameRoute = false,
}: Props) {
  useEffect(() => { fixLeafletIcons(); }, []);

  // OSRM returns [lng, lat] — Leaflet needs [lat, lng]
  const normalLatLngs: [number, number][] = normalCoordinates.map(([lng, lat]) => [lat, lng]);
  const safeLatLngs: [number, number][] = safeCoordinates.map(([lng, lat]) => [lat, lng]);

  const midLat = (fromCoords.lat + toCoords.lat) / 2;
  const midLng = (fromCoords.lng + toCoords.lng) / 2;
  const latDiff = Math.abs(fromCoords.lat - toCoords.lat);
  const lngDiff = Math.abs(fromCoords.lng - toCoords.lng);
  const span = Math.max(latDiff, lngDiff);
  const zoom = span > 15 ? 5 : span > 5 ? 7 : span > 2 ? 8 : 10;

  return (
    <MapContainer
      center={[midLat, midLng]}
      zoom={zoom}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Threat zone circles */}
      {threatCircles.map((t) => {
        const c = zoneColor(t.zone);
        return (
          <Circle
            key={t.id}
            center={[t.lat, t.lng]}
            radius={t.radiusM}
            pathOptions={{ color: c.color, fillColor: c.fill, fillOpacity: 0.3, weight: 2, dashArray: "6 4" }}
          >
            <Popup>
              <span className="font-semibold text-sm">⚠ {t.label}</span>
              <p className="text-xs text-slate-500 mt-0.5">Threat zone · {t.zone}</p>
            </Popup>
          </Circle>
        );
      })}

      {/* Normal route — orange dashed (only when different from safe) */}
      {!isSameRoute && normalLatLngs.length > 1 && (
        <Polyline
          positions={normalLatLngs}
          pathOptions={{ color: "#f59e0b", weight: 4, opacity: 0.8, dashArray: "10 8" }}
        />
      )}

      {/* Safe route — solid green */}
      {safeLatLngs.length > 1 && (
        <Polyline
          positions={safeLatLngs}
          pathOptions={{ color: "#10b981", weight: 5, opacity: 0.95 }}
        />
      )}

      {/* Source marker */}
      <Marker position={[fromCoords.lat, fromCoords.lng]} icon={blueIcon}>
        <Popup><span className="font-semibold">🔵 {fromPlace}</span></Popup>
      </Marker>

      {/* Destination marker */}
      <Marker position={[toCoords.lat, toCoords.lng]} icon={greenIcon}>
        <Popup><span className="font-semibold">🟢 {toPlace}</span></Popup>
      </Marker>
    </MapContainer>
  );
}
