import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, provider, language, referrer } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 });
    }

    // Upsert user (create if new, update lastSeen if exists)
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {
        lastSeen: new Date(),
        provider: provider || undefined,
        language: language || 'en',
      },
      create: {
        walletAddress,
        provider: provider || null,
        language: language || 'en',
        referrer: referrer || null,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Track user error:', error);
    return NextResponse.json({ error: 'Failed to track user' }, { status: 500 });
  }
}
