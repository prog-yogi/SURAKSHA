import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      did: true,
      status: true,
      kycStatus: true,
      blockchainIdStatus: true,
      locationTrackingStatus: true,
      age: true,
      phone: true,
      nationality: true,
      gender: true,
      permanentAddress: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      idDocumentType: true,
      idDocumentNumber: true,
    },
  });

  return NextResponse.json({ user: user ?? null, session });
}
