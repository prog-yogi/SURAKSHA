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

  // Load journey + user
  const journey = await prisma.safeJourney.findUnique({
    where: { id: body.journeyId },
    include: {
      user: {
        select: {
          name: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelation: true,
        },
      },
    },
  });

  if (!journey || journey.userId !== session.sub) {
    return NextResponse.json({ error: "Journey not found" }, { status: 404 });
  }

  // Mark as ALERTED
  await prisma.safeJourney.update({
    where: { id: body.journeyId },
    data: { status: "ALERTED", alertSentAt: new Date() },
  });

  // Build context
  const userName = journey.user.name;
  const mapsLink = `https://maps.google.com/?q=${journey.toLat},${journey.toLng}`;
  const modeLabel = journey.mode.charAt(0).toUpperCase() + journey.mode.slice(1);

  // Notify all admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        recipientId: admin.id,
        type: "SAFE_ROUTE_ALERT",
        title: `🚨 Safe Route Timer Expired — ${userName}`,
        body: `${userName} has not reached "${journey.toPlace}" from "${journey.fromPlace}" via ${modeLabel}. Deadline passed by ${journey.bufferMinutes} min buffer. Destination: ${mapsLink}`,
        data: JSON.stringify({
          journeyId: journey.id,
          from: journey.fromPlace,
          to: journey.toPlace,
          mode: journey.mode,
          startedAt: journey.startedAt,
          deadlineAt: journey.deadlineAt,
          mapsLink,
        }),
      })),
    });
  }

  // Log system activity
  await prisma.systemActivity.create({
    data: {
      message: "Safe route timer expired — SOS dispatched",
      kind: "warning",
      detail: `${userName} did not confirm arrival at "${journey.toPlace}" within the allowed time window.`,
    },
  });

  return NextResponse.json({
    ok: true,
    notifiedAdmins: admins.length,
    emergencyContactPhone: journey.user.emergencyContactPhone,
    emergencyContactName: journey.user.emergencyContactName,
    userName,
    fromPlace: journey.fromPlace,
    toPlace: journey.toPlace,
    mode: modeLabel,
  });
}
