import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

export async function PATCH(req: NextRequest) {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { firNumber, otp, signatureConfirmed } = await req.json();

    if (!firNumber || !otp || typeof signatureConfirmed !== "boolean") {
      return NextResponse.json({ error: "Missing firNumber, otp or signatureConfirmed" }, { status: 400 });
    }

    const fir = await prisma.fIR.findUnique({
      where: { firNumber },
      include: { otp: true },
    });

    if (!fir || fir.userId !== session.sub) {
      return NextResponse.json({ error: "FIR not found or access denied" }, { status: 404 });
    }

    const otpRecord = fir.otp;
    if (!otpRecord || otpRecord.used || new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    if (otpRecord.code !== otp.toString()) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    if (!signatureConfirmed) {
      return NextResponse.json({ error: "e-Signature confirmation required" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.otp.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });
      await tx.fIR.update({
        where: { id: fir.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true, firNumber, message: "FIR verified and e-signed successfully!" });
  } catch (error: any) {
    console.error("FIR verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

