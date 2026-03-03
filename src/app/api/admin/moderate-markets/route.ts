import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ADMIN_WALLETS = [
  '0xYourAdminWalletAddress1',
  '0xYourAdminWalletAddress2',
];

function isAdmin(address: string | null) {
  return address && ADMIN_WALLETS.includes(address);
}

// Moderate a market (hide, flag, allow)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminWallet, marketId, marketTitle, reason, action } = body; // action: 'hidden' | 'flagged' | 'allowed'

    if (!isAdmin(adminWallet)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!marketId || !action) {
      return NextResponse.json({ error: 'marketId and action required' }, { status: 400 });
    }

    // Upsert moderation record
    const moderated = await prisma.moderatedMarket.upsert({
      where: { marketId },
      update: {
        reason: reason || 'No reason provided',
        action,
        moderatorId: adminWallet,
      },
      create: {
        marketId,
        marketTitle: marketTitle || null,
        reason: reason || 'No reason provided',
        action,
        moderatorId: adminWallet,
      },
    });

    return NextResponse.json({ success: true, moderated });
  } catch (error) {
    console.error('Moderate market error:', error);
    return NextResponse.json({ error: 'Failed to moderate market' }, { status: 500 });
  }
}

// Get all moderated markets
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminWallet = searchParams.get('adminWallet');
    const action = searchParams.get('action'); // optional filter

    if (!isAdmin(adminWallet)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const moderatedMarkets = await prisma.moderatedMarket.findMany({
      where: action ? { action } : undefined,
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ markets: moderatedMarkets });
  } catch (error) {
    console.error('Get moderated markets error:', error);
    return NextResponse.json({ error: 'Failed to fetch moderated markets' }, { status: 500 });
  }
}
