"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FirPage() {
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [firNumber, setFirNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [signatureChecked, setSignatureChecked] = useState(false);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [complainantName, setComplainantName] = useState('');
  const [complainantAddress, setComplainantAddress] = useState('');
  const [complainantContact, setComplainantContact] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [accusedDetails, setAccusedDetails] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFIRSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
  
    if (!complainantName || !incidentType || !date || !time || !location || description.length < 20) {
      setErr("Please fill all required fields (description min 20 chars).");
      return;
    }
  
    const formData = new FormData();
    formData.append('complainantName', complainantName);
    formData.append('complainantAddress', complainantAddress);
    formData.append('complainantContact', complainantContact);
    formData.append('incidentType', incidentType);
    formData.append('incidentDate', date);
    formData.append('incidentTime', time);
    formData.append('location', location);
    formData.append('description', description);
    formData.append('accusedDetails', accusedDetails);
    evidenceFiles.forEach((file) => formData.append('evidence', file));

    setLoading(true);
  
    try {
      const res = await fetch("/api/user/fir", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit FIR");
      }
  
      if (data.success && data.firNumber) {
        setStep('otp');
        setFirNumber(data.firNumber);
        setOtp('');
        setSignatureChecked(false);
        setVerifyErr(null);
      } else {
        throw new Error("No FIR number returned");
      }
  
    } catch (err: any) {
      setErr(err.message || "Failed to submit FIR.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!otp || otp.length !== 6 || !signatureChecked) {
      setVerifyErr("Enter 6-digit OTP and confirm e-signature");
      return;
    }

    setVerifyErr(null);
    setVerifyLoading(true);

    try {
      const res = await fetch("/api/user/fir/verify", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firNumber,
          otp: Number(otp),
          signatureConfirmed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      router.push(`/dashboard/user/fir/success?fir=${firNumber}`);
    } catch (err: any) {
      setVerifyErr(err.message || "Verification failed");
    } finally {
      setVerifyLoading(false);
    }
  }

  // Common input class
  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition";
  const labelClass = "text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-14">
      <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
        File FIR Complaint
      </h1>
      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
        Provide accurate incident details. This will be securely submitted to authorities.
      </p>

      {step === 'otp' ? (
        <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 shadow-sm dark:shadow-2xl dark:backdrop-blur transition-all">
          <h2 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            FIR <span className="font-mono bg-emerald-50 dark:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/30">{firNumber}</span> Submitted
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            OTP sent to your registered contact. Check SMS/email.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className={inputClass}
            />
            <div></div>
          </div>
          <label className="flex items-center space-x-3 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={signatureChecked}
              onChange={(e) => setSignatureChecked(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500 dark:border-white/20 dark:bg-slate-950 dark:checked:bg-emerald-500 dark:checked:border-emerald-500 transition"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              I confirm the FIR details above and provide my e-signature
            </span>
          </label>
          {verifyErr && (
            <p className="text-sm rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3 py-2 font-semibold text-red-600 dark:text-red-400 mt-2" role="alert">
              {verifyErr}
            </p>
          )}
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifyLoading || otp.length !== 6 || !signatureChecked}
            className="mt-6 w-full rounded-xl bg-emerald-600 dark:bg-emerald-500/20 dark:border dark:border-emerald-500/50 py-3 text-sm font-bold uppercase tracking-widest text-white dark:text-emerald-400 hover:bg-emerald-700 dark:hover:bg-emerald-500/30 disabled:opacity-50 transition"
          >
            {verifyLoading ? "Verifying Token..." : "Verify OTP & e-Sign FIR"}
          </button>
          <button
            type="button"
            onClick={() => setStep('form')}
            className="mt-4 w-full text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            ← Back to Form
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleFIRSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm dark:shadow-2xl dark:backdrop-blur transition-all"
        >
        {/* Complainant Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/5 pb-2">Complainant Protocol</h3>
          <div>
            <label className={labelClass}>Complainant Name *</label>
            <input
              required
              placeholder="Full legal name"
              value={complainantName}
              onChange={(e) => setComplainantName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Address (optional)</label>
              <input
                placeholder="Full address"
                value={complainantAddress}
                onChange={(e) => setComplainantAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact (optional)</label>
              <input
                type="tel"
                placeholder="Phone or email"
                value={complainantContact}
                onChange={(e) => setComplainantContact(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Incident Type */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/5 pb-2">Incident Parameters</h3>
          <div>
            <label className={labelClass}>Incident Type *</label>
            <select
              required
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className={inputClass}
            >
              <option value="" className="dark:bg-slate-900">Select categorization</option>
              <option value="THEFT" className="dark:bg-slate-900">Theft / Larceny</option>
              <option value="ASSAULT" className="dark:bg-slate-900">Physical Assault</option>
              <option value="CYBERCRIME" className="dark:bg-slate-900">Digital / Cybercrime</option>
              <option value="HARASSMENT" className="dark:bg-slate-900">Harassment</option>
              <option value="ROBBERY" className="dark:bg-slate-900">Armed Robbery</option>
              <option value="OTHER" className="dark:bg-slate-900">Other / Uncategorized</option>
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} dark:[color-scheme:dark]`}
              />
            </div>
            <div>
              <label className={labelClass}>Time *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`${inputClass} dark:[color-scheme:dark]`}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>Location coordinates/Address *</label>
            <input
              type="text"
              required
              placeholder="Where did this occur?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Chronological Description *</label>
            <textarea
              required
              minLength={20}
              placeholder="Provide a detailed account of the incident (minimum 20 characters)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
            />
          </div>

          {/* Accused */}
          <div>
            <label className={labelClass}>Accused Identifiers (optional)</label>
            <input
              type="text"
              placeholder="Name, appearance, or other identifiers"
              value={accusedDetails}
              onChange={(e) => setAccusedDetails(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-2 pt-2">
          <label className={labelClass}>Digital Evidence (optional)</label>
          <div className="mt-1 rounded-xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-slate-950/50 px-6 py-6 text-center">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files) {
                  setEvidenceFiles(Array.from(e.target.files));
                }
              }}
              className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-amber-100 dark:file:bg-amber-500/20 file:px-4 file:py-2 file:text-sm file:font-bold file:text-amber-700 dark:file:text-amber-400 hover:file:bg-amber-200 dark:hover:file:bg-amber-500/30 file:transition cursor-pointer"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Attach images, documents, or logs (Max 5MB per file)</p>
          </div>
        </div>

        {err && (
          <p className="text-sm rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3 py-2 font-semibold text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-amber-500 dark:bg-amber-500/20 dark:border dark:border-amber-500/50 py-3.5 text-sm font-bold uppercase tracking-widest text-white dark:text-amber-400 hover:bg-amber-600 dark:hover:bg-amber-500/30 disabled:opacity-50 transition shadow-sm"
        >
          {loading ? "Transmitting..." : "Initialize FIR Report"}
        </button>
      </form>
      )}
    </div>
  );
}