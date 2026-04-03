import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Tourist login required" }, { status: 401 });
  }

  const journey = await prisma.safeJourney.findFirst({
    where: { userId: session.sub, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
  });

  if (!journey) {
    return NextResponse.json({ journey: null });
  }

  return NextResponse.json({ journey });
}
