import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [user, firCount, emergencyCount, lastEmergency] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.sub },
        select: {
          id: true,
          status: true,
          kycStatus: true,
          locationTrackingStatus: true,
          address: true,
          lat: true,
          lng: true,
        },
      }),
      prisma.fIR.count({ where: { userId: session.sub } }),
      prisma.emergencyEvent.count({ where: { userId: session.sub } }),
      prisma.emergencyEvent.findFirst({
        where: { userId: session.sub },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, resolved: true },
      }),
    ]);

    return NextResponse.json({
      safetyStatus: user?.status ?? "SAFE",
      kycStatus: user?.kycStatus ?? "Pending",
      locationTrackingStatus: user?.locationTrackingStatus ?? "Pending",
      lastKnownAddress: user?.address ?? null,
      lastKnownLat: user?.lat ?? null,
      lastKnownLng: user?.lng ?? null,
      totalFIRs: firCount,
      totalEmergencies: emergencyCount,
      lastEmergency: lastEmergency
        ? {
            date: lastEmergency.createdAt.toISOString(),
            resolved: lastEmergency.resolved,
          }
        : null,
    });
  } catch (error: any) {
    console.error("USER STATS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
