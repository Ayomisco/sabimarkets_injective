"use client";

import { useState } from 'react';
import { 
  Bell, Globe, Palette, Shield, Wallet, 
  ChevronRight, Moon, Sun, Monitor, Check,
  TrendingUp, Volume2, Download, Trash2, Eye, EyeOff,
  Zap, User
} from 'lucide-react';
import { useAccount } from 'wagmi';
import Link from 'next/link';

type Section = 'profile' | 'display' | 'notifications' | 'language' | 'trading' | 'security' | 'data';

const NAV_ITEMS = [
  { id: 'profile',       icon: User,       label: 'Profile' },
  { id: 'display',       icon: Palette,    label: 'Display' },
  { id: 'notifications', icon: Bell,       label: 'Notifications' },
  { id: 'language',      icon: Globe,      label: 'Language & Region' },
  { id: 'trading',       icon: TrendingUp, label: 'Trading Preferences' },
  { id: 'security',      icon: Shield,     label: 'Security & Privacy' },
  { id: 'data',          icon: Download,   label: 'Data & Storage' },
] as const;

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`cursor-pointer relative inline-flex w-11 h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-[#00D26A]' : 'bg-white/10'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.05] last:border-0">
      <div>
        <p className="text-[14px] font-medium text-white">{label}</p>
        {description && <p className="text-[12px] text-[#7A7068] mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 ml-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  
  // State
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [currency, setCurrency] = useState('USD');
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [marketUpdates, setMarketUpdates] = useState(true);
  const [resolvedMarkets, setResolvedMarkets] = useState(true);
  const [browserNotifs, setBrowserNotifs] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [confirmTrades, setConfirmTrades] = useState(true);
  const [slippageWarning, setSlippageWarning] = useState(true);
  const [defaultAmount, setDefaultAmount] = useState('10');
  const [hideBalance, setHideBalance] = useState(false);
  const [publicProfile, setPublicProfile] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  function shortenAddress(addr: string) {
    return addr.slice(0, 8) + '···' + addr.slice(-6);
  }

  return (
    <div className="min-h-screen bg-[#080706] text-[#F0EBE1]">
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080706]/90 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/sabimarket-logo.png" alt="SabiMarket" className="w-8 h-8 shrink-0 object-contain" />
              <span className="text-[15px] font-bold text-white tracking-tight">
                Sabi<span className="text-[#00D26A]">Markets</span>
              </span>
            </Link>
            <span className="text-[#7A7068]">/</span>
            <span className="text-[14px] text-white font-semibold">Settings</span>
          </div>
          <Link href="/" className="text-[13px] text-[#7A7068] hover:text-white transition-colors">
            ← Back to Markets
          </Link>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <nav className="w-full lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-24 bg-[#0F0D0B] border border-white/[0.07] rounded-2xl p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as Section)}
                className={`cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all whitespace-nowrap ${
                  activeSection === item.id 
                    ? 'bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/20' 
                    : 'text-[#7A7068] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <item.icon size={15} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          
          {/* ── PROFILE ── */}
          {activeSection === 'profile' && (
            <Section title="Profile" description="Your wallet identity on SabiMarket">
              {isConnected && address ? (
                <>
                  <div className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] mb-6">
                    <div className="w-14 h-14 rounded-2xl"
                         style={{ background: `linear-gradient(135deg, hsl(${parseInt(address.slice(2,4),16)*1.4},80%,55%), hsl(${(parseInt(address.slice(2,4),16)*1.4+140)%360},80%,45%))` }} />
                    <div>
                      <p className="font-bold text-white text-[15px] font-mono">{shortenAddress(address)}</p>
                      <p className="text-[12px] text-[#7A7068] mt-0.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-[#00D26A] rounded-full animate-pulse" />
                        Connected via Polygon
                      </p>
                    </div>
                  </div>
                  <SettingsRow label="Full Wallet Address" description="Your public on-chain address">
                    <button onClick={() => navigator.clipboard.writeText(address)} className="cursor-pointer text-[12px] text-[#00D26A] border border-[#00D26A]/30 bg-[#00D26A]/10 px-3 py-1.5 rounded-lg font-medium hover:bg-[#00D26A]/20 transition-colors">
                      Copy
                    </button>
                  </SettingsRow>
                  <SettingsRow label="Public Profile" description="Allow others to see your portfolio stats">
                    <Toggle enabled={publicProfile} onToggle={() => setPublicProfile(!publicProfile)} />
                  </SettingsRow>
                  <SettingsRow label="Hide Balance" description="Mask your portfolio value in the UI">
                    <Toggle enabled={hideBalance} onToggle={() => setHideBalance(!hideBalance)} />
                  </SettingsRow>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Wallet size={32} className="text-[#7A7068] mb-4" />
                  <h3 className="font-bold text-white mb-2">No Wallet Connected</h3>
                  <p className="text-[#7A7068] text-sm max-w-xs">Connect your wallet to see your profile settings and portfolio data.</p>
                </div>
              )}
            </Section>
          )}

          {/* ── DISPLAY ── */}
          {activeSection === 'display' && (
            <Section title="Display" description="Customize how SabiMarket looks">
              <div className="mb-6">
                <p className="text-[12px] text-[#7A7068] uppercase tracking-wider font-semibold mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dark', icon: Moon, label: 'Dark' },
                    { id: 'light', icon: Sun, label: 'Light' },
                    { id: 'system', icon: Monitor, label: 'System' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={`cursor-pointer flex flex-col items-center gap-2 p-4 rounded-xl border text-[13px] font-medium transition-all ${
                        theme === t.id 
                          ? 'bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]' 
                          : 'border-white/[0.07] text-[#7A7068] hover:border-white/[0.15] hover:text-white'
                      }`}
                    >
                      <t.icon size={20} />
                      {t.label}
                      {theme === t.id && <Check size={12} />}
                    </button>
                  ))}
                </div>
              </div>
              <SettingsRow label="Compact Mode" description="Show more markets per row">
                <Toggle enabled={compactMode} onToggle={() => setCompactMode(!compactMode)} />
              </SettingsRow>
              <SettingsRow label="Show Volume" description="Display trading volume on market cards">
                <Toggle enabled={showVolume} onToggle={() => setShowVolume(!showVolume)} />
              </SettingsRow>
              <SettingsRow label="Display Currency" description="Currency shown for prices and payouts">
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="cursor-pointer bg-white/[0.05] border border-white/[0.08] text-white text-[13px] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00D26A]/50"
                >
                  <option value="USD">USD ($)</option>
                  <option value="NGN">NGN (₦)</option>
                  <option value="KES">KES (KSh)</option>
                  <option value="GHS">GHS (₵)</option>
                  <option value="ZAR">ZAR (R)</option>
                  <option value="ETB">ETB (Br)</option>
                  <option value="EGP">EGP (£)</option>
                  <option value="USDC">USDC</option>
                </select>
              </SettingsRow>
            </Section>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeSection === 'notifications' && (
            <Section title="Notifications" description="Control what, when, and how you get notified">
              <div className="mb-4">
                <p className="text-[12px] text-[#7A7068] uppercase tracking-wider font-semibold mb-1">Market Alerts</p>
              </div>
              <SettingsRow label="Price Alerts" description="Get notified when market odds cross your threshold">
                <Toggle enabled={priceAlerts} onToggle={() => setPriceAlerts(!priceAlerts)} />
              </SettingsRow>
              <SettingsRow label="Market Updates" description="New markets relevant to your interests">
                <Toggle enabled={marketUpdates} onToggle={() => setMarketUpdates(!marketUpdates)} />
              </SettingsRow>
              <SettingsRow label="Resolved Markets" description="Notify when your active bets resolve">
                <Toggle enabled={resolvedMarkets} onToggle={() => setResolvedMarkets(!resolvedMarkets)} />
              </SettingsRow>
              <div className="mt-6 mb-4">
                <p className="text-[12px] text-[#7A7068] uppercase tracking-wider font-semibold mb-1">Channels</p>
              </div>
              <SettingsRow label="Browser Notifications" description="Push alerts directly in your browser">
                <Toggle enabled={browserNotifs} onToggle={() => setBrowserNotifs(!browserNotifs)} />
              </SettingsRow>
              <SettingsRow label="Email Notifications" description="Weekly digest and important alerts">
                <Toggle enabled={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} />
              </SettingsRow>
            </Section>
          )}

          {/* ── LANGUAGE ── */}
          {activeSection === 'language' && (
            <Section title="Language & Region" description="Set your preferred language and locale">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { flag: '🇬🇧', label: 'English',      region: 'Global' },
                  { flag: '🇫🇷', label: 'Français',     region: 'Francophone Africa' },
                  { flag: '🇪🇬', label: 'العربية',      region: 'North Africa' },
                  { flag: '🇦🇴', label: 'Português',    region: 'Lusophone Africa' },
                  { flag: '🇰🇪', label: 'Kiswahili',    region: 'East Africa' },
                  { flag: '🇪🇹', label: 'አማርኛ',        region: 'Ethiopia' },
                  { flag: '🇸🇴', label: 'Soomaali',     region: 'Somalia' },
                  { flag: '🇳🇬', label: 'Hausa',        region: 'West Africa' },
                  { flag: '🇳🇬', label: 'Yorùbá',       region: 'Nigeria / Benin' },
                  { flag: '🇳🇬', label: 'Igbo',         region: 'Nigeria' },
                  { flag: '🇳🇬', label: 'Naija Pidgin', region: 'Nigeria' },
                  { flag: '🇬🇭', label: 'Twi',          region: 'Ghana' },
                  { flag: '🇿🇦', label: 'isiZulu',      region: 'South Africa' },
                  { flag: '🇿🇦', label: 'isiXhosa',     region: 'South Africa' },
                  { flag: '🇷🇼', label: 'Kinyarwanda',  region: 'Rwanda' },
                  { flag: '🇺🇬', label: 'Luganda',      region: 'Uganda' },
                ].map((lang, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <p className="font-semibold text-white text-[13px]">{lang.label}</p>
                      <p className="text-[11px] text-[#7A7068]">{lang.region}</p>
                    </div>
                    {i === 0 && <span className="ml-auto text-[10px] text-[#00D26A] bg-[#00D26A]/10 border border-[#00D26A]/20 px-2 py-0.5 rounded-full font-bold">Active</span>}
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[#7A7068] mt-4">
                To change language, use the globe icon in the top navigation bar. Full AI-assisted translation coming soon.
              </p>
            </Section>
          )}

          {/* ── TRADING ── */}
          {activeSection === 'trading' && (
            <Section title="Trading Preferences" description="Configure how you place bets and interact with markets">
              <SettingsRow label="Confirm Before Trade" description="Show confirmation dialog before placing every bet">
                <Toggle enabled={confirmTrades} onToggle={() => setConfirmTrades(!confirmTrades)} />
              </SettingsRow>
              <SettingsRow label="Slippage Warning" description="Warn when price moves more than 2% before execution">
                <Toggle enabled={slippageWarning} onToggle={() => setSlippageWarning(!slippageWarning)} />
              </SettingsRow>
              <SettingsRow label="Default Bet Amount" description="Pre-fill this amount each time you open the bet modal">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#7A7068] text-sm">$</span>
                  <input
                    type="number"
                    value={defaultAmount}
                    onChange={e => setDefaultAmount(e.target.value)}
                    className="w-20 bg-white/[0.05] border border-white/[0.08] text-white text-[13px] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#00D26A]/50 text-center font-mono"
                  />
                </div>
              </SettingsRow>
              <div className="mt-6 p-4 bg-[#00D26A]/5 border border-[#00D26A]/15 rounded-xl">
                <p className="text-[12px] text-[#00D26A] font-semibold mb-1 flex items-center gap-1.5">
                  <Zap size={12} fill="#00D26A" /> Demo Mode Active
                </p>
                <p className="text-[12px] text-[#7A7068]">
                  All orders are currently simulated on Polygon. Real money trading via CTF Proxy Wallet coming after Builder Grant approval.
                </p>
              </div>
            </Section>
          )}

          {/* ── SECURITY ── */}
          {activeSection === 'security' && (
            <Section title="Security & Privacy" description="Manage your wallet safety and data visibility">
              <SettingsRow label="Hide Portfolio Balance" description="Mask your total portfolio value publicly">
                <Toggle enabled={hideBalance} onToggle={() => setHideBalance(!hideBalance)} />
              </SettingsRow>
              <SettingsRow label="Public Profile" description="Let others see your win rate and trade history">
                <Toggle enabled={publicProfile} onToggle={() => setPublicProfile(!publicProfile)} />
              </SettingsRow>
              <div className="mt-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <p className="text-[12px] font-semibold text-white mb-1">Non-Custodial by Design</p>
                <p className="text-[12px] text-[#7A7068] leading-relaxed">
                  SabiMarket never holds your funds. All trades are signed by your own wallet and executed directly on Polymarket's smart contracts. Your keys = your money.
                </p>
              </div>
              {isConnected && address && (
                <div className="mt-4">
                  <SettingsRow label="Connected Wallet" description="Polygon network — you can disconnect anytime">
                    <span className="text-[12px] font-mono text-[#7A7068]">{address.slice(0,6)}···{address.slice(-4)}</span>
                  </SettingsRow>
                </div>
              )}
            </Section>
          )}

          {/* ── DATA ── */}
          {activeSection === 'data' && (
            <Section title="Data & Storage" description="Manage your local SabiMarket data">
              <SettingsRow label="Clear Local Portfolio Cache" description="Remove locally saved bet positions (does not affect on-chain data)">
                <button className="cursor-pointer text-[12px] text-[#FF4560] border border-[#FF4560]/30 bg-[#FF4560]/10 px-3 py-1.5 rounded-lg font-medium hover:bg-[#FF4560]/20 transition-colors flex items-center gap-1.5">
                  <Trash2 size={12} /> Clear
                </button>
              </SettingsRow>
              <SettingsRow label="Export Trade History" description="Download your bet history as a CSV file">
                <button className="cursor-pointer text-[12px] text-white border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 rounded-lg font-medium hover:bg-white/[0.1] transition-colors flex items-center gap-1.5">
                  <Download size={12} /> Export
                </button>
              </SettingsRow>
              <div className="mt-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl text-[12px] text-[#7A7068] leading-relaxed">
                SabiMarket stores your preferences and simulated portfolio in browser local storage only. No personal data is sent to any server.
              </div>
            </Section>
          )}

        </main>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">{title}</h1>
        <p className="text-[13px] text-[#7A7068]">{description}</p>
      </div>
      <div className="bg-[#0F0D0B] border border-white/[0.07] rounded-2xl px-5 py-1">
        {children}
      </div>
    </div>
  );
}
