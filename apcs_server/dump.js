
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const users = await prisma.user.findMany();
        console.log('USERS:', JSON.stringify(users, null, 2));

        const spaces = await prisma.space.findMany();
        console.log('SPACES:', JSON.stringify(spaces, null, 2));

        const members = await prisma.spaceMember.findMany();
        console.log('MEMBERS:', JSON.stringify(members, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
