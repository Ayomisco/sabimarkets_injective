// SabiMarket on-chain market type
// (Named "Market" to keep all existing UI components working without import changes)

export interface Token {
  token_id: string; // kept for UI compatibility (set to `${marketAddress}_${outcomeIndex}`)
  outcome: string;
  price: number;
}

export interface Market {
  id: string;            // market contract address
  condition_id: string;  // market contract address (UI compatibility)
  slug: string;          // market contract address (used in links)
  question: string;
  description: string;
  icon?: string;
  outcomes: string[];
  outcomePrices: string[];  // e.g. ["0.62", "0.38"] — computed from on-chain pools
  volume: string;           // totalPool in USDC (human readable)
  active: boolean;          // true when status === OPEN
  closed: boolean;          // true when status !== OPEN
  endDate: string;          // ISO string of closingTime
  image: string;            // imageURI from contract
  tokens: Token[];          // mapped from outcomes for price-lookup compatibility
  clobTokenIds: string[];   // empty (no CLOB on SabiMarket V1)

  // SabiMarket-specific fields
  marketAddress: string;    // the EVM contract address
  category: string;
  outcomePools: string[];   // raw pool amounts in USDC 6-decimal strings
  creator: string;
  resolved: boolean;
  winningOutcome: number;
  uiCategory?: string;
}
