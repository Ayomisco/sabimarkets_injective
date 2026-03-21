/**
 * GET /api/clob/positions?address=0x...
 * Returns on-chain positions for a user on SabiMarket (Injective EVM).
 * Kept for backwards-compat — portfolio now reads on-chain directly in the component.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
  // On-chain reading is done client-side in FeedAndPortfolio — return empty for server calls
  return NextResponse.json({ positions: [], stats: { totalValue: 0, totalCost: 0, totalPnl: 0, winRate: 0, count: 0 } });
}
