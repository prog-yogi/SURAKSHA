import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Tourist login required" }, { status: 401 });
  }

  let body: { journeyId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.journeyId) {
    return NextResponse.json({ error: "Missing journeyId" }, { status: 400 });
  }

  // Delete only if it belongs to this user and is ACTIVE
  const deleted = await prisma.safeJourney.deleteMany({
    where: { id: body.journeyId, userId: session.sub, status: "ACTIVE" },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Journey not found or already completed" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
