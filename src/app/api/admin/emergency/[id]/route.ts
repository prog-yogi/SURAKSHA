import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const emergency = await prisma.emergencyEvent.update({
      where: { id: params.id },
      data: { resolved: true },
      select: { id: true, resolved: true },
    });

    return NextResponse.json({ emergency });
  } catch (error: any) {
    console.error("RESOLVE EMERGENCY ERROR:", error);
    return NextResponse.json(
      { error: "Failed to resolve emergency" },
      { status: 500 },
    );
  }
}
