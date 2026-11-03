"use client";

import { useState, type FormEvent } from "react";
import VibeElectricBorder from "./VibeElectricBorder";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  wallet: string;
  onWalletChange: (value: string) => void;
  onSearch: (username: string, wallet: string) => void;
  loading: boolean;
}

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Everything (username + optional testnet wallet) lives INSIDE the Electric Border,
 * so the border's bottom edge is where the lightning bolt starts.
 */
export default function SearchBar({ value, onChange, wallet, onWalletChange, onSearch, loading }: SearchBarProps) {
  const [walletOpen, setWalletOpen] = useState(false);
  const walletOpenNow = walletOpen || Boolean(wallet);
  const walletInvalid = wallet.length > 0 && !WALLET_RE.test(wallet);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (loading || walletInvalid) return;
    onSearch(value, wallet);
  };

  return (
    <form onSubmit={submit} role="search" className="w-full">
      <VibeElectricBorder
        color="#dff904"
        preset="plasma"
        borderRadius={20}
        speed={loading ? 2.2 : 1}
        intensity={loading ? 1.2 : 0.8}
        arcs={loading ? 3 : 1}
        className="w-full"
      >
        <div className="relative z-[2] rounded-[20px] border border-white/5 bg-[#0b0a10]/90 p-2 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <label htmlFor="username" className="sr-only">
              X username
            </label>
            <span className="pl-3 font-display text-2xl font-semibold text-vibe/80 sm:pl-4 sm:text-3xl" aria-hidden="true">
              @
            </span>
            <input
              id="username"
              name="username"
              value={value}
              onChange={(e) => onChange(e.target.value.replace(/\s/g, ""))}
              placeholder="your_x_username"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={40}
              disabled={loading}
              className="min-w-0 flex-1 bg-transparent py-3 font-display text-lg text-white placeholder:text-white/25 focus:outline-none disabled:opacity-60 sm:py-4 sm:text-2xl"
            />
            <button
              type="submit"
              aria-label={loading ? "Scanning" : "Search"}
              disabled={loading || !value || walletInvalid}
              className="group relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-[14px] bg-vibe px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-black shadow-[0_0_30px_-6px_#dff904] transition hover:shadow-[0_0_44px_-2px_#dff904] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 sm:px-7 sm:py-4 sm:text-base"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M13.5 2 4 13.5h6.5L9 22l11-12.5h-6.8L13.5 2Z" />
                </svg>
              )}
              <span className="hidden xs:inline sm:inline">{loading ? "Scanning" : "Search"}</span>
            </button>
          </div>

          {/* Optional Robinhood testnet wallet — second row inside the border */}
          <div className="mt-2 border-t border-white/5 px-2 pt-2">
            {walletOpenNow ? (
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded-md bg-vibe/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-vibe">
                  testnet
                </span>
                <label htmlFor="wallet" className="sr-only">
                  Robinhood testnet wallet address (optional)
                </label>
                <input
                  id="wallet"
                  value={wallet}
                  onChange={(e) => onWalletChange(e.target.value.trim())}
                  placeholder="0x… wallet on testnet.vibevibe.fun"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={42}
                  disabled={loading}
                  aria-invalid={walletInvalid}
                  aria-describedby={walletInvalid ? "wallet-error" : undefined}
                  className={`min-w-0 flex-1 bg-transparent py-1.5 font-mono text-xs placeholder:text-white/30 focus:outline-none sm:text-sm ${
                    walletInvalid ? "text-[#ff8da1]" : "text-white"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    onWalletChange("");
                    setWalletOpen(false);
                  }}
                  disabled={loading}
                  className="shrink-0 rounded-full px-2 font-mono text-sm text-white/40 transition hover:text-white"
                  aria-label="Remove wallet"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setWalletOpen(true)}
                disabled={loading}
                className="flex items-center gap-2 py-1.5 font-mono text-[11px] text-white/45 transition hover:text-vibe sm:text-xs"
              >
                <span className="grid h-4 w-4 place-items-center rounded-full border border-current text-[10px] leading-none">+</span>
                Add Robinhood testnet wallet (optional)
              </button>
            )}
            {/* Kept INSIDE the border so nothing ever sits between the border and the bolt */}
            {walletInvalid && (
              <p id="wallet-error" className="pb-1 font-mono text-[11px] text-[#ff4d6d]">
                Wallet must be a 0x… address (42 chars)
              </p>
            )}
          </div>
        </div>
      </VibeElectricBorder>
    </form>
  );
}
