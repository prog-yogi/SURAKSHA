"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Crosshair, MapPinned } from "lucide-react";
import {
  computeSafestPath,
  DEFAULT_HEAT_ZONES,
  pathLengthM,
  type LatLng,
} from "@/lib/safe-path";

const SafeRouteMap = dynamic(() => import("@/components/maps/SafeRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(70vh,520px)] items-center justify-center rounded-xl bg-slate-100 text-slate-600">
      Loading map…
    </div>
  ),
});

const DEFAULT_START: LatLng = { lat: 28.6129, lng: 77.2295 };
const DEFAULT_END: LatLng = { lat: 28.6215, lng: 77.2165 };

export default function SafeRoutePage() {
  const [start, setStart] = useState<LatLng>(DEFAULT_START);
  const [end, setEnd] = useState<LatLng>(DEFAULT_END);
  const [pickMode, setPickMode] = useState<"start" | "end">("start");
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  const { path, isDirectSafe } = useMemo(
    () => computeSafestPath(start, end, DEFAULT_HEAT_ZONES),
    [start, end],
  );
  const lenM = Math.round(pathLengthM(path));

  function useGpsForStart() {
    setGpsMsg(null);
    if (!navigator.geolocation) {
      setGpsMsg("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setStart({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGpsMsg("Start set from your location.");
      },
      () => setGpsMsg("Could not read GPS — allow location or tap the map."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-rose-600">Heat zones</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Safest path on map</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Red areas are authority-flagged heat zones (demo). The green line is a route that
            avoids crossing them when possible. Click the map to place the{" "}
            <span className="font-semibold">start</span> or{" "}
            <span className="font-semibold">destination</span> depending on the mode below.
          </p>
        </div>
        <Link
          href="/dashboard/user"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickMode("start")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            pickMode === "start"
              ? "bg-blue-600 text-white"
              : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          Place start (click map)
        </button>
        <button
          type="button"
          onClick={() => setPickMode("end")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            pickMode === "end"
              ? "bg-violet-600 text-white"
              : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          Place destination (click map)
        </button>
        <button
          type="button"
          onClick={useGpsForStart}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
        >
          <Crosshair className="h-4 w-4" />
          Use GPS for start
        </button>
      </div>

      {gpsMsg && <p className="mt-2 text-sm text-slate-600">{gpsMsg}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <SafeRouteMap
          start={start}
          end={end}
          pickMode={pickMode}
          onSetStart={setStart}
          onSetEnd={setEnd}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-6 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <div className="flex items-center gap-2 text-slate-800">
          <MapPinned className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Suggested safest route ≈ {lenM} m</p>
            {!isDirectSafe ? (
              <p className="text-xs text-slate-600">
                Gray dashed line shows the direct segment through risk areas; follow the solid green
                detour when heat zones are active.
              </p>
            ) : (
              <p className="text-xs text-slate-600">Direct path stays clear of all heat zones.</p>
            )}
          </div>
        </div>
        <ul className="text-xs text-slate-600">
          {DEFAULT_HEAT_ZONES.map((z) => (
            <li key={z.id}>
              <span className="font-medium text-red-700">{z.label}</span> — ~{z.radiusM} m radius
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
