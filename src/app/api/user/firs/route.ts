import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const firs = await prisma.fIR.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firNumber: true,
        complainantName: true,
        incidentType: true,
        incidentDateTime: true,
        location: true,
        description: true,
        status: true,
        createdAt: true,
        verifiedAt: true,
      },
    });

    return NextResponse.json({ firs });
  } catch (error: any) {
    console.error("USER FIRS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch FIRs" },
      { status: 500 },
    );
  }
}
