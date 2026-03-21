"use client";

import { useState, useEffect, useMemo } from 'react';
import { Market } from '@/lib/polymarket/types';
import { MarketList } from './MarketList';
import { BetModal } from './BetModal';
import { MarketDetailModal } from './MarketDetailModal';
import { CreateMarketModal } from './CreateMarketModal';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  Activity, Clock, TrendingUp, DollarSign, BarChart2,
  Wallet, Globe, Loader2, Search, X, Plus, ExternalLink,
  CheckCircle, AlertCircle, Award
} from 'lucide-react';
import MarketChart from './MarketChart';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OnChainPosition {
  marketAddress: string;
  question: string;
  category: string;
  outcomeIndex: number;
  outcomeName: string;
  stakeWei: bigint;
  stakeUSDC: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  status: number; // 0 OPEN 1 CLOSED 2 RESOLVED 3 CANCELLED
  winningOutcome: number;
  resolved: boolean;
}

interface Props {
  heroMarket: Market | null;
  feedMarkets: (Market & { uiCategory: string })[];
  heroYesPrice: number;
}

// ─── On-chain Portfolio Reader ────────────────────────────────────────────────

async function fetchOnChainPortfolio(address: string, markets: Market[]): Promise<OnChainPosition[]> {
  const { createPublicClient, http } = await import('viem');
  const injectiveTestnet = {
    id: 1439,
    name: 'Injective EVM Testnet',
    nativeCurrency: { name: 'Injective', symbol: 'INJ', decimals: 18 },
    rpcUrls: { default: { http: ['https://k8s.testnet.json-rpc.injective.network/'] } },
  } as const;

  const client = createPublicClient({ chain: injectiveTestnet, transport: http() });

  const MARKET_ABI = [
    { name: 'getMarketInfo', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'tuple', components: [
      { name: 'question', type: 'string' }, { name: 'category', type: 'string' },
      { name: 'imageURI', type: 'string' }, { name: 'creator', type: 'address' },
      { name: 'closingTime', type: 'uint256' }, { name: 'totalPool', type: 'uint256' },
      { name: 'status', type: 'uint8' }, { name: 'winningOutcome', type: 'uint256' },
      { name: 'resolved', type: 'bool' }, { name: 'resolutionSource', type: 'string' },
    ]}] },
    { name: 'getAllUserPositions', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
    { name: 'getOutcomes', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string[]' }] },
    { name: 'getAllOutcomePools', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256[]' }] },
  ] as const;

  const positions: OnChainPosition[] = [];

  await Promise.all(markets.map(async (market) => {
    const addr = market.marketAddress as `0x${string}`;
    try {
      const [info, userPositions, outcomes, pools] = await Promise.all([
        client.readContract({ address: addr, abi: MARKET_ABI, functionName: 'getMarketInfo' }),
        client.readContract({ address: addr, abi: MARKET_ABI, functionName: 'getAllUserPositions', args: [address as `0x${string}`] }),
        client.readContract({ address: addr, abi: MARKET_ABI, functionName: 'getOutcomes' }),
        client.readContract({ address: addr, abi: MARKET_ABI, functionName: 'getAllOutcomePools' }),
      ]);
      const { question, category, totalPool, status, winningOutcome, resolved } = info as any;
      const userPos = userPositions as bigint[];
      const outcomeNames = outcomes as string[];
      const outcomePools = pools as bigint[];

      userPos.forEach((stake, idx) => {
        if (stake === 0n) return;
        const stakeUSDC = Number(stake) / 1e6;
        const pool = outcomePools[idx] > 0n ? outcomePools[idx] : 1n;
        const currentPrice = Number(pool) / Math.max(Number(totalPool), 1);
        const currentValue = totalPool > 0n
          ? (Number(stake) / Number(pool)) * Number(totalPool) / 1e6
          : stakeUSDC;
        positions.push({
          marketAddress: addr,
          question: question as string,
          category: category as string,
          outcomeIndex: idx,
          outcomeName: outcomeNames[idx] || `Outcome ${idx}`,
          stakeWei: stake,
          stakeUSDC,
          currentPrice,
          currentValue,
          pnl: currentValue - stakeUSDC,
          status: Number(status),
          winningOutcome: Number(winningOutcome),
          resolved: resolved as boolean,
        });
      });
    } catch {
      // Market read failed — skip
    }
  }));
  return positions;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeedAndPortfolio({ heroMarket, feedMarkets, heroYesPrice }: Props) {
  const [activeTab, setActiveTab] = useState<'markets' | 'portfolio' | 'my-markets'>('markets');
  const [portfolioSubTab, setPortfolioSubTab] = useState<'bets' | 'history'>('bets');
  const [positions, setPositions] = useState<OnChainPosition[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [isHeroBetOpen, setHeroBetOpen] = useState(false);
  const [heroOutcome, setHeroOutcome] = useState<string | null>(null);
  const [isHeroDetailOpen, setHeroDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFeedMarkets = useMemo(() => {
    if (!searchQuery.trim()) return feedMarkets;
    const q = searchQuery.toLowerCase();
    return feedMarkets.filter(m =>
      m.question?.toLowerCase().includes(q) ||
      m.uiCategory?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q)
    );
  }, [feedMarkets, searchQuery]);

  const handleHeroBet = (outcome: string) => { setHeroOutcome(outcome); setHeroBetOpen(true); };

  // My created markets (filtered from feedMarkets by creator)
  const myCreatedMarkets = useMemo(() =>
    feedMarkets.filter(m => m.creator?.toLowerCase() === address?.toLowerCase()),
    [feedMarkets, address]
  );

  // Load on-chain portfolio
  useEffect(() => {
    if (!address || activeTab !== 'portfolio' || feedMarkets.length === 0) return;
    setLoadingPortfolio(true);
    fetchOnChainPortfolio(address, feedMarkets)
      .then(setPositions)
      .catch(console.error)
      .finally(() => setLoadingPortfolio(false));
  }, [address, activeTab, feedMarkets]);

  const totalStaked = positions.reduce((s, p) => s + p.stakeUSDC, 0);
  const totalCurrentValue = positions.reduce((s, p) => s + p.currentValue, 0);
  const totalPnl = totalCurrentValue - totalStaked;
  const winCount = positions.filter(p => p.pnl > 0).length;

  return (
    <div className="w-full">
      {/* ─── TABS ─── */}
      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] p-1 rounded-xl w-max mb-6 flex-wrap">
        {(['markets', 'portfolio', 'my-markets'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`cursor-pointer px-4 py-2 rounded-lg font-semibold text-[13px] transition-all ${
              activeTab === tab ? 'bg-white/[0.08] text-white shadow-sm' : 'text-[#7A7068] hover:text-white hover:bg-white/[0.04]'
            }`}>
            {tab === 'markets' ? 'Markets' : tab === 'portfolio' ? (
              <>Portfolio{positions.length > 0 && <span className="ml-1.5 text-[10px] bg-[#00D26A] text-black px-1.5 py-0.5 rounded-full font-bold">{positions.length}</span>}</>
            ) : 'My Markets'}
          </button>
        ))}
        <button onClick={() => setCreateOpen(true)}
          className="cursor-pointer px-4 py-2 rounded-lg font-semibold text-[13px] text-[#00D26A] border border-[#00D26A]/20 bg-[#00D26A]/05 hover:bg-[#00D26A]/10 transition-all flex items-center gap-1.5">
          <Plus size={13} /> Create
        </button>
      </div>

      {/* ─── PORTFOLIO TAB ─── */}
      {activeTab === 'portfolio' && (
        <div className="w-full flex flex-col">
          {!address ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-6">
                <Wallet size={28} className="text-[#7A7068]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
              <p className="text-sm text-[#7A7068] max-w-xs mb-6">See your on-chain bets, P&L, and positions on Injective EVM</p>
              <button onClick={() => openConnectModal?.()}
                className="cursor-pointer bg-[#00D26A] text-black px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#00B85E] transition-colors flex items-center gap-2">
                <Wallet size={16} /> Connect Wallet
              </button>
              <button onClick={() => setActiveTab('markets')} className="cursor-pointer text-xs text-[#7A7068] hover:text-white transition-colors mt-4">
                Browse markets instead →
              </button>
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl opacity-30 pointer-events-none blur-[2px]">
                {['Staked', 'Value', 'P&L', 'Positions'].map(label => (
                  <div key={label} className="bg-[#0F0D0B] border border-white/[0.07] rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-[10px] text-[#7A7068] uppercase tracking-wider">{label}</span>
                    <span className="text-xl font-bold font-mono text-white">—</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Total Staked', value: `$${totalStaked.toFixed(2)}`, icon: DollarSign, color: 'text-white' },
                  { label: 'Current Value', value: `$${totalCurrentValue.toFixed(2)}`, icon: TrendingUp, color: 'text-white' },
                  { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, icon: Activity, color: totalPnl >= 0 ? 'text-[#00D26A]' : 'text-[#FF4560]' },
                  { label: 'Positions', value: `${positions.length}`, icon: Award, color: 'text-white' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#0F0D0B] border border-white/[0.07] rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#7A7068] uppercase tracking-wider font-medium">{s.label}</span>
                      <s.icon size={12} className="text-[#7A7068]/60" />
                    </div>
                    <span className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 mb-6 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl w-max">
                <button onClick={() => setPortfolioSubTab('bets')}
                  className={`cursor-pointer px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 transition-all ${
                    portfolioSubTab === 'bets' ? 'bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/20' : 'text-[#7A7068] hover:text-white'
                  }`}>
                  <Activity size={14} /> Active Bets
                </button>
                <button onClick={() => setPortfolioSubTab('history')}
                  className={`cursor-pointer px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 transition-all ${
                    portfolioSubTab === 'history' ? 'bg-white/[0.08] text-white border border-white/10' : 'text-[#7A7068] hover:text-white'
                  }`}>
                  <Clock size={14} /> History
                </button>
              </div>

              {loadingPortfolio ? (
                <div className="flex flex-col items-center justify-center py-24 text-[#7A7068]">
                  <Loader2 size={32} className="animate-spin mb-4" />
                  <p className="text-sm">Reading positions from Injective…</p>
                </div>
              ) : portfolioSubTab === 'history' ? (
                <EmptyState icon={Clock} title="History Coming Soon"
                  desc="Resolved market history will appear here once markets are resolved." />
              ) : positions.length === 0 ? (
                <EmptyState icon={BarChart2} title="No Active Positions"
                  desc="You haven't placed any bets yet. Pick a market and make your prediction!">
                  <button onClick={() => setActiveTab('markets')}
                    className="cursor-pointer bg-[#00D26A] text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#00B85E] transition-colors mt-4">
                    Explore Markets →
                  </button>
                </EmptyState>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {positions.map((pos, i) => {
                    const isWin = pos.resolved && pos.winningOutcome === pos.outcomeIndex;
                    const isLoss = pos.resolved && pos.winningOutcome !== pos.outcomeIndex;
                    const statusColor = isWin ? '#00D26A' : isLoss ? '#FF4560' : '#F5A623';
                    const EXPLORER_URL = process.env.NEXT_PUBLIC_INJ_EVM_EXPLORER_URL || 'https://testnet.blockscout.injective.network';
                    return (
                      <div key={i} className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.14] transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-white text-[13px] leading-snug line-clamp-2 pr-3 flex-1">{pos.question}</h4>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ color: pos.outcomeIndex === 0 ? '#00D26A' : '#FF4560', backgroundColor: `${pos.outcomeIndex === 0 ? '#00D26A' : '#FF4560'}15`, border: `1px solid ${pos.outcomeIndex === 0 ? '#00D26A' : '#FF4560'}30` }}>
                              {pos.outcomeName}
                            </span>
                            {pos.resolved && (
                              <span className="flex items-center gap-1 text-[10px]" style={{ color: statusColor }}>
                                {isWin ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                {isWin ? 'Won' : 'Lost'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3 border-y border-white/[0.05] py-3">
                          <div>
                            <p className="text-[#7A7068] text-[9px] uppercase mb-1 font-medium">Staked</p>
                            <p className="font-bold text-white font-mono text-[13px]">${pos.stakeUSDC.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[#7A7068] text-[9px] uppercase mb-1 font-medium">Price</p>
                            <p className="font-bold text-white font-mono text-[13px]">{(pos.currentPrice * 100).toFixed(1)}¢</p>
                          </div>
                          <div>
                            <p className="text-[#7A7068] text-[9px] uppercase mb-1 font-medium">P&L</p>
                            <p className={`font-bold font-mono text-[13px] ${pos.pnl >= 0 ? 'text-[#00D26A]' : 'text-[#FF4560]'}`}>
                              {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#7A7068]">
                            {pos.status === 0 ? '🟢 Open' : pos.status === 1 ? '🟡 Closed' : pos.status === 2 ? '✅ Resolved' : '❌ Cancelled'}
                          </span>
                          <a href={`${EXPLORER_URL}/address/${pos.marketAddress}`} target="_blank" rel="noopener noreferrer"
                             className="flex items-center gap-1 text-[10px] text-[#7A7068] hover:text-white transition-colors">
                            <ExternalLink size={10} /> Injective
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── MY MARKETS TAB ─── */}
      {activeTab === 'my-markets' && (
        <div className="w-full">
          {!address ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-6">
                <Globe size={28} className="text-[#7A7068]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
              <p className="text-sm text-[#7A7068] max-w-xs mb-6">Connect to see markets you've created on Injective EVM.</p>
              <button onClick={() => openConnectModal?.()}
                className="cursor-pointer bg-[#00D26A] text-black px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#00B85E] transition-colors flex items-center gap-2">
                <Wallet size={16} /> Connect Wallet
              </button>
            </div>
          ) : myCreatedMarkets.length === 0 ? (
            <EmptyState icon={Plus} title="No Markets Created"
              desc="You haven't created any markets yet. Create your first prediction market on Injective EVM!">
              <button onClick={() => setCreateOpen(true)}
                className="cursor-pointer bg-[#00D26A] text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#00B85E] transition-colors mt-4 flex items-center gap-2">
                <Plus size={14} /> Create Market
              </button>
            </EmptyState>
          ) : (
            <div className="space-y-4">
              {myCreatedMarkets.map((m, i) => {
                const EXPLORER_URL = process.env.NEXT_PUBLIC_INJ_EVM_EXPLORER_URL || 'https://testnet.blockscout.injective.network';
                return (
                  <div key={i} className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-5 hover:border-white/[0.14] transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#7A7068] uppercase font-medium mb-1">{m.category}</p>
                        <h4 className="font-semibold text-white text-[14px] leading-snug">{m.question}</h4>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.active ? 'bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/20' : 'bg-white/[0.05] text-[#7A7068] border border-white/[0.08]'
                      }`}>{m.active ? '🟢 Open' : '⚪ Closed'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-[#7A7068]">
                      <span className="flex items-center gap-1"><TrendingUp size={11} />${parseFloat(m.volume).toFixed(2)} Vol.</span>
                      <span className="flex items-center gap-1"><Clock size={11} />Closes {new Date(m.endDate).toLocaleDateString()}</span>
                      <a href={`${EXPLORER_URL}/address/${m.marketAddress}`} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-1 hover:text-white transition-colors ml-auto">
                        <ExternalLink size={11} /> Explorer
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MARKETS TAB ─── */}
      {activeTab === 'markets' && (
        <div>
          {/* Hero Market */}
          {heroMarket && (
            <div className="w-full rounded-2xl border border-white/[0.07] mb-10 overflow-hidden relative"
                 style={{ background: 'linear-gradient(135deg, #0F0D0B 0%, #121009 100%)' }}>
              <div className="absolute top-0 right-0 w-[400px] h-[400px] opacity-[0.06] pointer-events-none"
                   style={{ background: 'radial-gradient(circle, #00D26A 0%, transparent 70%)' }} />
              <div className="flex flex-col lg:flex-row">
                <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between relative z-10">
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-[11px] font-bold text-[#FF4560] bg-[#FF4560]/10 border border-[#FF4560]/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                        🔥 Trending Now
                      </span>
                      <span className="text-[11px] text-[#7A7068] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A] animate-pulse inline-block" />
                        Injective EVM
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">{heroMarket.question}</h2>
                    <p className="text-[#7A7068] text-sm leading-relaxed mb-6 line-clamp-2 max-w-2xl">
                      {heroMarket.description || 'This market resolves based on verified on-chain oracle sources.'}
                    </p>
                  </div>
                  <div className="flex gap-6 py-4 border-t border-white/[0.06] mb-6">
                    <div>
                      <p className="text-[#7A7068] text-[10px] uppercase mb-1 font-medium">Volume</p>
                      <p className="text-lg font-bold text-white font-mono">${parseFloat(heroMarket.volume || "0").toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[#7A7068] text-[10px] uppercase mb-1 font-medium">YES Probability</p>
                      <p className="text-lg font-bold text-[#00D26A] font-mono">{Math.round(heroYesPrice * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-[#7A7068] text-[10px] uppercase mb-1 font-medium">Source</p>
                      <p className="text-lg font-bold text-white font-mono">Injective EVM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button onClick={() => handleHeroBet('YES')}
                      className="cursor-pointer flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-[12px] sm:text-[14px] text-black transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #00D26A, #009A4E)', boxShadow: '0 4px 20px rgba(0,210,106,0.3)' }}>
                      Bet YES · {Math.round(heroYesPrice * 100)}¢
                    </button>
                    <button onClick={() => handleHeroBet('NO')}
                      className="cursor-pointer flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-[12px] sm:text-[14px] text-white transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #FF4560, #CC2E45)', boxShadow: '0 4px 20px rgba(255,69,96,0.3)' }}>
                      Bet NO · {100 - Math.round(heroYesPrice * 100)}¢
                    </button>
                    <button onClick={() => setHeroDetailOpen(true)}
                      className="cursor-pointer hidden sm:flex items-center gap-1.5 text-[#7A7068] hover:text-white text-sm font-medium transition-colors px-3 py-3 rounded-xl border border-white/[0.07] hover:bg-white/[0.05]">
                      View Details ↗
                    </button>
                  </div>
                </div>
                <div className="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#080706]/40 p-4 flex flex-col">
                  <div className="flex justify-between items-center text-[#7A7068] text-[11px] font-medium mb-3">
                    <span>Implied Probability</span>
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00D26A]" /> YES</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FF4560]" /> NO</span>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[220px] relative">
                    <MarketChart currentYesPrice={heroYesPrice} yesTokenId={heroMarket?.tokens?.[0]?.token_id} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search + Filter */}
          <div className="hidden md:flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7068] pointer-events-none" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search markets…"
                className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-[13px] rounded-full pl-8 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00D26A]/40 transition-all placeholder:text-[#7A7068]" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7068] hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
            {searchQuery && <span className="text-[12px] text-[#7A7068]">{filteredFeedMarkets.length} result{filteredFeedMarkets.length !== 1 ? 's' : ''}</span>}
          </div>

          {filteredFeedMarkets.length > 0 ? (
            <MarketList initialMarkets={filteredFeedMarkets} />
          ) : (
            <EmptyState icon={Globe}
              title={searchQuery ? `No results for "${searchQuery}"` : 'No Markets Yet'}
              desc={searchQuery ? 'Try a different search term.' : 'Be the first to create a market on Injective!'}>
              <button onClick={() => setCreateOpen(true)}
                className="cursor-pointer bg-[#00D26A] text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#00B85E] transition-colors mt-4 flex items-center gap-2">
                <Plus size={14} /> Create First Market
              </button>
            </EmptyState>
          )}
        </div>
      )}

      {/* Modals */}
      <BetModal isOpen={isHeroBetOpen} onClose={() => setHeroBetOpen(false)}
        market={heroMarket} selectedOutcome={heroOutcome}
        currentPrice={heroOutcome === 'YES' ? heroYesPrice : (1 - heroYesPrice)} />
      <MarketDetailModal isOpen={isHeroDetailOpen} onClose={() => setHeroDetailOpen(false)}
        market={heroMarket} onBet={(outcome) => handleHeroBet(outcome)} />
      <CreateMarketModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, children }: {
  icon: React.ElementType; title: string; desc: string; children?: React.ReactNode;
}) {
  return (
    <div className="w-full bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-16 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-5">
        <Icon size={28} className="text-[#7A7068]" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-[#7A7068] text-sm max-w-xs leading-relaxed">{desc}</p>
      {children}
    </div>
  );
}
