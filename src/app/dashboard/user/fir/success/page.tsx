"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface FIR {
  firNumber: string;
  complainantName: string;
  incidentType: string;
  incidentDateTime: string;
  location: string;
  description: string;
  accusedDetails?: string;
  evidenceUrls?: string[];
  status: string;
  verifiedAt?: string;
}

export default function FirSuccessPage() {
  const params = useSearchParams();
  const firNumber = params.get("fir");
  const [fir, setFir] = useState<FIR | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (firNumber) {
      fetch(`/api/user/fir/${firNumber}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setFir(data.fir);
          } else {
            setError('FIR not found');
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch FIR details');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [firNumber]);

  if (loading) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center">Loading FIR details...</div>;
  }

  if (error || !fir) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-red-600">FIR Not Found</h1>
        <Link href="/dashboard/user/fir" className="mt-6 inline-block text-blue-600 font-semibold hover:underline">
          File New FIR
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-2xl font-bold text-emerald-600">
        FIR {fir.firNumber} Verified & e-Signed
      </h1>
      <p className="mt-1 text-slate-600">
        Your FIR has been successfully submitted and verified.
      </p>

      <div className="mt-6 rounded-xl border bg-slate-50 p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-slate-500">FIR Number</p>
            <p className="text-lg font-mono font-semibold text-slate-900">{fir.firNumber}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <p className="text-lg font-semibold {fir.status === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}">{fir.status}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p><span className="font-medium">Complainant:</span> {fir.complainantName}</p>
          <p><span className="font-medium">Type:</span> {fir.incidentType.replace('_', ' ')}</p>
          <p><span className="font-medium">Date/Time:</span> {new Date(fir.incidentDateTime).toLocaleString()}</p>
          <p><span className="font-medium">Location:</span> {fir.location}</p>
          {fir.accusedDetails && (
            <p><span className="font-medium">Accused:</span> {fir.accusedDetails}</p>
          )}
          {fir.evidenceUrls && fir.evidenceUrls.length > 0 && (
            <div>
              <span className="font-medium">Evidence:</span>
              <div className="mt-1 space-y-1">
                {fir.evidenceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block">
                    {url.split('/').pop()}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <Link
          href="/dashboard/user/fir"
          className="flex-1 text-center rounded-lg border py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          File Another FIR
        </Link>
        <Link
          href="/dashboard/user"
          className="flex-1 text-center rounded-lg border py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
