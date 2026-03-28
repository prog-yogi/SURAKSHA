"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Navigation, AlertTriangle, Crosshair, MapPin, Search, Shield } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const SatelliteMap = dynamic(() => import("@/components/map/SatelliteMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19]"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
});

interface Loc { lat: number; lng: number }

interface ExtendedGeolocationPosition extends GeolocationPosition {
  heading?: number | null;
  speed?: number | null;
}

export default function GeoPage() {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      const ePos = pos as ExtendedGeolocationPosition;
      setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setAccuracy(pos.coords.accuracy);
      if (ePos.heading !== undefined) setHeading(ePos.heading);
      if (ePos.speed !== undefined) setSpeed(ePos.speed);
      
      setLoading(false);
      setError(null);
    };

    const handleError = (err: GeolocationPositionError) => {
      setError(err.message);
      setLoading(false);
    };

    // Give high precision mapping
    const opts = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
    
    // Initial fetch
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, opts);

    // Watch position
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, opts);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300">
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-slate-50/95 dark:bg-[#0B0F19]/95 backdrop-blur px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <MapPin className="h-5 w-5 text-emerald-500" />
           <h1 className="font-bold text-slate-900 dark:text-white">SURAKSHA <span className="text-slate-500 dark:text-slate-400">Geo-Sensing</span></h1>
        </div>
        <div className="flex gap-3 items-center">
            <Link 
              href="/dashboard/user" 
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition"
            >
                Back to Dashboard
            </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Status/Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${loading || error ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                <span className={`relative inline-flex h-3 w-3 rounded-full ${loading || error ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              </div>
              <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">GPS Connection</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                      {loading ? 'Acquiring satellites...' : error ? 'Signal lost' : 'Active tracking (High Precision)'}
                  </p>
              </div>
           </div>

           <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2A303C] px-3 py-1.5 text-slate-700 dark:text-slate-300">
                    <Crosshair className="h-4 w-4" />
                    Accuracy: {accuracy ? `±${accuracy.toFixed(1)}m` : '---'}
                </div>
           </div>
        </div>

        {/* Map Container */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] shadow-sm aspect-video sm:aspect-[21/9]">
            {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0B0F19]/80 backdrop-blur z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <p className="mt-4 font-medium text-slate-700 dark:text-slate-300">Calibrating position...</p>
                </div>
            ) : error ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-50/95 dark:bg-[#0B0F19]/95 backdrop-blur z-10 p-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400 mb-4" />
                    <p className="font-bold text-lg text-slate-900 dark:text-white">Location Access Required</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                        {error}. Please enable location permissions in your browser settings to use Geo-Sensing.
                    </p>
                </div>
            ) : null}

            {loc ? (
               <div className="absolute inset-0 z-0">
                 <SatelliteMap lat={loc.lat} lng={loc.lng} />
               </div>
            ) : (
              <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            )}

            {/* Data Overlay */}
            {loc && (
                <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 justify-between pointer-events-none">
                    <div className="rounded-2xl border border-white/20 bg-slate-900/80 p-4 backdrop-blur-md shadow-2xl w-full sm:w-auto ring-1 ring-black/5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Current Coordinates</p>
                        <p className="mt-1.5 font-mono text-base font-semibold text-white drop-shadow-md">
                            {loc.lat.toFixed(6)}° N<br/>{loc.lng.toFixed(6)}° E
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-slate-900/80 p-4 backdrop-blur-md shadow-2xl w-full sm:w-auto flex gap-8 ring-1 ring-black/5">
                         <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Speed</p>
                            <p className="mt-1.5 font-mono text-base font-semibold text-white drop-shadow-md">
                                {speed !== null ? `${(speed * 3.6).toFixed(1)} km/h` : '0.0 km/h'}
                            </p>
                         </div>
                         <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Heading</p>
                            <p className="mt-1.5 font-mono text-base font-semibold text-white drop-shadow-md flex items-center gap-2">
                                {heading !== null ? `${heading.toFixed(0)}°` : '---'}
                                {heading !== null && (
                                    <Navigation className="h-4 w-4 text-emerald-400" style={{ transform: `rotate(${heading}deg)` }} />
                                )}
                            </p>
                         </div>
                    </div>
                </div>
            )}
            
            {/* Overlay Map Controls pseudo-UI */}
            <div className="absolute right-6 top-6 flex flex-col gap-3 pointer-events-none">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/80 shadow-2xl backdrop-blur-md text-white border border-white/20 ring-1 ring-black/5 pointer-events-auto cursor-pointer hover:bg-slate-800 transition">
                    <Search className="h-5 w-5 drop-shadow-md" />
                </div>
                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-2xl bg-slate-900/80 shadow-2xl backdrop-blur-md overflow-hidden border border-white/20 ring-1 ring-black/5">
                    <div className="flex h-1/2 w-full items-center justify-center bg-transparent hover:bg-white/20 cursor-pointer pointer-events-auto text-white transition font-bold text-lg">+</div>
                    <div className="h-px bg-white/20 w-full" />
                    <div className="flex h-1/2 w-full items-center justify-center bg-transparent hover:bg-white/20 cursor-pointer pointer-events-auto text-white transition font-bold text-lg">-</div>
                </div>
            </div>
        </div>

        {/* Nearby Safe Zones */}
        <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nearby Safe Zones & Corridors</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                    {name: "Tourist Checkpoint Alpha", dist: "1.2 km", status: "Active"},
                    {name: "City Center Safe Corridor", dist: "2.5 km", status: "Active"},
                    {name: "Emergency Medical Camp", dist: "3.8 km", status: "Standby"},
                ].map((z, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4 shadow-sm transition hover:border-slate-300 dark:hover:border-white/20">
                        <div className="flex items-center justify-between">
                             <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate pr-2">{z.name}</h3>
                             <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-500 dark:text-slate-400">{z.dist}</span>
                            <span className={z.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/20' : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-500/20'}>
                                {z.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>
    </div>
  );
}
