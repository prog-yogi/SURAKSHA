// import { NextResponse } from "next/server";

// export async function GET() {
//   return NextResponse.json({
//     reportId: "E-FIR-DEL-2025-88421",
//     generatedAt: new Date().toISOString(),
//     blockchainHash: "0xefir9a8b7c6d5e4f3210fedcba9876543210abcd",
//     immutable: true,
//     complainant: {
//       name: "John Smith",
//       did: "DID:0x1a2b3c",
//       contact: "+91-XXXX-XXXX",
//     },
//     incident: {
//       type: "Missing person / distress signal",
//       location: "Approx. India Gate precinct, New Delhi",
//       coordinates: { lat: 28.6129, lng: 77.2295 },
//     },
//     authorityRouting: "Delhi Police Control + Tourism Helpline",
//     auditTrail: "Anchored on consortium ledger — verification OK",
//   });
// }


import { NextResponse } from "next/server";


// ✅ GET → just for testing (optional)
export async function GET() {
  return NextResponse.json({
    message: "FIR API working",
  });
}


// ✅ POST → MAIN FIR LOGIC
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Generate UNIQUE FIR NUMBER
    const firNumber = "FIR-" + Date.now();

    // ✅ Create FIR object
    const newFIR = {
      firNumber,
      name: body.name,
      phone: body.phone,
      complaint: body.complaint,
      createdAt: new Date(),
    };

    console.log("Saved FIR:", newFIR);

    // 👉 TODO: Save in DB
    // await prisma.fir.create({ data: newFIR });

    return NextResponse.json({
      success: true,
      firNumber,
    });

  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Error creating FIR" },
      { status: 500 }
    );
  }
}
