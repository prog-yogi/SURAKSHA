"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, Crosshair, Loader2, MapPin, WifiOff, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ThreatZoneData } from "@/components/maps/GeoTrackingMap";

const GeoTrackingMap = dynamic(() => import("@/components/maps/GeoTrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 rounded-xl">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  ),
});

interface Position { lat: number; lng: number; accuracy: number }
interface ThreatInfo { score: number; zone: string; location: string; summary: string }

const ZONE_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  GREEN:  { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300",  label: "Safe Zone" },
  YELLOW: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", label: "Caution Zone" },
  ORANGE: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", label: "Warning Zone" },
  RED:    { bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    label: "Danger Zone" },
};

const UPDATE_INTERVAL_MS = 2 * 60 * 1000;

export default function GeoPage() {
  const [position, setPosition]       = useState<Position | null>(null);
  const [tracking, setTracking]       = useState(false);
  const [status, setStatus]           = useState<"idle"|"locating"|"active"|"error">("idle");
  const [msg, setMsg]                 = useState<string | null>(null);
  const [lastSync, setLastSync]       = useState<Date | null>(null);
  const [syncStatus, setSyncStatus]   = useState<"ok"|"fail"|"syncing"|null>(null);
  const [threat, setThreat]           = useState<ThreatInfo | null>(null);
  const [threatLoading, setThreatLoading] = useState(false);
  const [threatZones, setThreatZones] = useState<ThreatZoneData[]>([]);

  const watchIdRef   = useRef<number | null>(null);
  const latestPosRef = useRef<Position | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch existing threat zones for the map
  useEffect(() => {
    fetch("/api/threat-zones")
      .then(r => r.json())
      .then(d => d.zones && setThreatZones(d.zones))
      .catch(() => {});
  }, []);

  // Save user location to DB
  const saveLocation = useCallback(async (pos: Position) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/user-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy }),
      });
      if (res.ok) { setLastSync(new Date()); setSyncStatus("ok"); }
      else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error === "Tourist login required" ? "Log in as a tourist to sync." : d.error ?? "Sync failed");
        setSyncStatus("fail");
      }
    } catch { setSyncStatus("fail"); }
  }, []);

  // Fetch threat score for current position
  const fetchThreat = useCallback(async (pos: Position) => {
    setThreatLoading(true);
    try {
      const res = await fetch("/api/threat-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pos.lat, lng: pos.lng }),
      });
      if (res.ok) {
        const d = await res.json();
        setThreat({ score: d.score, zone: d.zone, location: d.location, summary: d.summary });
        // Refresh zones on map
        fetch("/api/threat-zones")
          .then(r => r.json())
          .then(d => d.zones && setThreatZones(d.zones))
          .catch(() => {});
      }
    } catch { /* silent */ } finally { setThreatLoading(false); }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setMsg("Geolocation not supported."); setStatus("error"); return; }
    setStatus("locating"); setMsg(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (geoPos) => {
        const pos: Position = {
          lat: geoPos.coords.latitude,
          lng: geoPos.coords.longitude,
          accuracy: geoPos.coords.accuracy,
        };
        setPosition(pos);
        latestPosRef.current = pos;
        setStatus("active");
        setTracking(true);

        if (!intervalRef.current) {
          saveLocation(pos);
          fetchThreat(pos);
        }
      },
      (err) => {
        setMsg(err.code === 1 ? "Location permission denied." : "Could not determine location.");
        setStatus("error"); setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );

    intervalRef.current = setInterval(() => {
      if (latestPosRef.current) saveLocation(latestPosRef.current);
    }, UPDATE_INTERVAL_MS);
  }, [saveLocation, fetchThreat]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setTracking(false); setStatus("idle");
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const zoneStyle = threat ? (ZONE_STYLE[threat.zone] ?? ZONE_STYLE.GREEN) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      {/* Header */}
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-emerald-600">Live Location Tracking</p>
      <h1 className="mt-2 text-center text-3xl font-bold text-slate-900">Geo-Fencing &amp; Real-Time Map</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-500">
        Your GPS position is tracked live. AI analyses nearby threats every 6 hours and classifies your zone.
      </p>

      {/* Threat badge */}
      {threat && zoneStyle && (
        <div className={`mt-5 mx-auto max-w-2xl rounded-xl border px-4 py-3 ${zoneStyle.bg} ${zoneStyle.border}`}>
          <div className="flex items-center gap-2">
            {threat.zone === "GREEN" ? <ShieldCheck className="h-5 w-5 text-green-700" /> : <ShieldAlert className="h-5 w-5 text-red-600" />}
            <span className={`font-bold text-sm ${zoneStyle.text}`}>{zoneStyle.label} — Score {Math.round(threat.score)}/100</span>
            <span className={`ml-auto text-xs font-medium ${zoneStyle.text}`}>{threat.location.split(",")[0]}</span>
          </div>
          <p className={`mt-1 text-xs ${zoneStyle.text} opacity-80`}>{threat.summary}</p>
        </div>
      )}
      {threatLoading && (
        <p className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Analysing area threats…
        </p>
      )}

      {/* Map card */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Live Tourist Location Tracking
            {status === "active" && (
              <span className="animate-pulse rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">● Live</span>
            )}
          </div>
          <div className="flex gap-2">
            {!tracking ? (
              <button
                onClick={startTracking}
                disabled={status === "locating"}
                className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {status === "locating" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crosshair className="h-3 w-3" />}
                {status === "locating" ? "Locating…" : "Enable GPS"}
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-red-600 transition"
              >
                <WifiOff className="h-3 w-3" /> Stop Tracking
              </button>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[460px] w-full">
          {position ? (
            <GeoTrackingMap lat={position.lat} lng={position.lng} accuracy={position.accuracy} threatZones={threatZones} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-50 via-sky-50 to-indigo-100">
              <MapPin className="h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">
                {status === "locating" ? "Acquiring GPS signal…" : "Enable GPS to see your live location on the satellite map"}
              </p>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
          {position ? (
            <span className="font-mono">{position.lat.toFixed(6)}, {position.lng.toFixed(6)} · ±{Math.round(position.accuracy)} m</span>
          ) : (
            <span>{msg ?? "Waiting for GPS…"}</span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {syncStatus === "syncing" && <><Loader2 className="h-3 w-3 animate-spin text-blue-500" /> Syncing…</>}
            {syncStatus === "ok" && lastSync && <><CheckCircle className="h-3 w-3 text-emerald-500" /> Saved {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · updates every 2 min</>}
            {syncStatus === "fail" && <span className="text-red-500">{msg ?? "Sync failed"}</span>}
          </div>
        </div>
      </div>

      {/* Zone legend */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { zone: "GREEN",  label: "Safe",    range: "0–30",   color: "bg-green-500" },
          { zone: "YELLOW", label: "Caution", range: "31–50",  color: "bg-yellow-400" },
          { zone: "ORANGE", label: "Warning", range: "51–70",  color: "bg-orange-500" },
          { zone: "RED",    label: "Danger",  range: "71–100", color: "bg-red-500" },
        ].map(z => (
          <div key={z.zone} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <span className={`h-3 w-3 rounded-full ${z.color} shrink-0`} />
            <div>
              <p className="text-xs font-bold text-slate-800">{z.label}</p>
              <p className="text-[10px] text-slate-400">Score {z.range}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
