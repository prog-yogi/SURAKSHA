import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const firs = await prisma.fIR.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firNumber: true,
        complainantName: true,
        complainantAddress: true,
        complainantContact: true,
        incidentType: true,
        incidentDateTime: true,
        location: true,
        description: true,
        accusedDetails: true,
        status: true,
        createdAt: true,
        verifiedAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ firs });
  } catch (error: any) {
    console.error("ADMIN FIRS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch FIRs" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { firId, status } = await request.json();
    const VALID = ["PENDING", "INVESTIGATING", "RESOLVED", "CLOSED"];
    if (!firId || !status || !VALID.includes(status)) {
      return NextResponse.json(
        { error: "Invalid firId or status" },
        { status: 400 },
      );
    }

    const fir = await prisma.fIR.update({
      where: { id: firId },
      data: { status },
      select: { id: true, firNumber: true, status: true },
    });

    return NextResponse.json({ fir });
  } catch (error: any) {
    console.error("ADMIN FIR UPDATE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update FIR" },
      { status: 500 },
    );
  }
}
