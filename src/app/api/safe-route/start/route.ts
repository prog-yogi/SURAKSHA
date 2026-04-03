import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Tourist login required" }, { status: 401 });
  }

  let body: {
    fromPlace?: string;
    toPlace?: string;
    fromLat?: number;
    fromLng?: number;
    toLat?: number;
    toLng?: number;
    distanceKm?: number;
    mode?: string;
    avgSpeedKmh?: number;
    estimatedMinutes?: number;
    bufferMinutes?: number;
    routeCoords?: string; // JSON stringified [lng,lat][]
  } = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    fromPlace, toPlace, fromLat, fromLng, toLat, toLng,
    distanceKm, mode, avgSpeedKmh, estimatedMinutes,
    bufferMinutes = 30, routeCoords = "[]",
  } = body;

  if (!fromPlace || !toPlace || fromLat == null || fromLng == null ||
      toLat == null || toLng == null || !mode || !distanceKm ||
      !avgSpeedKmh || !estimatedMinutes) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const now = new Date();
  const etaAt = new Date(now.getTime() + estimatedMinutes * 60_000);
  const deadlineAt = new Date(etaAt.getTime() + bufferMinutes * 60_000);

  // Cancel any previous active journey for this user
  await prisma.safeJourney.deleteMany({
    where: { userId: session.sub, status: "ACTIVE" },
  });

  const journey = await prisma.safeJourney.create({
    data: {
      userId: session.sub,
      fromPlace,
      toPlace,
      fromLat,
      fromLng,
      toLat,
      toLng,
      distanceKm,
      mode,
      avgSpeedKmh,
      estimatedMinutes,
      bufferMinutes,
      etaAt,
      deadlineAt,
      routeCoords,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ ok: true, journeyId: journey.id });
}
