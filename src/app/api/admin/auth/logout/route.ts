import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const token = (await cookies()).get('admin_token')?.value;

    if (token) {
      // Delete session from database
      await prisma.adminSession.deleteMany({
        where: { token },
      });
    }

    // Clear cookie
    (await cookies()).delete('admin_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
