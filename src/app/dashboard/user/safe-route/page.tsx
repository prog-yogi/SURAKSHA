"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Navigation, Loader2, AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";

const OsrmRouteMap = dynamic(() => import("@/components/maps/OsrmRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#0a1a0f]">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  ),
});

// ── Types ──────────────────────────────────────────────────────────────────

type TransportMode = { label: string; speedKmh: number; multiplier: number };

const MODES: Record<string, TransportMode> = {
  bike:  { label: "Bike",  speedKmh: 55,  multiplier: 1.0 },
  car:   { label: "Car",   speedKmh: 65,  multiplier: 0.85 },
  bus:   { label: "Bus",   speedKmh: 45,  multiplier: 1.4  },
  train: { label: "Train", speedKmh: 100, multiplier: 0.6  },
};

interface ThreatCircle {
  id: string; lat: number; lng: number; radiusM: number; label: string; zone: string;
}

interface RouteInfo {
  distance: number;
  duration: number;
  avgSpeedKmh: number;
  coordinates: [number, number][];
  threatsCount?: number;
  threatsAvoided?: number;
  isSameAsNormal?: boolean;
}

interface RouteResult {
  fromCoords: { lat: number; lng: number };
  toCoords: { lat: number; lng: number };
  normalRoute: RouteInfo;
  safeRoute: RouteInfo;
  threatCircles: ThreatCircle[];
}

interface ActiveJourney {
  id: string; fromPlace: string; toPlace: string;
  fromLat: number; fromLng: number; toLat: number; toLng: number;
  distanceKm: number; mode: string; avgSpeedKmh: number;
  estimatedMinutes: number; bufferMinutes: number;
  deadlineAt: string; routeCoords: string; status: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function fmtKm(m: number) { return (m / 1000).toFixed(1) + " km"; }

function fmtCountdown(secs: number) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function arriveBy(mins: number) {
  const d = new Date(Date.now() + mins * 60_000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function modeMinutes(route: RouteInfo, modeKey: string): number {
  const m = MODES[modeKey];
  // OSRM duration is car-based. Adjust by speed ratio.
  const carSpeedKmh = route.avgSpeedKmh || 60;
  return Math.round((route.distance / 1000) / m.speedKmh * 60);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SafeRouteDashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [modeKey, setModeKey] = useState("bike");
  const [bufferMins, setBufferMins] = useState(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);

  // SOS guard
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [journeyStatus, setJourneyStatus] = useState<"idle" | "armed" | "done" | "alerted">("idle");
  const [deadlineAt, setDeadlineAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const alertFiredRef = useRef(false);

  const [profile, setProfile] = useState<{
    name?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  } | null>(null);

  // ── Fetch profile ──────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d?.user && setProfile(d.user))
      .catch(() => {});
  }, []);

  // ── Restore active journey on refresh ─────────────────────────────────

  useEffect(() => {
    fetch("/api/safe-route/active")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const j: ActiveJourney | null = d?.journey ?? null;
        if (!j) return;

        let coords: [number, number][] = [];
        try { coords = JSON.parse(j.routeCoords); } catch { coords = []; }

        setResult({
          fromCoords: { lat: j.fromLat, lng: j.fromLng },
          toCoords: { lat: j.toLat, lng: j.toLng },
          normalRoute: { distance: j.distanceKm * 1000, duration: 0, avgSpeedKmh: j.avgSpeedKmh, coordinates: coords, threatsCount: 0 },
          safeRoute: { distance: j.distanceKm * 1000, duration: 0, avgSpeedKmh: j.avgSpeedKmh, coordinates: coords, threatsAvoided: 0 },
          threatCircles: [],
        });
        setFrom(j.fromPlace);
        setTo(j.toPlace);
        setModeKey(j.mode);
        setBufferMins(j.bufferMinutes);
        setJourneyId(j.id);
        setJourneyStatus("armed");
        setDeadlineAt(new Date(j.deadlineAt));
        alertFiredRef.current = false;
      })
      .catch(() => {});
  }, []);

  // ── Countdown ──────────────────────────────────────────────────────────

  const fireAlert = useCallback(async (jId: string) => {
    if (alertFiredRef.current) return;
    alertFiredRef.current = true;
    setJourneyStatus("alerted");

    try {
      const res = await fetch("/api/safe-route/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journeyId: jId }),
      });
      const data = await res.json();
      if (data.emergencyContactPhone) {
        const phone = data.emergencyContactPhone.replace(/\D/g, "");
        const msg = encodeURIComponent(
          `🚨 SURAKSHA SOS: ${data.userName} has NOT reached "${to}" from "${from}" via ${MODES[modeKey]?.label}. Safe route timer EXPIRED. Please check immediately!`
        );
        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
      }
    } catch { /* best-effort */ }
  }, [from, to, modeKey]);

  useEffect(() => {
    if (!deadlineAt || journeyStatus !== "armed") return;
    const tick = () => {
      const secs = (deadlineAt.getTime() - Date.now()) / 1000;
      setSecondsLeft(Math.max(0, secs));
      if (secs <= 0 && journeyId && !alertFiredRef.current) fireAlert(journeyId);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt, journeyStatus, journeyId, fireAlert]);

  // ── Calculate route ────────────────────────────────────────────────────

  const handleCalculate = async () => {
    if (!from.trim() || !to.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setJourneyStatus("idle");
    setJourneyId(null);
    alertFiredRef.current = false;

    try {
      const res = await fetch("/api/safe-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: from.trim(), to: to.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Routing failed");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // ── Start journey ──────────────────────────────────────────────────────

  const handleStartJourney = async () => {
    if (!result) return;
    const safeMinutes = modeMinutes(result.safeRoute, modeKey);

    const res = await fetch("/api/safe-route/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromPlace: from, toPlace: to,
        fromLat: result.fromCoords.lat, fromLng: result.fromCoords.lng,
        toLat: result.toCoords.lat, toLng: result.toCoords.lng,
        distanceKm: parseFloat((result.safeRoute.distance / 1000).toFixed(2)),
        mode: modeKey,
        avgSpeedKmh: result.safeRoute.avgSpeedKmh,
        estimatedMinutes: safeMinutes,
        bufferMinutes: bufferMins,
        routeCoords: JSON.stringify(result.safeRoute.coordinates),
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.journeyId) { alert("Failed to start journey."); return; }

    const deadline = new Date(Date.now() + (safeMinutes + bufferMins) * 60_000);
    setJourneyId(data.journeyId);
    setDeadlineAt(deadline);
    setJourneyStatus("armed");
    alertFiredRef.current = false;
  };

  // ── Done ───────────────────────────────────────────────────────────────

  const handleDone = async () => {
    if (journeyId) {
      await fetch("/api/safe-route/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journeyId }),
      });
    }
    setJourneyStatus("done");
    setJourneyId(null);
    setDeadlineAt(null);
  };

  // ── Computed values ────────────────────────────────────────────────────

  const normalMins = result ? modeMinutes(result.normalRoute, modeKey) : 0;
  const safeMins = result ? modeMinutes(result.safeRoute, modeKey) : 0;
  const totalWindow = safeMins + bufferMins;

  const mode = MODES[modeKey];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-0">
      {/* ── Header card ─────────────────────────────────────────────── */}
      <div className="rounded-t-2xl bg-[#0a1a0f] border border-[#1a3a20] border-b-0 px-5 pt-5 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">SURAKSHA GEO-SENSING</p>
        <h1 className="text-xl font-bold text-white">Safe route + SOS guard</h1>
        <p className="text-xs text-emerald-300/70 mt-0.5">
          Dual route — normal vs threat-avoiding. Auto SOS fires if you don&apos;t reach destination in time.
        </p>
      </div>

      {/* ── Input form ──────────────────────────────────────────────── */}
      <div className="bg-[#0a1a0f] border border-[#1a3a20] border-t-0 border-b-0 px-5 py-4 space-y-3">
        {/* From / To */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">FROM</label>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCalculate()}
              placeholder="Dehradun"
              className="w-full rounded-lg border border-[#2a4a30] bg-[#0f2a15] px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">TO</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCalculate()}
              placeholder="Delhi"
              className="w-full rounded-lg border border-[#2a4a30] bg-[#0f2a15] px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Transport + Buffer + SOS Contact */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">TRANSPORT</label>
            <select
              value={modeKey}
              onChange={(e) => setModeKey(e.target.value)}
              className="w-full rounded-lg border border-[#2a4a30] bg-[#0f2a15] px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              {Object.entries(MODES).map(([k, m]) => (
                <option key={k} value={k}>{m.label} ({m.speedKmh} km/h)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">BUFFER TIME</label>
            <input
              type="number" min={5} max={120} value={bufferMins}
              onChange={(e) => setBufferMins(parseInt(e.target.value) || 30)}
              className="w-full rounded-lg border border-[#2a4a30] bg-[#0f2a15] px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">SOS CONTACT</label>
            <input
              readOnly
              value={profile?.emergencyContactPhone ?? ""}
              placeholder="+91 XXXXXXXXXX"
              className="w-full rounded-lg border border-[#2a4a30] bg-[#0f2a15] px-3 py-2 text-sm text-slate-300 focus:outline-none cursor-default"
            />
          </div>
        </div>

        {/* Calculate button */}
        <button
          onClick={handleCalculate}
          disabled={loading || !from.trim() || !to.trim()}
          className="w-full rounded-lg border border-[#2a6a30] bg-[#0f2a15] hover:bg-[#1a4a20] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 flex items-center justify-center gap-2 transition text-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 text-emerald-400" />}
          {loading ? "Calculating route…" : "Calculate safe route + arm SOS timer"}
        </button>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* ── Map ─────────────────────────────────────────────────────── */}
      {result && (
        <div className="border border-[#1a3a20] border-t-0 border-b-0 h-80 sm:h-96">
          <OsrmRouteMap
            normalCoordinates={result.normalRoute.coordinates}
            safeCoordinates={result.safeRoute.coordinates}
            fromCoords={result.fromCoords}
            toCoords={result.toCoords}
            fromPlace={from}
            toPlace={to}
            threatCircles={result.threatCircles}
            isSameRoute={result.safeRoute.isSameAsNormal}
          />
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────── */}
      {result && (
        <div className="bg-[#0a1a0f] border border-[#1a3a20] border-t-0 border-b-0 px-5 py-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 rounded-sm bg-amber-400 opacity-80" style={{borderTop:"2px dashed #f59e0b", background:"transparent"}} />
            <span className="inline-block w-5 h-0 border-t-2 border-dashed border-amber-400 opacity-80" />
            Normal route (through threats)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0 border-t-2 border-emerald-500" />
            Safe route (avoids threats)
          </span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500/60 border border-red-500" /> Threat zone</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400" /> Waypoint</span>
        </div>
      )}

      {/* ── Route comparison cards ───────────────────────────────────── */}
      {result && (
        <div className="bg-[#0a1a0f] border border-[#1a3a20] border-t-0 border-b-0 px-5 py-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {/* Normal route card */}
            <div className={`rounded-xl border p-4 space-y-1.5 ${
              result.normalRoute.threatsCount && result.normalRoute.threatsCount > 0
                ? "border-amber-500/30 bg-amber-950/30"
                : "border-emerald-500/30 bg-emerald-950/20"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${result.normalRoute.threatsCount && result.normalRoute.threatsCount > 0 ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <p className="text-sm font-bold text-white">Normal route</p>
                </div>
                {result.normalRoute.threatsCount && result.normalRoute.threatsCount > 0 ? (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-2 py-0.5 uppercase tracking-wide">Unsafe</span>
                ) : (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-2 py-0.5 uppercase tracking-wide">Safe</span>
                )}
              </div>
              <p className="text-xs text-slate-400">Distance: <span className="text-white font-semibold">{fmtKm(result.normalRoute.distance)}</span></p>
              <p className="text-xs text-slate-400">Est. time: <span className="text-white font-semibold">{fmtMins(normalMins)}</span></p>
              {result.normalRoute.threatsCount != null && result.normalRoute.threatsCount > 0 && (
                <p className="text-xs text-amber-400 font-semibold">Threats crossed: {result.normalRoute.threatsCount} zone{result.normalRoute.threatsCount > 1 ? "s" : ""}</p>
              )}
              <p className="text-xs text-slate-400">Arrive by: <span className="text-white font-semibold">{arriveBy(normalMins)}</span></p>
            </div>

            {/* Safe route card */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <p className="text-sm font-bold text-white">Safe route</p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-2 py-0.5 uppercase tracking-wide">Recommended</span>
              </div>
              <p className="text-xs text-slate-400">Distance: <span className="text-white font-semibold">{fmtKm(result.safeRoute.distance)}</span></p>
              <p className="text-xs text-slate-400">Est. time: <span className="text-white font-semibold">{fmtMins(safeMins)}</span></p>
              {result.safeRoute.threatsAvoided != null && result.safeRoute.threatsAvoided > 0 && (
                <p className="text-xs text-emerald-400 font-semibold">Threats avoided: {result.safeRoute.threatsAvoided} avoided</p>
              )}
              {result.safeRoute.isSameAsNormal && (
                <p className="text-xs text-slate-400 italic">No alternate path needed — direct route is safe</p>
              )}
              <p className="text-xs text-slate-400">Arrive by: <span className="text-white font-semibold">{arriveBy(safeMins)}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ── Auto SOS Guard ───────────────────────────────────────────── */}
      {result && journeyStatus === "idle" && (
        <div className="bg-[#1a0a0a] border border-[#3a1a1a] border-t-0 rounded-b-2xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Auto SOS guard</p>
              <p className="text-xs text-slate-400">SOS fires if not reached in {fmtMins(safeMins)} + {bufferMins} min buffer = {fmtMins(totalWindow)}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">YOUR NAME</label>
              <input
                readOnly value={profile?.name ?? ""}
                placeholder="Full name"
                className="w-full rounded-lg border border-[#3a1a1a] bg-[#0f0808] px-3 py-2 text-sm text-slate-300 focus:outline-none cursor-default"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">EMERGENCY CONTACT</label>
              <input
                readOnly value={profile?.emergencyContactPhone ?? ""}
                placeholder="+91 XXXXXXXXXX"
                className="w-full rounded-lg border border-[#3a1a1a] bg-[#0f0808] px-3 py-2 text-sm text-slate-300 focus:outline-none cursor-default"
              />
            </div>
          </div>

          <button
            onClick={handleStartJourney}
            className="w-full rounded-lg border border-[#3a1a1a] bg-[#0f0808] hover:bg-[#1f1010] text-white font-semibold py-2.5 flex items-center justify-center gap-2 transition text-sm"
          >
            <Shield className="h-4 w-4 text-red-400" />
            Arm SOS timer — starting journey
          </button>
        </div>
      )}

      {/* ── Armed: Countdown ─────────────────────────────────────────── */}
      {journeyStatus === "armed" && deadlineAt && (
        <div className="bg-[#1a0a0a] border border-[#3a1a1a] border-t-0 rounded-b-2xl px-5 py-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-400 animate-pulse" />
              <p className="text-sm font-bold text-white">SOS timer running</p>
            </div>
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-3 py-1 uppercase tracking-wide animate-pulse">
              ⚡ ARMED
            </span>
          </div>
          <div className="text-xs text-slate-400">
            <span className="text-white font-semibold">{from}</span>
            <span className="mx-2">→</span>
            <span className="text-white font-semibold">{to}</span>
            <span className="mx-2">·</span>
            {mode.label} · {result && fmtKm(result.safeRoute.distance)}
          </div>

          {/* Timer display */}
          <div className="rounded-lg border border-red-500/20 bg-red-950/20 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-0.5">SOS fires in</p>
              <p className="font-mono text-3xl font-bold text-white">{fmtCountdown(secondsLeft)}</p>
              <p className="text-[10px] text-slate-500 mt-1">Est. {fmtMins(safeMins)} + {bufferMins} min buffer · Total {fmtMins(totalWindow)}</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Deadline</p>
              <p className="text-white font-semibold">{deadlineAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>

          <button
            onClick={handleDone}
            className="w-full rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 flex items-center justify-center gap-2 transition text-sm"
          >
            <CheckCircle className="h-4 w-4" />
            ✅ Done — Reached Safely (removes journey)
          </button>
        </div>
      )}

      {/* ── Alert fired ──────────────────────────────────────────────── */}
      {journeyStatus === "alerted" && (
        <div className="bg-red-950/40 border border-red-500/40 border-t-0 rounded-b-2xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />
            <p className="text-sm font-bold text-red-400">🚨 SOS Alert Dispatched</p>
          </div>
          <p className="text-xs text-slate-400">Admin notified — WhatsApp SOS sent to emergency contact. If you're safe, clear this alert.</p>
          <button onClick={handleDone} className="w-full rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 text-sm transition">
            ✅ I&apos;m Safe — Clear Alert
          </button>
        </div>
      )}

      {/* ── Done  ────────────────────────────────────────────────────── */}
      {journeyStatus === "done" && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 border-t-0 rounded-b-2xl px-5 py-6 text-center space-y-3">
          <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
          <p className="text-lg font-bold text-white">Journey Complete — You&apos;re Safe! 🎉</p>
          <p className="text-sm text-slate-400">Journey record removed from database.</p>
          <button
            onClick={() => { setJourneyStatus("idle"); setResult(null); setFrom(""); setTo(""); }}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold px-6 py-2 text-sm hover:bg-emerald-500/20 transition"
          >
            Plan Another Route
          </button>
        </div>
      )}

      {/* Close bottom if no route yet */}
      {!result && (
        <div className="rounded-b-2xl bg-[#0a1a0f] border border-[#1a3a20] border-t-0 px-5 pb-5" />
      )}
    </div>
  );
}
