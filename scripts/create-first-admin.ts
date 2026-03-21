import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createFirstAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@sabimarket.xyz';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMeNow123!';
  const name = process.env.ADMIN_NAME || 'Admin';

  try {
    // Check if any admin exists
    const existingAdmin = await prisma.adminUser.findFirst();
    
    if (existingAdmin) {
      console.log('❌ An admin user already exists. Use the /api/admin/auth/register endpoint to create additional admins.');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create first admin
    const admin = await prisma.adminUser.create({
      data: {
        id: crypto.randomUUID(),
        email,
        passwordHash,
        name,
        role: 'superadmin',
        isActive: true,
      },
    });

    console.log('✅ First admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email:', admin.email);
    console.log('  Password:', password);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('');
    console.log('You can now login at: /admin/login');
    
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createFirstAdmin();
