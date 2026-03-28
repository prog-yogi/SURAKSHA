import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const emergencies = await prisma.emergencyEvent.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        lat: true,
        lng: true,
        resolved: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ emergencies });
  } catch (error: any) {
    console.error("USER EMERGENCIES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch emergencies" },
      { status: 500 },
    );
  }
}
