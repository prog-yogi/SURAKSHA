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

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-2xl font-bold text-slate-900">
        File FIR Complaint
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Provide accurate incident details. This will be submitted to authorities.
      </p>

      {step === 'otp' ? (
        <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-emerald-600">
            FIR <span className="font-mono">{firNumber}</span> Submitted
          </h2>
          <p className="text-sm text-slate-600">
            OTP sent to your registered contact. Check SMS/email.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <div></div>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={signatureChecked}
              onChange={(e) => setSignatureChecked(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-slate-700">
              I confirm the FIR details above and provide my e-signature
            </span>
          </label>
          {verifyErr && (
            <p className="text-sm text-red-600" role="alert">
              {verifyErr}
            </p>
          )}
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifyLoading || otp.length !== 6 || !signatureChecked}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {verifyLoading ? "Verifying..." : "Verify OTP & e-Sign FIR"}
          </button>
          <button
            type="button"
            onClick={() => setStep('form')}
            className="w-full text-sm text-slate-500 underline hover:text-slate-700"
          >
            ← Back to Form
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleFIRSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
        {/* Complainant Details */}
        <div>
          <label className="text-sm font-medium">Complainant Name *</label>
          <input
            required
            placeholder="Full name"
            value={complainantName}
            onChange={(e) => setComplainantName(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Address (optional)</label>
          <input
            placeholder="Full address"
            value={complainantAddress}
            onChange={(e) => setComplainantAddress(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Contact (optional)</label>
          <input
            type="tel"
            placeholder="Phone or email"
            value={complainantContact}
            onChange={(e) => setComplainantContact(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        {/* Incident Type */}
        <div>
          <label className="text-sm font-medium">Incident Type *</label>
          <select
            required
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select type</option>
            <option value="THEFT">Theft</option>
            <option value="ASSAULT">Assault</option>
            <option value="CYBERCRIME">Cybercrime</option>
            <option value="HARASSMENT">Harassment</option>
            <option value="ROBBERY">Robbery</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        {/* Location */}
        <input
          type="text"
          required
          placeholder="Incident Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        {/* Description */}
        <textarea
          required
          minLength={20}
          placeholder="Describe the incident (min 20 characters)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        {/* Accused */}
        <input
          type="text"
          placeholder="Accused details (optional)"
          value={accusedDetails}
          onChange={(e) => setAccusedDetails(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        {/* File Upload */}
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => {
            if (e.target.files) {
              setEvidenceFiles(Array.from(e.target.files));
            }
          }}
          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
        />

        {err && (
          <p className="text-sm text-red-600" role="alert">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Submit FIR"}
        </button>
      </form>
      )}
    </div>
  );
}