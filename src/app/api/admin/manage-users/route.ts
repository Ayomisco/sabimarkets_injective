import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple admin check - replace with your wallet addresses
const ADMIN_WALLETS = [
  '0xYourAdminWalletAddress1',
  '0xYourAdminWalletAddress2',
];

function isAdmin(address: string | null) {
  return address && ADMIN_WALLETS.includes(address);
}

// Blacklist/unblacklist a user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminWallet, walletAddress, action } = body; // action: 'blacklist' | 'unblacklist'

    if (!isAdmin(adminWallet)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!walletAddress || !action) {
      return NextResponse.json({ error: 'walletAddress and action required' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { walletAddress },
      data: { isBlacklisted: action === 'blacklist' },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Blacklist user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// Get blacklisted users
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminWallet = searchParams.get('adminWallet');

    if (!isAdmin(adminWallet)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const blacklistedUsers = await prisma.user.findMany({
      where: { isBlacklisted: true },
      select: {
        id: true,
        walletAddress: true,
        createdAt: true,
        lastSeen: true,
      },
    });

    return NextResponse.json({ users: blacklistedUsers });
  } catch (error) {
    console.error('Get blacklisted users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
