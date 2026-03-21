import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Secret key to prevent unauthorized admin creation
// In production, set this via environment variable
const ADMIN_CREATION_SECRET = process.env.ADMIN_CREATION_SECRET || 'change-this-secret-key-in-production';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, secret } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Check if any admin exists
    const adminCount = await prisma.adminUser.count();

    // If admins exist, require secret key
    if (adminCount > 0 && secret !== ADMIN_CREATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if email already exists
    const existing = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name || null,
        role: adminCount === 0 ? 'superadmin' : 'admin', // First user is superadmin
      },
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
