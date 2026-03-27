import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/threat-zones
// Returns all non-expired threat zones for map display
export async function GET() {
  const zones = await prisma.threatZone.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ zones });
}
