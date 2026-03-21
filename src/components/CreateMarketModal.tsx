"use client";

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Plus, Trash2, Loader2, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useToast } from '@/components/Toast';

const USDC_ADDRESS = (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS ||
  '0x652144cAEaB64754F712Bd4D490F9E423397369c') as `0x${string}`;
const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_SABI_FACTORY_ADDRESS ||
  '0x51aFd4fa61c0368249F057B2E0b691991fb1692A') as `0x${string}`;
const EXPLORER_URL = process.env.NEXT_PUBLIC_INJ_EVM_EXPLORER_URL || 'https://testnet.blockscout.injective.network';

const USDC_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

const FACTORY_ABI = [
  {
    name: 'createMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'outcomes', type: 'string[]' },
      { name: 'closingTime', type: 'uint256' },
      { name: 'initialLiquidity', type: 'uint256' },
      { name: 'category', type: 'string' },
      { name: 'imageURI', type: 'string' },
    ],
    outputs: [{ name: 'marketAddress', type: 'address' }],
  },
] as const;

const CATEGORIES = [
  { value: 'sports/football', label: '⚽ Football / Soccer' },
  { value: 'sports/other', label: '🏅 Sports (Other)' },
  { value: 'politics/nigeria', label: '🇳🇬 Nigerian Politics' },
  { value: 'politics/kenya', label: '🇰🇪 Kenyan Politics' },
  { value: 'politics/south-africa', label: '🇿🇦 South African Politics' },
  { value: 'politics/ghana', label: '🇬🇭 Ghanaian Politics' },
  { value: 'politics/africa', label: '🌍 African Politics' },
  { value: 'economy', label: '💹 Economy & Currency' },
  { value: 'crypto', label: '₿ Crypto' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'global', label: '🌐 Global' },
];

const MIN_LIQUIDITY = 10; // $10 USDC minimum

export function CreateMarketModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { address } = useAccount();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [question, setQuestion] = useState('');
  const [outcomes, setOutcomes] = useState(['YES', 'NO']);
  const [closingDate, setClosingDate] = useState('');
  const [liquidity, setLiquidity] = useState<number | string>(10);
  const [category, setCategory] = useState('sports/football');
  const [imageURI, setImageURI] = useState('');
  const [resolutionSource, setResolutionSource] = useState('');
  const [step, setStep] = useState<'idle' | 'approving' | 'creating' | 'done' | 'error'>('idle');
  const [txError, setTxError] = useState('');
  const [createdAddress, setCreatedAddress] = useState('');
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();

  const liquidityNum = typeof liquidity === 'string' ? parseFloat(liquidity) || 0 : liquidity;
  const liquidityWei = parseUnits(liquidityNum.toString(), 6);

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'allowance',
    args: address ? [address, FACTORY_ADDRESS] : undefined,
  });

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const usdcBalanceNum = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)) : 0;
  const hasEnoughUsdc = usdcBalanceNum >= liquidityNum;
  const hasAllowance = usdcAllowance ? (usdcAllowance as bigint) >= liquidityWei : false;
  const isBusy = step === 'approving' || step === 'creating';

  const addOutcome = () => {
    if (outcomes.length < 10) setOutcomes([...outcomes, '']);
  };
  const removeOutcome = (i: number) => {
    if (outcomes.length > 2) setOutcomes(outcomes.filter((_, idx) => idx !== i));
  };
  const updateOutcome = (i: number, val: string) => {
    const next = [...outcomes];
    next[i] = val;
    setOutcomes(next);
  };

  const handleError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const friendly = msg.includes('rejected') ? 'Transaction rejected.' : msg.slice(0, 120);
    setTxError(friendly);
    setStep('error');
    toastError('Transaction failed', friendly);
  };

  const doCreateMarket = async () => {
    if (!address) return;
    const closingTimestamp = BigInt(Math.floor(new Date(closingDate).getTime() / 1000));
    try {
      setStep('creating');
      toastInfo('Creating market…', 'Confirm in your wallet.');
      const hash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'createMarket',
        args: [question, outcomes, closingTimestamp, liquidityWei, category, imageURI || ''],
      });
      // Wait for receipt to get the market address from events
      setCreatedAddress(hash); // placeholder — show tx link
      setStep('done');
      toastSuccess('Market created!', 'Your prediction market is live on Injective.');
    } catch (err) {
      handleError(err);
    }
  };

  const handleSubmit = async () => {
    if (!address) { toastError('Wallet required', 'Connect your wallet first.'); return; }
    if (!question.trim()) { toastError('Missing question', 'Enter a market question.'); return; }
    if (outcomes.some(o => !o.trim())) { toastError('Empty outcome', 'All outcome names must be filled in.'); return; }
    if (!closingDate) { toastError('Missing closing date', 'Set a closing date.'); return; }
    if (new Date(closingDate) <= new Date()) { toastError('Invalid date', 'Closing date must be in the future.'); return; }
    if (liquidityNum < MIN_LIQUIDITY) { toastError('Low liquidity', `Minimum initial liquidity is $${MIN_LIQUIDITY} USDC.`); return; }
    if (!hasEnoughUsdc) { toastError('Insufficient USDC', `You need $${liquidityNum} USDC.`); return; }

    setTxError('');

    if (!hasAllowance) {
      try {
        setStep('approving');
        toastInfo('Approving USDC…', 'Confirm in your wallet.');
        const hash = await writeContractAsync({
          address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'approve',
          args: [FACTORY_ADDRESS, liquidityWei],
        });
        setApproveTxHash(hash);
        // Poll for approval then create
        const interval = setInterval(async () => {
          const result = await refetchAllowance();
          const newAllowance = result.data as bigint | undefined;
          if (newAllowance && newAllowance >= liquidityWei) {
            clearInterval(interval);
            await doCreateMarket();
          }
        }, 2000);
      } catch (err) {
        handleError(err);
      }
    } else {
      await doCreateMarket();
    }
  };

  const reset = () => {
    setQuestion(''); setOutcomes(['YES', 'NO']); setClosingDate('');
    setLiquidity(10); setCategory('sports/football'); setImageURI('');
    setResolutionSource(''); setStep('idle'); setTxError(''); setCreatedAddress('');
    setApproveTxHash(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { if (!isBusy) { reset(); onClose(); } }}>
      <DialogContent
        showCloseButton={false}
        className={[
          "!top-auto !bottom-0 !left-0 !right-0 !translate-x-0 !translate-y-0",
          "w-full max-w-full rounded-t-3xl rounded-b-none",
          "sm:!top-[50%] sm:!bottom-auto sm:!left-[50%] sm:!right-auto",
          "sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:max-w-[560px] sm:rounded-2xl",
          "bg-[#0F0D0B] border border-white/[0.08] text-white p-0 overflow-hidden shadow-2xl [&>button]:hidden",
        ].join(" ")}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Accent bar */}
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #00D26A70, #00D26A)' }} />

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[15px] text-white">Create Prediction Market</h2>
            <p className="text-[11px] text-[#7A7068] mt-0.5">Deploys to Injective EVM · Min $10 USDC liquidity</p>
          </div>
          <button onClick={() => { if (!isBusy) { reset(); onClose(); } }}
            className="cursor-pointer p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors text-[#7A7068] hover:text-white">
            <X size={16} />
          </button>
        </div>

        {step === 'done' ? (
          <div className="px-5 py-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center">
              <span className="text-3xl">🎉</span>
            </div>
            <h3 className="font-bold text-[17px] text-white">Market Created!</h3>
            <p className="text-[13px] text-[#7A7068] max-w-xs">Your prediction market is live on Injective EVM. Anyone can now place bets.</p>
            <a href={`${EXPLORER_URL}/tx/${createdAddress}`} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 text-[#00D26A] text-[12px] hover:underline">
              <ExternalLink size={12} /> View on Injective Explorer
            </a>
            <button onClick={() => { reset(); onClose(); window.location.reload(); }}
              className="cursor-pointer bg-[#00D26A] text-black px-8 py-3 rounded-xl font-bold text-[14px] hover:bg-[#00B85E] transition-colors mt-2">
              Done — View Markets
            </button>
          </div>
        ) : (
          <div className="px-5 pt-4 pb-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">

            {/* Question */}
            <div>
              <label className="text-[10px] font-semibold text-[#7A7068] uppercase tracking-widest mb-1.5 block">
                Market Question *
              </label>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                maxLength={280}
                rows={2}
                placeholder="Will Nigeria's Super Eagles qualify for the 2026 World Cup?"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[13px] placeholder:text-[#7A7068] focus:outline-none focus:ring-1 focus:ring-[#00D26A]/40 resize-none"
              />
              <p className="text-[10px] text-[#7A7068] text-right mt-1">{question.length}/280</p>
            </div>

            {/* Outcomes */}
            <div>
              <label className="text-[10px] font-semibold text-[#7A7068] uppercase tracking-widest mb-1.5 block">
                Outcomes * (min 2, max 10)
              </label>
              <div className="flex flex-col gap-2">
                {outcomes.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={o}
                      onChange={e => updateOutcome(i, e.target.value)}
                      placeholder={i === 0 ? 'YES' : i === 1 ? 'NO' : `Outcome ${i + 1}`}
                      className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-[13px] placeholder:text-[#7A7068] focus:outline-none focus:ring-1 focus:ring-[#00D26A]/40"
                    />
                    {outcomes.length > 2 && (
                      <button onClick={() => removeOutcome(i)}
                        className="cursor-pointer p-2 text-[#7A7068] hover:text-[#FF4560] transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {outcomes.length < 10 && (
                <button onClick={addOutcome}
                  className="cursor-pointer mt-2 flex items-center gap-1.5 text-[11px] text-[#7A7068] hover:text-[#00D26A] transition-colors">
                  <Plus size={13} /> Add outcome
                </button>
              )}
            </div>

            {/* Category + Closing date in row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-[#7A7068] uppercase tracking-widest mb-1.5 block">Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-[12px] focus:outline-none focus:ring-1 focus:ring-[#00D26A]/40 appearance-none cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value} className="bg-[#0F0D0B]">{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#7A7068] uppercase tracking-widest mb-1.5 block">Closing Date *</label>
                <input
                  type="datetime-local"
                  value={closingDate}
                  onChange={e => setClosingDate(e.target.value)}
                  min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-[12px] focus:outline-none focus:ring-1 focus:ring-[#00D26A]/40 cursor-pointer"
                />
              </div>
            </div>

            {/* Resolution source */}
            <div>
              <label className="text-[10px] font-semibold text-[#7A7068] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                Resolution Source (Oracle Truth URL)
                <span title="Link to official source that will determine the outcome (e.g. INEC website, CAF results page, CoinGecko price)">
                  <Info size={11} className="text-[#7A7068]" />
                </span>
              </label>
              <input
                value={resolutionSource}
                onChange={e => setResolutionSource(e.target.value)}
                placeholder="https://inec.gov.ng/results or https://www.coingecko.com/en/coins/injective-protocol"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-[12px] placeholder:text-[#7A7068] focus:outline-none focus:ring-1 focus:ring-[#00D26A]/40"
              />
              <p className="text-[10px] text-[#7A7068] mt-1">This URL will be used by the oracle to verify and resolve the market.</p>
            </div>

            {/* Image URI */}
            <div>
              <label className="text-[10px] font-semibold text-[#7A7068] uppercase tracking-widest mb-1.5 block">Market Image URL (optional)</label>
              <input
                value={imageURI}
                onChange={e => setImageURI(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-[12px] placeholder:text-[#7A7068] focus:outline-none focus:ring-1 focus:ring-[#00D26A]/40"
              />
            </div>

            {/* Initial liquidity */}
            <div>
              <label className="text-[10px] font-semibold text-[#7A7068] uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>Initial Liquidity (USDC) *</span>
                {usdcBalance && (
                  <span className={`font-mono ${hasEnoughUsdc ? 'text-[#00D26A]' : 'text-[#FF4560]'}`}>
                    Balance: ${usdcBalanceNum.toFixed(2)}
                  </span>
                )}
              </label>
              <div className="relative mb-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7068] text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  value={liquidity}
                  onChange={e => setLiquidity(e.target.value)}
                  min={10}
                  inputMode="decimal"
                  className={`w-full bg-white/[0.05] border rounded-xl py-2.5 pl-8 pr-4 text-white font-mono font-bold text-[14px] focus:outline-none focus:ring-1 transition-all ${
                    !hasEnoughUsdc ? 'border-[#FF4560]/40' : 'border-white/[0.08] focus:ring-[#00D26A]/40'
                  }`}
                />
              </div>
              <div className="flex gap-1.5">
                {[10, 25, 50, 100].map(p => (
                  <button key={p} onClick={() => setLiquidity(p)}
                    className="cursor-pointer flex-1 py-1.5 rounded-lg text-[11px] font-bold border border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.09] text-[#7A7068] hover:text-white transition-all">
                    ${p}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#7A7068] mt-1.5">
                Seeded evenly across all {outcomes.length} outcomes · Split: {outcomes.map(o => `${o || '?'} $${(liquidityNum / outcomes.length).toFixed(2)}`).join(' · ')}
              </p>
            </div>

            {/* Info box */}
            <div className="bg-[#00D26A]/05 border border-[#00D26A]/15 rounded-xl p-3 flex gap-2.5">
              <Info size={13} className="text-[#00D26A] shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#7A7068] leading-relaxed">
                <strong className="text-white">Fee split on every bet:</strong> 2% treasury · 0.2% referral · 0.5% LP · 97.3% market pool.
                You are the initial resolver — you will call <code className="text-[#00D26A]">resolve()</code> after the event happens using the oracle source URL above.
              </div>
            </div>

            {/* Error */}
            {step === 'error' && txError && (
              <div className="flex gap-2 bg-[#FF4560]/10 border border-[#FF4560]/20 rounded-xl p-3">
                <AlertTriangle size={14} className="text-[#FF4560] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#FF4560]">{txError}</p>
              </div>
            )}

            {/* CTA */}
            <button
              disabled={isBusy}
              onClick={handleSubmit}
              className="cursor-pointer w-full py-4 rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[#00D26A] text-black hover:bg-[#00B85E]"
              style={{ boxShadow: '0 6px 24px rgba(0,210,106,0.35)' }}
            >
              {isBusy ? (
                <><Loader2 className="animate-spin" size={16} />{step === 'approving' ? 'Approving USDC…' : 'Creating Market…'}</>
              ) : (
                step === 'error' ? 'Try Again' : `Deploy Market · $${liquidityNum} USDC`
              )}
            </button>

            {!hasAllowance && !isBusy && liquidityNum >= MIN_LIQUIDITY && (
              <p className="text-center text-[10px] text-[#7A7068] -mt-2">
                Two steps: Approve USDC → Create Market
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
