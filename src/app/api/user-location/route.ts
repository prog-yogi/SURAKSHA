import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
});

// POST /api/user-location
// Upserts one row per user in the user_location table with the latest coords.
// Called every 2 minutes from the geo page.
export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json(
      { error: "Tourist login required" },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { lat, lng, accuracy } = parsed.data;

  // Upsert — creates the row on first call, overwrites on every subsequent call
  await prisma.userLocation.upsert({
    where: { userId: session.sub },
    create: { userId: session.sub, lat, lng, accuracy },
    update: { lat, lng, accuracy },
  });

  // Also keep the lat/lng on the User row in sync (used by existing dashboard code)
  await prisma.user.update({
    where: { id: session.sub },
    data: { lat, lng, locationTrackingStatus: "Complete" },
  });

  return NextResponse.json({ ok: true });
}

// GET /api/user-location — returns the current stored position for the logged-in user
export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json(
      { error: "Tourist login required" },
      { status: 401 },
    );
  }

  const row = await prisma.userLocation.findUnique({
    where: { userId: session.sub },
  });

  return NextResponse.json({ location: row ?? null });
}
