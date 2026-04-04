const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.fIR.count();
    console.log("FIR Collection Name is prisma.fIR. Count:", count);
  } catch (err) {
    console.log("Error with prisma.fIR:", err.message);
  }
}

main().finally(() => prisma.$disconnect());
