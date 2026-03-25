import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

const bodySchema = z.object({
  age: z.union([z.number().int().min(1).max(120), z.null()]).optional(),
  phone: z.union([z.string().max(40), z.null()]).optional(),
  nationality: z.union([z.string().max(80), z.null()]).optional(),
  gender: z.union([z.string().max(40), z.null()]).optional(),
  permanentAddress: z.union([z.string().max(500), z.null()]).optional(),
  emergencyContactName: z.union([z.string().max(120), z.null()]).optional(),
  emergencyContactPhone: z.union([z.string().max(40), z.null()]).optional(),
  idDocumentType: z.union([z.string().max(80), z.null()]).optional(),
  idDocumentNumber: z.union([z.string().max(80), z.null()]).optional(),
});

function normalizeNullableString(s: string | null | undefined) {
  if (s === undefined) return undefined;
  if (s === null) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

// Removed E-FIR profile endpoint - use full FIR module instead
export async function PATCH() {
  return NextResponse.json({ 
    error: "E-FIR profile feature replaced by comprehensive FIR module. File FIR at /dashboard/user/fir" 
  }, { status: 410 });
}
