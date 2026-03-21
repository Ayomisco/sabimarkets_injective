import { Market } from './types';
import { createPublicClient, http, parseUnits } from 'viem';

// ─── Injective EVM Testnet ────────────────────────────────────────────────────

const injectiveTestnet = {
  id: 1439,
  name: 'Injective EVM Testnet',
  nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://k8s.testnet.json-rpc.injective.network/'] },
  },
} as const;

const publicClient = createPublicClient({
  chain: injectiveTestnet,
  transport: http(process.env.NEXT_PUBLIC_INJ_EVM_RPC_URL || 'https://k8s.testnet.json-rpc.injective.network/'),
});

// ─── Contract addresses ───────────────────────────────────────────────────────

const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_SABI_FACTORY_ADDRESS ||
  '0x51aFd4fa61c0368249F057B2E0b691991fb1692A') as `0x${string}`;

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────

const FACTORY_ABI = [
  {
    name: 'getAllMarkets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
  },
] as const;

const MARKET_ABI = [
  {
    name: 'getMarketInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'question', type: 'string' },
          { name: 'category', type: 'string' },
          { name: 'imageURI', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'closingTime', type: 'uint256' },
          { name: 'totalPool', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'winningOutcome', type: 'uint256' },
          { name: 'resolved', type: 'bool' },
          { name: 'resolutionSource', type: 'string' },
        ],
      },
    ],
  },
  {
    name: 'getOutcomes',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string[]' }],
  },
  {
    name: 'getAllOutcomePools',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256[]' }],
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assignCategory(question: string, contractCategory: string): string {
  const q = (question + ' ' + contractCategory).toLowerCase();
  if (q.includes('crypto') || q.includes('bitcoin') || q.includes('btc') || q.includes('inj') || q.includes('eth')) return 'Crypto';
  if (q.includes('election') || q.includes('president') || q.includes('politic') || q.includes('tinubu') || q.includes('apc') || q.includes('pdp')) return 'Politics';
  if (q.includes('football') || q.includes('afcon') || q.includes('eagle') || q.includes('sport') || q.includes('match') || q.includes('world cup') || q.includes('wc')) return 'Sports';
  if (q.includes('naira') || q.includes('ngn') || q.includes('usd') || q.includes('rate') || q.includes('inflation') || q.includes('economy')) return 'Economy';
  if (q.includes('bbnaija') || q.includes('movie') || q.includes('artist') || q.includes('award') || q.includes('music')) return 'Entertainment';
  return 'Global';
}

function formatPool(wei: bigint): string {
  // USDC has 6 decimals
  return (Number(wei) / 1e6).toFixed(2);
}

function computePrices(pools: readonly bigint[], totalPool: bigint): string[] {
  if (totalPool === 0n) {
    return pools.map(() => (1 / pools.length).toFixed(4));
  }
  return pools.map((p) => (Number(p) / Number(totalPool)).toFixed(4));
}

async function fetchMarketData(address: `0x${string}`): Promise<Market | null> {
  try {
    const [info, outcomes, pools] = await Promise.all([
      publicClient.readContract({ address, abi: MARKET_ABI, functionName: 'getMarketInfo' }),
      publicClient.readContract({ address, abi: MARKET_ABI, functionName: 'getOutcomes' }),
      publicClient.readContract({ address, abi: MARKET_ABI, functionName: 'getAllOutcomePools' }),
    ]);

    const { question, category, imageURI, creator, closingTime, totalPool, status, winningOutcome, resolved } = info;

    const outcomePrices = computePrices(pools, totalPool);
    const outcomePools = pools.map((p) => p.toString());
    const tokens = (outcomes as string[]).map((outcome, i) => ({
      token_id: `${address}_${i}`,
      outcome,
      price: parseFloat(outcomePrices[i]),
    }));

    return {
      id: address,
      condition_id: address,
      slug: address,
      question: question as string,
      description: `${category} market on Injective EVM`,
      outcomes: outcomes as string[],
      outcomePrices,
      volume: formatPool(totalPool),
      active: status === 0, // Status.OPEN
      closed: status !== 0,
      endDate: new Date(Number(closingTime) * 1000).toISOString(),
      image: imageURI as string,
      tokens,
      clobTokenIds: [],
      marketAddress: address,
      category: category as string,
      outcomePools,
      creator: creator as string,
      resolved: resolved as boolean,
      winningOutcome: Number(winningOutcome),
      uiCategory: assignCategory(question as string, category as string),
    };
  } catch (err) {
    console.error(`Error fetching market ${address}:`, err);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchAfricanMarkets(): Promise<(Market & { uiCategory: string })[]> {
  try {
    const addresses = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'getAllMarkets',
    }) as `0x${string}`[];

    if (!addresses || addresses.length === 0) return [];

    const markets = await Promise.all(addresses.map(fetchMarketData));
    const valid = markets.filter((m): m is Market => m !== null);

    // Sort active markets first, then by pool size
    return valid
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return parseFloat(b.volume) - parseFloat(a.volume);
      })
      .map((m) => ({ ...m, uiCategory: m.uiCategory || 'Global' }));
  } catch (err) {
    console.error('Error fetching SabiMarket markets:', err);
    return [];
  }
}

export async function getMarket(address: string): Promise<Market | null> {
  return fetchMarketData(address as `0x${string}`);
}
