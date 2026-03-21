// Prices come from on-chain SabiMarket pool ratios — no WebSocket needed.
// This hook is kept as a no-op to preserve import compatibility.
export function usePolymarketWSS() {
  // no-op: prices are fetched on-chain via `fetchAfricanMarkets()`
}
