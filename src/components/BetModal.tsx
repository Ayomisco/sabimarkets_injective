"use client";

import { useState, useEffect } from 'react';
import { Market } from '@/lib/polymarket/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Loader2, Zap, ArrowUpRight, ArrowDownRight, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useToast } from '@/components/Toast';
import { formatUnits, parseUnits } from 'viem';

const USDC_ADDRESS = (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS ||
  '0x652144cAEaB64754F712Bd4D490F9E423397369c') as `0x${string}`;

const USDC_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

const SABIMARKET_ABI = [
  {
    name: 'placeBet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'outcomeIndex', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'referrer', type: 'address' },
    ],
    outputs: [],
  },
] as const;

const EXPLORER_URL = process.env.NEXT_PUBLIC_INJ_EVM_EXPLORER_URL || 'https://testnet.blockscout.injective.network';

export function BetModal({
  isOpen, onClose, market, selectedOutcome: initialOutcome,
}: {
  isOpen: boolean; onClose: () => void; market: Market | null;
  selectedOutcome: string | null; currentPrice?: number;
}) {
  const [amount, setAmount] = useState<number | string>(10);
  const [selectedOutcome, setSelectedOutcome] = useState<string>(initialOutcome || "YES");
  const [step, setStep] = useState<'idle' | 'approving' | 'approved' | 'betting' | 'done' | 'error'>('idle');
  const [txError, setTxError] = useState('');
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [betTxHash, setBetTxHash] = useState<`0x${string}` | undefined>();

  const { address } = useAccount();
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();
  const { writeContractAsync } = useWriteContract();

  const marketAddress = market?.marketAddress as `0x${string}` | undefined;
  const validAmount = typeof amount === 'string' && amount === "" ? 0 : Number(amount);
  const amountWei = parseUnits(validAmount.toString(), 6); // USDC 6 decimals

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read USDC allowance for this market
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address && marketAddress ? [address, marketAddress] : undefined,
  });

  // Wait for approve tx
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });

  // Wait for bet tx
  const { isSuccess: betConfirmed } = useWaitForTransactionReceipt({ hash: betTxHash });

  // Sync outcome when modal opens
  useEffect(() => {
    if (initialOutcome && isOpen) setSelectedOutcome(initialOutcome);
  }, [initialOutcome, isOpen]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) { setStep('idle'); setTxError(''); setApproveTxHash(undefined); setBetTxHash(undefined); }
  }, [isOpen]);

  // When approve confirms, auto-place bet
  useEffect(() => {
    if (approveConfirmed && step === 'approving') {
      setStep('approved');
      refetchAllowance();
      placeBetTx();
    }
  }, [approveConfirmed]);

  // When bet confirms, show done
  useEffect(() => {
    if (betConfirmed && step === 'betting') {
      setStep('done');
      toastSuccess('Bet placed!', `${shares} ${selectedOutcome} shares confirmed on Injective.`);
      setTimeout(() => { onClose(); setStep('idle'); }, 2500);
    }
  }, [betConfirmed]);

  if (!market || !selectedOutcome) return null;

  const outcomes = market.outcomes || ["YES", "NO"];
  const outcomeIndex = Math.max(0, outcomes.findIndex(o => o.toLowerCase() === selectedOutcome.toLowerCase()));

  let accentColor = '#00D26A';
  if (outcomes.length === 2) {
    accentColor = outcomeIndex === 0 ? '#00D26A' : '#FF4560';
  } else if (outcomes.length > 2) {
    if (outcomeIndex === outcomes.length - 1) accentColor = '#FF4560';
    else if (outcomeIndex > 0) accentColor = '#3B82F6';
  }

  const selectedPrice = parseFloat(market.outcomePrices?.[outcomeIndex] || "0.5");
  const price = Math.max(0.01, Math.min(0.99, selectedPrice));
  const shares = price > 0 ? (validAmount / price).toFixed(1) : "0.0";
  const potentialPayoutDollars = parseFloat(shares);
  const profitDollars = potentialPayoutDollars - validAmount;
  const roi = validAmount > 0 ? ((profitDollars / validAmount) * 100).toFixed(0) : "0";

  const usdcBalanceFormatted = usdcBalance
    ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : null;
  const hasEnoughUsdc = usdcBalance
    ? Number(formatUnits(usdcBalance as bigint, 6)) >= validAmount : true;
  const hasEnoughAllowance = usdcAllowance ? (usdcAllowance as bigint) >= amountWei : false;

  const isBusy = step === 'approving' || step === 'approved' || step === 'betting';

  const placeBetTx = async () => {
    if (!address || !marketAddress) return;
    try {
      setStep('betting');
      toastInfo('Confirming bet…', 'Waiting for transaction on Injective.');
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: SABIMARKET_ABI,
        functionName: 'placeBet',
        args: [BigInt(outcomeIndex), amountWei, '0x0000000000000000000000000000000000000000'],
      });
      setBetTxHash(hash);
    } catch (err: unknown) {
      handleError(err);
    }
  };

  const handleError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    let friendly = 'Something went wrong. Please try again.';
    if (msg.includes('rejected') || msg.includes('User rejected')) friendly = 'Transaction rejected — no bet placed.';
    else if (msg.includes('insufficient balance')) friendly = 'Insufficient USDC balance.';
    else if (msg !== 'Unknown error') friendly = msg.slice(0, 120);
    setTxError(friendly);
    setStep('error');
    toastError('Transaction failed', friendly);
  };

  const handlePlaceOrder = async () => {
    if (!address) { toastError('Wallet not connected', 'Please connect your wallet first.'); return; }
    if (validAmount <= 0) { toastWarning('Invalid amount', 'Enter an amount greater than 0.'); return; }
    if (!hasEnoughUsdc) { toastError('Insufficient USDC', `You need $${validAmount} USDC. Balance: $${usdcBalanceFormatted}.`); return; }
    if (!marketAddress) { toastError('Market unavailable', 'Market address not found.'); return; }

    setTxError('');

    if (!hasEnoughAllowance) {
      try {
        setStep('approving');
        toastInfo('Approving USDC…', 'Please confirm in your wallet.');
        const hash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [marketAddress, amountWei],
        });
        setApproveTxHash(hash);
      } catch (err: unknown) {
        handleError(err);
      }
    } else {
      await placeBetTx();
    }
  };

  const statusLabel = {
    idle: `Buy ${selectedOutcome} · ${shares} Shares`,
    approving: 'Approving USDC…',
    approved: 'Approval confirmed…',
    betting: 'Confirming bet…',
    done: '✓ Bet Placed!',
    error: 'Try Again',
  }[step];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className={[
          "!top-auto !bottom-0 !left-0 !right-0 !translate-x-0 !translate-y-0",
          "w-full max-w-full rounded-t-3xl rounded-b-none",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom transition-transform duration-300",
          "sm:!top-[50%] sm:!bottom-auto sm:!left-[50%] sm:!right-auto",
          "sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:max-w-[420px] sm:rounded-2xl",
          "bg-[#0F0D0B] border border-white/[0.08] text-white p-0 overflow-hidden shadow-2xl [&>button]:hidden",
        ].join(" ")}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accentColor}70, ${accentColor})` }} />

        <div className="px-5 pt-4 pb-3 border-b border-white/[0.06] flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
                   style={{ color: accentColor, backgroundColor: `${accentColor}18`, borderColor: `${accentColor}30` }}>
                {outcomeIndex === 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} Betting {selectedOutcome}
              </div>
              <span className="text-[10px] text-[#7A7068] flex items-center gap-1">
                <Zap size={9} className="text-[#00D26A]" /> On-chain · Injective EVM
              </span>
            </div>
            <p className="text-[13px] text-[#7A7068] leading-snug line-clamp-2">{market.question}</p>
          </div>
          <button onClick={onClose}
            className="cursor-pointer p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors shrink-0 text-[#7A7068] hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-6 flex flex-col gap-4 overflow-y-auto max-h-[72vh] sm:max-h-none">

          {/* Outcome Selector */}
          <div className={`grid gap-2 ${outcomes.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {outcomes.map((outcome, idx) => {
              const p = parseFloat(market.outcomePrices?.[idx] || "0.5");
              const priceCents = Math.round(p * 100);
              const isSelected = selectedOutcome?.toLowerCase() === outcome.toLowerCase();
              let activeColor = '#00D26A';
              let shadowColor = 'rgba(0,210,106,0.35)';
              let textColor = '#000';
              if (outcomes.length > 2) {
                if (idx === outcomes.length - 1) { activeColor = '#FF4560'; shadowColor = 'rgba(255,69,96,0.35)'; textColor = '#fff'; }
                else if (idx > 0) { activeColor = '#3B82F6'; shadowColor = 'rgba(59,130,246,0.35)'; textColor = '#fff'; }
              } else if (idx === 1) { activeColor = '#FF4560'; shadowColor = 'rgba(255,69,96,0.35)'; textColor = '#fff'; }
              return (
                <button key={outcome} onClick={() => setSelectedOutcome(outcome)}
                  className="cursor-pointer py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 transition-all"
                  style={isSelected
                    ? { backgroundColor: activeColor, borderColor: activeColor, color: textColor, boxShadow: `0 4px 18px ${shadowColor}` }
                    : { borderColor: 'rgba(255,255,255,0.08)', color: '#7A7068' }}>
                  {idx === 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {outcome.toUpperCase()} · {priceCents}¢
                </button>
              );
            })}
          </div>

          {/* USDC balance */}
          {usdcBalanceFormatted && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#7A7068]">USDC Balance</span>
              <span className={`font-mono font-bold ${hasEnoughUsdc ? 'text-[#00D26A]' : 'text-[#FF4560]'}`}>
                ${usdcBalanceFormatted}
              </span>
            </div>
          )}

          {/* Amount input */}
          <div>
            <p className="text-[10px] font-semibold text-[#7A7068] uppercase tracking-widest mb-2">Amount (USDC)</p>
            <div className="relative mb-2">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7068] text-sm pointer-events-none">$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                inputMode="decimal"
                className={`w-full bg-white/[0.05] border rounded-xl py-3 pl-8 pr-4 text-white font-mono font-bold text-[15px] focus:outline-none transition-all ${
                  !hasEnoughUsdc ? 'border-[#FF4560]/40' : 'border-white/[0.08] focus:ring-1'
                }`}
                style={hasEnoughUsdc ? { '--tw-ring-color': accentColor } as React.CSSProperties : {}}
              />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 25, 50, 100].map(p => (
                <button key={p} onClick={() => setAmount(p)}
                  className="cursor-pointer py-2 rounded-lg text-[11px] font-bold border border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.09] text-[#7A7068] hover:text-white transition-all">
                  ${p}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.022] divide-y divide-white/[0.05]">
            <div className="flex justify-between items-center px-4 py-2.5 text-[12px]">
              <span className="text-[#7A7068]">Shares</span>
              <span className="font-mono font-bold text-white">{shares}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5 text-[12px]">
              <span className="text-[#7A7068]">Avg Price</span>
              <span className="font-mono font-bold text-white">{(price * 100).toFixed(1)}¢</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5 text-[12px]">
              <span className="text-[#7A7068]">Potential Return</span>
              <span className="font-mono font-bold" style={{ color: accentColor }}>
                ${profitDollars.toFixed(2)} (+{roi}%)
              </span>
            </div>
            {!hasEnoughAllowance && validAmount > 0 && (
              <div className="flex justify-between items-center px-4 py-2.5 text-[11px]">
                <span className="text-[#7A7068]">Steps</span>
                <span className="text-[#F5A623]">Approve USDC → Place Bet</span>
              </div>
            )}
          </div>

          {/* Error */}
          {step === 'error' && txError && (
            <div className="flex gap-2 bg-[#FF4560]/10 border border-[#FF4560]/20 rounded-xl p-3">
              <AlertTriangle size={14} className="text-[#FF4560] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#FF4560] leading-snug">{txError}</p>
            </div>
          )}

          {/* CTA */}
          <button
            disabled={isBusy || validAmount <= 0 || !hasEnoughUsdc || step === 'done'}
            onClick={handlePlaceOrder}
            className="cursor-pointer w-full py-4 rounded-xl font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              backgroundColor: step === 'done' ? '#00D26A' : accentColor,
              color: step === 'done' || accentColor === '#00D26A' ? '#000' : '#fff',
              boxShadow: `0 6px 24px ${accentColor}45`
            }}
          >
            {isBusy ? <><Loader2 className="animate-spin" size={16} /> {statusLabel}</> : statusLabel}
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-[#7A7068] -mt-2">
            <span>Max win: ${potentialPayoutDollars.toFixed(2)}</span>
            <span>·</span>
            <span>Max loss: ${validAmount.toFixed(2)}</span>
            {betTxHash && (
              <>
                <span>·</span>
                <a href={`${EXPLORER_URL}/tx/${betTxHash}`} target="_blank"
                   className="flex items-center gap-1 hover:text-white transition-colors">
                  <ExternalLink size={9} /> Injective Explorer
                </a>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
