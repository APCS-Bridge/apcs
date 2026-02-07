require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const bcrypt = require("bcrypt");

// Create PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create PrismaClient with adapter
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Seeding database...");

  try {
    // Create admin user
    const adminEmail = "admin@apcs.com";
    const adminPassword = "admin123"; // Change this to a secure password
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        name: "Admin User",
        role: "ADMIN",
      },
    });

    console.log("✅ Admin user created:");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin.id}`);

    // Optionally create a superadmin user
    const superadminEmail = "superadmin@apcs.com";
    const superadminPassword = "superadmin123"; // Change this to a secure password
    const superadminPasswordHash = await bcrypt.hash(superadminPassword, 10);

    const superadmin = await prisma.user.upsert({
      where: { email: superadminEmail },
      update: {},
      create: {
        email: superadminEmail,
        passwordHash: superadminPasswordHash,
        name: "Super Admin",
        role: "SUPERADMIN",
      },
    });

    console.log("✅ Super Admin user created:");
    console.log(`   Email: ${superadmin.email}`);
    console.log(`   Password: ${superadminPassword}`);
    console.log(`   Role: ${superadmin.role}`);
    console.log(`   ID: ${superadmin.id}`);

    console.log("\n🌱 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
