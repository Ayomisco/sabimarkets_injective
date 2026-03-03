import { useEffect } from 'react';
import { useAccount } from 'wagmi';

export function useAnalytics() {
  const trackUser = async (walletAddress: string, provider?: string, language?: string, referrer?: string) => {
    try {
      await fetch('/api/analytics/track-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, provider, language, referrer }),
      });
    } catch (error) {
      console.error('Failed to track user:', error);
    }
  };

  const trackView = async (marketId: string, marketTitle?: string, source?: string, walletAddress?: string) => {
    try {
      await fetch('/api/analytics/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, marketTitle, source, walletAddress }),
      });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const trackOrder = async (
    walletAddress: string,
    marketId: string,
    marketTitle: string,
    amount: number,
    outcome: string,
    price: number,
    status: 'pending' | 'filled' | 'cancelled' | 'failed',
    txHash?: string,
    errorReason?: string
  ) => {
    try {
      const res = await fetch('/api/analytics/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          marketId,
          marketTitle,
          amount,
          outcome,
          price,
          status,
          txHash,
          errorReason,
        }),
      });
      const data = await res.json();
      return data.orderId;
    } catch (error) {
      console.error('Failed to track order:', error);
      return null;
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: 'pending' | 'filled' | 'cancelled' | 'failed',
    txHash?: string,
    errorReason?: string
  ) => {
    try {
      await fetch('/api/analytics/track-order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, txHash, errorReason }),
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  return { trackUser, trackView, trackOrder, updateOrderStatus };
}

// Auto-track wallet connection
export function useTrackWalletConnection() {
  const { address, isConnected, connector } = useAccount();
  const { trackUser } = useAnalytics();

  useEffect(() => {
    if (isConnected && address) {
      // Get language from localStorage
      const language = localStorage.getItem('NEXT_LOCALE') || 'en';
      
      // Get referrer from sessionStorage (set on first visit)
      let referrer = sessionStorage.getItem('referrer');
      if (!referrer && document.referrer) {
        referrer = document.referrer;
        sessionStorage.setItem('referrer', referrer);
      }

      trackUser(address, connector?.name, language, referrer || undefined);
    }
  }, [isConnected, address, connector]);
}
