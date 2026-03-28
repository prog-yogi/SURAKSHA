import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalTourists,
      totalAdmins,
      statusCounts,
      firsByType,
      firsTotal,
      firsResolved,
      emergenciesTotal,
      emergenciesResolved,
      recentRegistrations,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "TOURIST" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.groupBy({
        by: ["status"],
        where: { role: "TOURIST" },
        _count: { status: true },
      }),
      prisma.fIR.groupBy({
        by: ["incidentType"],
        _count: { incidentType: true },
      }),
      prisma.fIR.count(),
      prisma.fIR.count({ where: { status: "RESOLVED" } }),
      prisma.emergencyEvent.count(),
      prisma.emergencyEvent.count({ where: { resolved: true } }),
      prisma.user.count({
        where: {
          role: "TOURIST",
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const statusBreakdown: Record<string, number> = {};
    for (const s of statusCounts) {
      statusBreakdown[s.status] = s._count.status;
    }

    const incidentBreakdown: Record<string, number> = {};
    for (const f of firsByType) {
      incidentBreakdown[f.incidentType] = f._count.incidentType;
    }

    return NextResponse.json({
      totalTourists,
      totalAdmins,
      statusBreakdown,
      incidentBreakdown,
      firsTotal,
      firsResolved,
      firsPending: firsTotal - firsResolved,
      emergenciesTotal,
      emergenciesResolved,
      emergenciesPending: emergenciesTotal - emergenciesResolved,
      recentRegistrations,
      safetyScore:
        totalTourists > 0
          ? Math.round(
              ((statusBreakdown["SAFE"] ?? 0) / totalTourists) * 100,
            )
          : 100,
    });
  } catch (error: any) {
    console.error("ADMIN ANALYTICS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
