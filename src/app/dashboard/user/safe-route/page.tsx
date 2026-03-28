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
      <div className="flex flex-wrap items-start justify-between gap-4 p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 mb-8 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-500 tracking-widest drop-shadow-sm">SURAKSHA Geo-Sensing</p>
          <h1 className="mt-2 text-3xl font-bold text-emerald-950 dark:text-emerald-50">Safest path on map</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-800 dark:text-emerald-200/80">
            Red areas are authority-flagged heat zones (demo). The green line is a route that
            avoids crossing them when possible. Click the map to place the{" "}
            <span className="font-semibold text-emerald-900 dark:text-emerald-100">start</span> or{" "}
            <span className="font-semibold text-emerald-900 dark:text-emerald-100">destination</span> depending on the mode below.
          </p>
        </div>
        <Link
          href="/dashboard/user"
          className="rounded-xl border border-emerald-300 dark:border-emerald-700/50 bg-white dark:bg-[#0B0F19]/50 px-5 py-2.5 text-sm font-bold text-emerald-900 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-[#131B2B] shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setPickMode("start")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm ${
            pickMode === "start"
              ? "bg-blue-600 dark:bg-blue-500 text-white border border-transparent shadow-blue-500/30"
              : "border border-slate-300 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] text-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c2333]"
          }`}
        >
          Place start (click map)
        </button>
        <button
          type="button"
          onClick={() => setPickMode("end")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm ${
            pickMode === "end"
              ? "bg-violet-600 dark:bg-violet-500 text-white border border-transparent shadow-violet-500/30"
              : "border border-slate-300 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] text-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c2333]"
          }`}
        >
          Place destination (click map)
        </button>
        <button
          type="button"
          onClick={useGpsForStart}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-900 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm"
        >
          <Crosshair className="h-4 w-4" />
          Use GPS for start
        </button>
      </div>

      {gpsMsg && <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">{gpsMsg}</p>}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-300 dark:border-[#2A303C] shadow-md dark:shadow-none relative z-0">
        <SafeRouteMap
          start={start}
          end={end}
          pickMode={pickMode}
          onSetStart={setStart}
          onSetEnd={setEnd}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-6 rounded-2xl border border-slate-300 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-5 shadow-sm transition-all">
        <div className="flex items-center gap-3 text-slate-800 dark:text-slate-300">
          <MapPinned className="h-6 w-6 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
          <div>
            <p className="font-bold text-emerald-800 dark:text-emerald-400">Suggested safest route ≈ {lenM} m</p>
            {!isDirectSafe ? (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Gray dashed line shows the direct segment through risk areas; follow the solid green
                detour when heat zones are active.
              </p>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Direct path stays clear of all heat zones.</p>
            )}
          </div>
        </div>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
          {DEFAULT_HEAT_ZONES.map((z) => (
            <li key={z.id}>
              <span className="font-semibold text-red-600 dark:text-red-400">{z.label}</span> — ~{z.radiusM} m radius
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
