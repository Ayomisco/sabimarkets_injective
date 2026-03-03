import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, marketId, marketTitle, source } = body;

    if (!marketId) {
      return NextResponse.json({ error: 'marketId required' }, { status: 400 });
    }

    // Find user if wallet provided
    let userId = null;
    if (walletAddress) {
      const user = await prisma.user.findUnique({
        where: { walletAddress },
        select: { id: true },
      });
      userId = user?.id || null;
    }

    // Create market view
    await prisma.marketView.create({
      data: {
        userId,
        marketId,
        marketTitle: marketTitle || null,
        source: source || 'direct',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track view error:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}
