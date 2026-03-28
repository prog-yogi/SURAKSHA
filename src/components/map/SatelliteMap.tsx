"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon issue in Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function UpdateMapCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function SatelliteMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="h-full w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        />
        {/* Optional overlay labels for context */}
        <TileLayer
          url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        <Marker position={[lat, lng]}>
          <Popup>
            <div className="font-semibold text-slate-800">Your secure location pin</div>
            <div className="text-xs text-slate-500">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
          </Popup>
        </Marker>
        <UpdateMapCenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
