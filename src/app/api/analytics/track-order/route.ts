import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, marketId, marketTitle, amount, outcome, price, status, txHash, errorReason } = body;

    if (!walletAddress || !marketId || !amount || !outcome || !price || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find or create user
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { lastSeen: new Date() },
      create: { walletAddress, lastSeen: new Date() },
    });

    // Create order record
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        marketId,
        marketTitle: marketTitle || null,
        amount,
        outcome,
        price,
        status, // pending, filled, cancelled, failed
        txHash: txHash || null,
        errorReason: errorReason || null,
        filledAt: status === 'filled' ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Track order error:', error);
    return NextResponse.json({ error: 'Failed to track order' }, { status: 500 });
  }
}

// PATCH to update order status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status, txHash, errorReason } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        txHash: txHash || undefined,
        errorReason: errorReason || undefined,
        filledAt: status === 'filled' ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
