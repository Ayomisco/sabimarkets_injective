# SabiMarkets Admin Dashboard

## Overview

The admin dashboard provides comprehensive analytics and moderation tools for SabiMarkets. Track user engagement, trading volume, market performance, and moderate content.

## Features

### 1. **Analytics & Metrics**
- **User Analytics**: Total users, active users, new signups, retention
- **Trading Metrics**: Volume, orders, success rates, average trade size
- **Market Performance**: Most viewed markets, highest volume markets
- **Geographic Insights**: Language distribution, wallet provider stats
- **Daily Trends**: Historical charts for users, orders, and volume

### 2. **Moderation Tools**
- **User Management**: Blacklist/unblacklist wallets
- **Market Moderation**: Hide, flag, or allow specific markets
- **Activity Monitoring**: Track suspicious trading patterns

### 3. **Real-Time Tracking**
All user interactions are automatically tracked:
- Wallet connections
- Market views
- Order placements (pending/filled/failed)
- Session duration

---

## Setup Instructions

### Step 1: Add Your Admin Wallet Address

Update the following files with your wallet address:

**1. `/src/app/admin/page.tsx` (line 65)**
```typescript
const ADMIN_WALLETS = [
  '0xYOUR_WALLET_ADDRESS_HERE', // Replace this
  '0xANOTHER_ADMIN_WALLET',     // Add more if needed
];
```

**2. `/src/app/api/admin/manage-users/route.ts` (line 5)**
```typescript
const ADMIN_WALLETS = [
  '0xYOUR_WALLET_ADDRESS_HERE',
];
```

**3. `/src/app/api/admin/moderate-markets/route.ts` (line 4)**
```typescript
const ADMIN_WALLETS = [
  '0xYOUR_WALLET_ADDRESS_HERE',
];
```

### Step 2: Run Database Migration

The analytics system requires new database tables. Run the migration:

```bash
npx prisma migrate dev --name add_analytics_models
```

This creates the following tables:
- `Order` - All trade attempts
- `MarketView` - Market impression tracking
- `UserSession` - Session tracking
- `DailyAnalytics` - Aggregated daily metrics
- `ModeratedMarket` - Hidden/flagged markets
- `AdminUser` - Admin whitelist

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

### Step 4: Access the Dashboard

1. Connect your whitelisted wallet
2. Navigate to `/admin`
3. View analytics and manage users/markets

---

## API Endpoints

### Analytics

**GET `/api/analytics/stats?days=7`**
- Returns overview metrics, top markets, recent orders, trends
- Query params: `days` (1, 7, 30, 90)

**POST `/api/analytics/track-user`**
```json
{
  "walletAddress": "0x...",
  "provider": "metamask",
  "language": "en",
  "referrer": "https://twitter.com"
}
```

**POST `/api/analytics/track-view`**
```json
{
  "marketId": "0x123...",
  "marketTitle": "Will...",
  "source": "homepage",
  "walletAddress": "0x..."
}
```

**POST `/api/analytics/track-order`**
```json
{
  "walletAddress": "0x...",
  "marketId": "0x123...",
  "marketTitle": "Will...",
  "amount": 10.5,
  "outcome": "YES",
  "price": 0.65,
  "status": "pending",
  "txHash": "0xabc...",
  "errorReason": null
}
```

**PATCH `/api/analytics/track-order`** (update status)
```json
{
  "orderId": "uuid",
  "status": "filled",
  "txHash": "0x..."
}
```

### Admin (Requires Auth)

**POST `/api/admin/manage-users`**
```json
{
  "adminWallet": "0x...",
  "walletAddress": "0x...",
  "action": "blacklist" // or "unblacklist"
}
```

**GET `/api/admin/manage-users?adminWallet=0x...`**
- Returns list of blacklisted users

**POST `/api/admin/moderate-markets`**
```json
{
  "adminWallet": "0x...",
  "marketId": "0x123...",
  "marketTitle": "...",
  "reason": "Spam/inappropriate",
  "action": "hidden" // or "flagged" or "allowed"
}
```

**GET `/api/admin/moderate-markets?adminWallet=0x...&action=hidden`**
- Returns moderated markets (optional action filter)

---

## Database Schema

### User (Extended)
```prisma
model User {
  id            String         @id @default(uuid())
  walletAddress String         @unique
  language      String         @default("en")
  provider      String?        // metamask, phantom, etc.
  referrer      String?
  isBlacklisted Boolean        @default(false)
  lastSeen      DateTime?
  createdAt     DateTime       @default(now())
  
  orders        Order[]
  marketViews   MarketView[]
  sessions      UserSession[]
}
```

### Order
```prisma
model Order {
  id          String    @id
  userId      String
  marketId    String
  amount      Float
  outcome     String    // YES/NO
  price       Float
  status      String    // pending, filled, cancelled, failed
  txHash      String?
  errorReason String?
  createdAt   DateTime
  filledAt    DateTime?
}
```

### MarketView
```prisma
model MarketView {
  id        String    @id
  userId    String?
  marketId  String
  source    String?   // homepage, search, notification
  timestamp DateTime
}
```

---

## Security Notes

1. **Admin Authentication**: Currently wallet-based. Only whitelisted addresses can access `/admin`
2. **API Protection**: Admin APIs check wallet address before executing
3. **Production**: Consider adding rate limiting, API keys, or OAuth for production

---

## Tracking Implementation

### Automatic Tracking

**Wallet Connection** (in `src/components/AnalyticsProvider.tsx`):
Automatically tracks when users connect their wallet

**Market Views** (in `src/components/MarketDetailModal.tsx`):
Tracks when users open market detail modal

**Orders** (in `src/components/MarketDetailModal.tsx`):
Tracks order placement with status updates

### Manual Tracking

Use the `useAnalytics()` hook in any component:

```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const { trackView, trackOrder } = useAnalytics();
  
  // Track custom event
  trackView('market-id-123', 'Market title', 'custom-source');
}
```

---

## Metrics Definitions

- **Active Users**: Users with any activity (view, trade, connection) in selected period
- **New Users**: First-time wallet connections in selected period
- **Success Rate**: % of orders that reached "filled" status
- **Average Order Size**: Mean USDC amount per successful trade
- **Market Views**: Unique market impressions (not unique users)

---

## Future Enhancements

- [ ] Email/Telegram alerts for large trades
- [ ] Automated market moderation (ML-based flagging)
- [ ] User cohort analysis
- [ ] Export reports (CSV, PDF)
- [ ] Real-time WebSocket updates
- [ ] A/B testing framework
- [ ] Custom admin roles (moderator, analyst, super-admin)

---

## Troubleshooting

**Dashboard shows "Access Denied"**
→ Verify your wallet address is in `ADMIN_WALLETS` array

**No data showing**
→ Check database connection, run migration, ensure tracking is active

**Tracking not working**
→ Verify `AnalyticsProvider` is in `Providers.tsx`, check browser console for errors

**Prisma errors**
→ Run `npx prisma generate` and restart dev server

---

## Support

For issues or questions, contact the dev team or open an issue in the repo.
