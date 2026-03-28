import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  kycStatus: true,
  locationTrackingStatus: true,
  address: true,
  phone: true,
  alternativePhone: true,
  citizenship: true,
  aadhaarNumber: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  emergencyContactRelation: true,
  dateOfBirth: true,
  gender: true,
  bio: true,
  profileImage: true,
  nationality: true,
  bloodGroup: true,
  createdAt: true,
};

export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: PROFILE_SELECT,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("PROFILE GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

const EDITABLE_FIELDS = [
  "name",
  "phone",
  "alternativePhone",
  "address",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelation",
  "dateOfBirth",
  "gender",
  "bio",
  "profileImage",
  "nationality",
  "bloodGroup",
] as const;

export async function PATCH(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const update: Record<string, any> = {};

    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        if (field === "dateOfBirth" && body[field]) {
          update[field] = new Date(body[field]);
        } else if (field === "profileImage" && body[field]) {
          // Limit image size to 500KB base64
          if (typeof body[field] === "string" && body[field].length > 700_000) {
            return NextResponse.json(
              { error: "Profile image too large. Max 500KB." },
              { status: 400 },
            );
          }
          update[field] = body[field];
        } else {
          update[field] = body[field];
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id: session.sub },
      data: update,
      select: PROFILE_SELECT,
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("PROFILE PATCH ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
