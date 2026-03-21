"use client";

import { useState, useRef, useEffect } from 'react';
import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { 
  Copy, ExternalLink, Settings, LogOut, ChevronDown, 
  CheckCircle, Wallet, User, TrendingUp
} from 'lucide-react';
import { useRouter } from '@/i18n/routing';

function shortenAddress(addr: string) {
  return addr.slice(0, 6) + '···' + addr.slice(-4);
}

function generateAvatarColors(addr: string) {
  // deterministic gradient from address
  const h1 = parseInt(addr.slice(2, 4), 16) * 1.4;
  const h2 = (h1 + 140) % 360;
  return `linear-gradient(135deg, hsl(${h1},80%,55%) 0%, hsl(${h2},80%,45%) 100%)`;
}

export function WalletMenu() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { openConnectModal } = useConnectModal();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleViewOnInjective = () => {
    if (address) window.open(`https://testnet.blockscout.injective.network/address/${address}`, '_blank');
  };

  if (!mounted) {
    return <div className="w-[120px] h-10 bg-white/[0.05] border border-white/[0.09] rounded-xl animate-pulse" />;
  }

  if (!isConnected || !address) {
    return (
      <button
        onClick={openConnectModal}
        className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-[#00D26A] hover:bg-[#00B85E] text-black text-[13px] font-bold rounded-xl transition-all"
      >
        <Wallet size={13} />
        <span>Connect</span>
      </button>
    );
  }

  const gradient = generateAvatarColors(address);
  const short = shortenAddress(address);

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.09] rounded-xl px-3 py-1.5 transition-all group"
      >
        {/* Avatar */}
        <div 
          className="w-6 h-6 rounded-full shrink-0 ring-1 ring-white/10"
          style={{ background: gradient }}
        />
        {/* Address striped look */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="font-mono text-[12px] text-white font-semibold tracking-tight">{short}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[3px] h-[10px] rounded-full opacity-60"
                   style={{ background: gradient, opacity: 0.4 + i * 0.12 }} />
            ))}
          </div>
        </div>
        <ChevronDown size={12} className={`text-[#7A7068] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#0F0D0B] border border-white/[0.09] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-up">
          
          {/* Profile Header */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl ring-2 ring-white/10 flex-shrink-0"
                   style={{ background: gradient }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-[14px] truncate">{short}</p>
                <p className="text-[11px] text-[#7A7068] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D26A] animate-pulse inline-block" />
                  Connected · Injective EVM
                </p>
              </div>
            </div>
            {balance && (
              <div className="flex items-center justify-between bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.06]">
                <div className="flex items-center gap-2 text-[12px] text-[#7A7068]">
                  <Wallet size={12} />
                  <span>Balance</span>
                </div>
                <span className="font-mono text-sm font-bold text-white">
                  {(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} {balance.symbol}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-2">
            <MenuItem 
              icon={copied ? CheckCircle : Copy} 
              label={copied ? 'Copied!' : 'Copy Address'} 
              onClick={handleCopy}
              color={copied ? '#00D26A' : undefined}
            />
            <MenuItem
              icon={ExternalLink}
              label="View on Injective Explorer"
              onClick={handleViewOnInjective}
            />
            <MenuItem 
              icon={TrendingUp} 
              label="My Portfolio" 
              onClick={() => { setIsOpen(false); }} 
            />
            <MenuItem 
              icon={Settings} 
              label="Settings" 
              onClick={() => { setIsOpen(false); router.push('/settings'); }} 
            />
          </div>

          {/* Divider + Disconnect */}
          <div className="border-t border-white/[0.06] p-2">
            <button
              onClick={() => { disconnect(); setIsOpen(false); }}
              className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#FF4560] hover:bg-[#FF4560]/10 transition-colors text-[13px] font-semibold"
            >
              <LogOut size={14} />
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, color }: { icon: any; label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#ccc] hover:bg-white/[0.05] hover:text-white transition-colors text-[13px] font-medium"
    >
      <Icon size={14} style={color ? { color } : {}} />
      <span style={color ? { color } : {}}>{label}</span>
    </button>
  );
}
