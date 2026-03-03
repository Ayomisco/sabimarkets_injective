"use client";

import { useTrackWalletConnection } from '@/hooks/useAnalytics';

export function AnalyticsProvider() {
  useTrackWalletConnection();
  return null;
}
