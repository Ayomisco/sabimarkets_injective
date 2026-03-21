/**
 * POST /api/clob/order
 * Orders are now placed directly on-chain via SabiMarket.placeBet() in BetModal.
 * This route is kept as a stub to avoid 404s from any lingering references.
 */
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Orders are placed on-chain via SabiMarket.placeBet() — no API relay needed.' },
    { status: 410 }
  );
}
