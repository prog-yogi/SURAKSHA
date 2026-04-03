"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Navigation, Loader2, MapPin, Search, Shield, CheckCircle,
  AlertTriangle, Clock, Phone, User, Bike, Car, Bus, Train,
} from "lucide-react";

const OsrmRouteMap = dynamic(() => import("@/components/maps/OsrmRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#0B0F19]">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  ),
});

// ── Types ──────────────────────────────────────────────────────────────────

type TransportMode = "bike" | "car" | "bus" | "train";

interface RouteData {
  distance: number;  // meters
  duration: number;  // seconds (car base)
  avgSpeedKmh: number;
  coordinates: [number, number][];
  fromCoords: { lat: number; lng: number };
  toCoords: { lat: number; lng: number };
}

interface ActiveJourney {
  id: string;
  fromPlace: string;
  toPlace: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  distanceKm: number;
  mode: string;
  avgSpeedKmh: number;
  estimatedMinutes: number;
  bufferMinutes: number;
  etaAt: string;
  deadlineAt: string;
  routeCoords: string;
  status: string;
  startedAt: string;
}

// ── Mode config ────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<TransportMode, { label: string; multiplier: number; icon: React.ReactNode; color: string }> = {
  bike:  { label: "Bike",  multiplier: 1.85, icon: <Bike  className="h-5 w-5" />, color: "text-amber-400"  },
  car:   { label: "Car",   multiplier: 1.0,  icon: <Car   className="h-5 w-5" />, color: "text-sky-400"    },
  bus:   { label: "Bus",   multiplier: 1.40, icon: <Bus   className="h-5 w-5" />, color: "text-violet-400" },
  train: { label: "Train", multiplier: 0.60, icon: <Train className="h-5 w-5" />, color: "text-emerald-400" },
};

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatCountdown(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function arrivalTime(estimatedMins: number): string {
  const t = new Date(Date.now() + estimatedMins * 60_000);
  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SafeRoutePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState<TransportMode>("car");
  const [bufferMins, setBufferMins] = useState(30);

  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);

  // Journey / SOS guard state
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [journeyStatus, setJourneyStatus] = useState<"idle" | "active" | "done" | "alerted">("idle");
  const [deadlineAt, setDeadlineAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [alertSent, setAlertSent] = useState(false);
  const alertFiredRef = useRef(false);

  // Profile
  const [profile, setProfile] = useState<{
    name?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
  } | null>(null);

  // ── Fetch profile once ───────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d?.user ? setProfile(d.user) : null)
      .catch(() => {});
  }, []);

  // ── On page load: restore any active journey from DB ─────────────────────
  // This is the key: even after refresh, if there's an ACTIVE journey it's restored

  useEffect(() => {
    fetch("/api/safe-route/active")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const j: ActiveJourney | null = d?.journey ?? null;
        if (!j) return;

        // Restore route data from stored coords
        let coords: [number, number][] = [];
        try { coords = JSON.parse(j.routeCoords); } catch { coords = []; }

        setRouteData({
          distance: j.distanceKm * 1000,
          duration: (j.estimatedMinutes / MODE_CONFIG[j.mode as TransportMode].multiplier) * 60,
          avgSpeedKmh: j.avgSpeedKmh,
          coordinates: coords,
          fromCoords: { lat: j.fromLat, lng: j.fromLng },
          toCoords: { lat: j.toLat, lng: j.toLng },
        });

        setFrom(j.fromPlace);
        setTo(j.toPlace);
        setMode(j.mode as TransportMode);
        setBufferMins(j.bufferMinutes);
        setJourneyId(j.id);
        setJourneyStatus("active");
        setDeadlineAt(new Date(j.deadlineAt));
        alertFiredRef.current = false;
      })
      .catch(() => {});
  }, []);

  // ── Countdown timer ───────────────────────────────────────────────────────

  const fireAlert = useCallback(async (jId: string) => {
    if (alertFiredRef.current) return;
    alertFiredRef.current = true;
    setAlertSent(true);
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
          `🚨 SOS ALERT: ${data.userName ?? "A tourist"} has NOT reached "${data.toPlace ?? to}" from "${data.fromPlace ?? from}" via ${data.mode ?? mode}. ` +
          `The safe route timer has EXPIRED. Please check on them immediately!`
        );
        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
      }
    } catch {
      // Best-effort
    }
  }, [from, to, mode]);

  useEffect(() => {
    if (!deadlineAt || journeyStatus !== "active") return;

    const tick = () => {
      const secs = (deadlineAt.getTime() - Date.now()) / 1000;
      setSecondsLeft(Math.max(0, secs));
      if (secs <= 0 && journeyId && !alertFiredRef.current) {
        fireAlert(journeyId);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt, journeyStatus, journeyId, fireAlert]);

  // ── Find route ────────────────────────────────────────────────────────────

  const handleFindRoute = async () => {
    if (!from.trim() || !to.trim()) return;
    setLoading(true);
    setRouteError(null);
    setRouteData(null);
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
      setRouteData(data);
    } catch (e: unknown) {
      setRouteError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // ── Computed times ────────────────────────────────────────────────────────

  function getModeMinutes(m: TransportMode): number {
    if (!routeData) return 0;
    return Math.round((routeData.duration * MODE_CONFIG[m].multiplier) / 60);
  }

  const selectedMins = getModeMinutes(mode);
  const distKm = routeData ? (routeData.distance / 1000).toFixed(1) : null;

  // ── Start journey ─────────────────────────────────────────────────────────

  const handleStartJourney = async () => {
    if (!routeData) return;

    const res = await fetch("/api/safe-route/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromPlace: from,
        toPlace: to,
        fromLat: routeData.fromCoords.lat,
        fromLng: routeData.fromCoords.lng,
        toLat: routeData.toCoords.lat,
        toLng: routeData.toCoords.lng,
        distanceKm: parseFloat((routeData.distance / 1000).toFixed(2)),
        mode,
        avgSpeedKmh: routeData.avgSpeedKmh,
        estimatedMinutes: selectedMins,
        bufferMinutes: bufferMins,
        routeCoords: JSON.stringify(routeData.coordinates),
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.journeyId) {
      alert("Failed to start journey. Please try again.");
      return;
    }

    const now = Date.now();
    const deadline = new Date(now + (selectedMins + bufferMins) * 60_000);
    setJourneyId(data.journeyId);
    setDeadlineAt(deadline);
    setJourneyStatus("active");
    alertFiredRef.current = false;
    setAlertSent(false);
  };

  // ── Done safely ───────────────────────────────────────────────────────────

  const handleDone = async () => {
    if (!journeyId) {
      setJourneyStatus("done");
      return;
    }

    await fetch("/api/safe-route/done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journeyId }),
    });

    setJourneyStatus("done");
    setJourneyId(null);
    setDeadlineAt(null);
  };

  // ── UI ─────────────────────────────────────────────────────────────────────

  const statusBadge = () => {
    if (journeyStatus === "idle") return null;
    if (journeyStatus === "done") return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <CheckCircle className="h-3.5 w-3.5" /> JOURNEY COMPLETE
      </span>
    );
    if (journeyStatus === "alerted") return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
        <AlertTriangle className="h-3.5 w-3.5" /> ALERT SENT
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
        <Shield className="h-3.5 w-3.5" /> ACTIVE — SOS ARMED
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#2A303C] bg-[#0B0F19]/95 backdrop-blur px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-emerald-500" />
          <h1 className="font-bold text-white">
            SURAKSHA <span className="text-slate-400">Safe Route</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {statusBadge()}
          <Link
            href="/geo"
            className="text-sm font-medium text-slate-400 hover:text-white transition"
          >
            ← Geo-Sensing
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        {/* ── Input Panel ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#2A303C] bg-[#131B2B] p-5 shadow-lg">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-500 mb-1">SURAKSHA GEO-SENSING</p>
          <h2 className="text-2xl font-bold text-white mb-1">Safe route planner</h2>
          <p className="text-sm text-slate-400 mb-5">Enter source and destination — we suggest the safest route and estimated travel time by mode.</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">FROM</label>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFindRoute()}
                placeholder="e.g. Dehradun"
                className="w-full rounded-xl border border-[#2A303C] bg-[#0B0F19] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">TO</label>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFindRoute()}
                placeholder="e.g. Delhi"
                className="w-full rounded-xl border border-[#2A303C] bg-[#0B0F19] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Mode selector */}
          <div className="mb-5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">MODE OF TRANSPORT</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(MODE_CONFIG) as [TransportMode, typeof MODE_CONFIG[TransportMode]][]).map(([m, cfg]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-bold transition ${
                    mode === m
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-[#2A303C] bg-[#0B0F19] text-slate-400 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleFindRoute}
            disabled={loading || !from.trim() || !to.trim()}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Finding route…" : "Find safest route & time"}
          </button>

          {routeError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {routeError}
            </div>
          )}
        </div>

        {/* ── Map ─────────────────────────────────────────────────────── */}
        {routeData && (
          <div className="rounded-2xl border border-[#2A303C] overflow-hidden h-72 sm:h-96 shadow-lg">
            <OsrmRouteMap
              coordinates={routeData.coordinates}
              fromCoords={routeData.fromCoords}
              toCoords={routeData.toCoords}
              fromPlace={from}
              toPlace={to}
            />
          </div>
        )}

        {/* ── Route Info + Time Cards ──────────────────────────────────── */}
        {routeData && (
          <div className="rounded-2xl border border-[#2A303C] bg-[#131B2B] p-5 shadow-lg space-y-4">
            {/* Route header */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 shrink-0">
                <MapPin className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">{from} → {to}</p>
                <p className="text-sm text-slate-400">
                  {distKm} km via real road · Avg speed {routeData.avgSpeedKmh} km/h
                </p>
              </div>
            </div>

            {/* 4 mode cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.entries(MODE_CONFIG) as [TransportMode, typeof MODE_CONFIG[TransportMode]][]).map(([m, cfg]) => {
                const mins = getModeMinutes(m);
                const isSelected = m === mode;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-[#2A303C] bg-[#0B0F19] hover:border-slate-500"
                    }`}
                  >
                    <div className={`mb-1 ${cfg.color}`}>{cfg.icon}</div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{cfg.label}</p>
                    <p className="text-lg font-bold text-white mt-0.5">{formatMinutes(mins)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{distKm} km</p>
                  </button>
                );
              })}
            </div>

            {/* Selected mode estimate */}
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estimated time ({MODE_CONFIG[mode].label.toLowerCase()})</p>
                <p className="text-2xl font-bold text-white mt-0.5">{formatMinutes(selectedMins)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">~ {distKm} km</p>
                <p className="text-sm text-slate-300 mt-0.5">Depart now — arrive by ~{arrivalTime(selectedMins)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── SOS Guard Panel ──────────────────────────────────────────── */}
        {routeData && journeyStatus === "idle" && (
          <div className="rounded-2xl border border-[#2A303C] bg-[#131B2B] p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              <h3 className="font-bold text-white">Safe Route + SOS Guard</h3>
              <span className="text-xs text-slate-400">· Auto-fires if you don't arrive in time</span>
            </div>

            {/* Buffer time */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">BUFFER TIME (minutes)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={bufferMins}
                onChange={(e) => setBufferMins(parseInt(e.target.value) || 30)}
                className="w-full sm:w-32 rounded-xl border border-[#2A303C] bg-[#0B0F19] px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
              <p className="text-xs text-slate-500 mt-1">SOS fires if you don&apos;t arrive within {formatMinutes(selectedMins)} + {bufferMins} min buffer = {formatMinutes(selectedMins + bufferMins)} total</p>
            </div>

            {/* Emergency contact */}
            {profile && (
              <div className="rounded-xl border border-[#2A303C] bg-[#0B0F19] p-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Emergency Contact (from your profile)</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                    <User className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{profile.emergencyContactName ?? "—"}</p>
                    <p className="text-xs text-slate-400">{profile.emergencyContactRelation ?? ""}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-sm text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    {profile.emergencyContactPhone ?? "Not set"}
                  </div>
                </div>
                {!profile.emergencyContactPhone && (
                  <p className="text-xs text-amber-400">⚠ No emergency contact set. Update your <Link href="/dashboard/user" className="underline">profile</Link> first.</p>
                )}
              </div>
            )}

            <button
              onClick={handleStartJourney}
              className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 flex items-center justify-center gap-2 transition"
            >
              <Navigation className="h-4 w-4" />
              🚀 Start Journey &amp; Arm SOS Guard
            </button>
          </div>
        )}

        {/* ── Active Journey Countdown ──────────────────────────────────── */}
        {journeyStatus === "active" && deadlineAt && (
          <div className={`rounded-2xl border p-5 shadow-lg space-y-4 ${alertSent ? "border-red-500/40 bg-red-950/30" : "border-amber-500/30 bg-amber-950/20"}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Clock className={`h-5 w-5 ${alertSent ? "text-red-400" : "text-amber-400 animate-pulse"}`} />
                <h3 className="font-bold text-white">{alertSent ? "🚨 SOS Dispatched!" : "Journey In Progress"}</h3>
              </div>
              {statusBadge()}
            </div>

            {/* Route summary */}
            <div className="text-sm text-slate-300">
              <span className="font-semibold text-white">{from}</span>
              <span className="mx-2 text-slate-500">→</span>
              <span className="font-semibold text-white">{to}</span>
              <span className="mx-3 text-slate-500">·</span>
              <span className="capitalize">{MODE_CONFIG[mode].label}</span>
              <span className="mx-3 text-slate-500">·</span>
              {distKm} km
            </div>

            {/* Countdown */}
            {!alertSent && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">SOS fires in</p>
                <p className="font-mono text-4xl font-bold text-white tracking-widest">{formatCountdown(secondsLeft)}</p>
                <p className="text-xs text-slate-500 mt-1">Est. time {formatMinutes(selectedMins)} + {bufferMins} min buffer</p>
              </div>
            )}

            {alertSent && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm font-bold text-red-400">🚨 Alert sent to all admins and emergency contact via WhatsApp.</p>
                <p className="text-xs text-slate-400 mt-1">If you are safe, please click the button below to clear this alert.</p>
              </div>
            )}

            {/* Done button */}
            <button
              onClick={handleDone}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 flex items-center justify-center gap-2 transition"
            >
              <CheckCircle className="h-4 w-4" />
              ✅ Done — Reached Safely (removes journey)
            </button>
          </div>
        )}

        {/* ── Done state ───────────────────────────────────────────────── */}
        {journeyStatus === "done" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center shadow-lg">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-1">Journey Complete — You&apos;re Safe! 🎉</h3>
            <p className="text-sm text-slate-400 mb-4">Your journey record has been removed. Stay safe!</p>
            <button
              onClick={() => {
                setJourneyStatus("idle");
                setRouteData(null);
                setFrom("");
                setTo("");
              }}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold px-6 py-2.5 hover:bg-emerald-500/20 transition"
            >
              Plan Another Route
            </button>
          </div>
        )}

        {/* Legend */}
        {routeData && (
          <div className="flex items-center gap-4 text-xs text-slate-500 pb-2">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Real road path (OSRM)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> Danger zones</span>
          </div>
        )}
      </main>
    </div>
  );
}
