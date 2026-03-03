import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total users
    const totalUsers = await prisma.user.count();

    // New users in period
    const newUsers = await prisma.user.count({
      where: { createdAt: { gte: startDate } },
    });

    // Active users (any activity in period)
    const activeUsers = await prisma.user.count({
      where: { lastSeen: { gte: startDate } },
    });

    // Total orders
    const totalOrders = await prisma.order.count();

    // Orders in period
    const ordersInPeriod = await prisma.order.count({
      where: { createdAt: { gte: startDate } },
    });

    // Total volume
    const volumeData = await prisma.order.aggregate({
      where: {
        status: 'filled',
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
      _avg: { amount: true },
    });

    // Success rate
    const totalOrdersAttempted = await prisma.order.count({
      where: { createdAt: { gte: startDate } },
    });
    const filledOrders = await prisma.order.count({
      where: {
        status: 'filled',
        createdAt: { gte: startDate },
      },
    });
    const successRate = totalOrdersAttempted > 0 ? (filledOrders / totalOrdersAttempted) * 100 : 0;

    // Market views
    const totalViews = await prisma.marketView.count({
      where: { timestamp: { gte: startDate } },
    });

    // Top markets by views
    const topMarketsByViews = await prisma.marketView.groupBy({
      by: ['marketId', 'marketTitle'],
      where: { timestamp: { gte: startDate } },
      _count: { marketId: true },
      orderBy: { _count: { marketId: 'desc' } },
      take: 10,
    });

    // Top markets by volume
    const topMarketsByVolume = await prisma.order.groupBy({
      by: ['marketId', 'marketTitle'],
      where: {
        status: 'filled',
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
      _count: { marketId: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { walletAddress: true },
        },
      },
    });

    // Language breakdown
    const languageStats = await prisma.user.groupBy({
      by: ['language'],
      _count: { language: true },
      orderBy: { _count: { language: 'desc' } },
    });

    // Provider breakdown
    const providerStats = await prisma.user.groupBy({
      by: ['provider'],
      where: { provider: { not: null } },
      _count: { provider: true },
      orderBy: { _count: { provider: 'desc' } },
    });

    // Daily trend (last 7 days)
    const dailyTrend = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const users = await prisma.user.count({
          where: { lastSeen: { gte: dayStart, lte: dayEnd } },
        });
        const orders = await prisma.order.count({
          where: { createdAt: { gte: dayStart, lte: dayEnd } },
        });
        const volume = await prisma.order.aggregate({
          where: {
            status: 'filled',
            createdAt: { gte: dayStart, lte: dayEnd },
          },
          _sum: { amount: true },
        });

        return {
          date: dayStart.toISOString().split('T')[0],
          users,
          orders,
          volume: volume._sum.amount || 0,
        };
      })
    );

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsers,
        activeUsers,
        totalOrders,
        ordersInPeriod,
        totalVolume: volumeData._sum.amount || 0,
        avgOrderSize: volumeData._avg.amount || 0,
        successRate: Math.round(successRate * 100) / 100,
        totalViews,
      },
      topMarketsByViews,
      topMarketsByVolume,
      recentOrders,
      languageStats,
      providerStats,
      dailyTrend: dailyTrend.reverse(), // oldest first
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
