import type { ReactNode } from "react";
import { formatFull, timeAgo } from "@/lib/format";
import type { TestnetStats } from "@/lib/types";
import SectionTitle from "./SectionTitle";
import ScoreChip from "./ScoreChip";
import StatTile from "./StatTile";
import { ExternalIcon } from "./icons";

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
const APP = "https://testnet.vibevibe.fun";

export function formatEth(n: number, signed = false) {
  const sign = signed && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  if (abs === 0) return "0 ETH";
  if (abs < 0.0001) return `${n < 0 ? "-" : sign}<0.0001 ETH`;
  const digits = abs >= 100 ? 1 : abs >= 1 ? 3 : 4;
  return `${sign}${n.toLocaleString("en-US", { maximumFractionDigits: digits })} ETH`;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function TestnetSection({ testnet, score }: { testnet: TestnetStats; score: number | null }) {
  return (
    <section aria-label="Robinhood testnet activity" className="animate-rise" style={{ animationDelay: "270ms" }}>
      <SectionTitle
        index="03"
        title="Testnet Activity"
        aside={
          <a
            href={testnet.wallet ? `${APP}/traders/${testnet.wallet}` : APP}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-white/40 transition hover:text-vibe"
          >
            testnet.vibevibe.fun <ExternalIcon className="h-3 w-3" />
          </a>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10px] text-white/45">
        <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1">Robinhood Chain Testnet · 46630</span>
        {testnet.wallet && (
          <a
            href={`${EXPLORER}/address/${testnet.wallet}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-vibe/30 bg-vibe/10 px-2.5 py-1 text-vibe transition hover:bg-vibe hover:text-black"
          >
            {short(testnet.wallet)} ↗
          </a>
        )}
        {testnet.status === "ok" && (
          <span className="rounded-full bg-vibe/15 px-2.5 py-1 uppercase tracking-wider text-vibe">live on-chain data</span>
        )}
        {score !== null && <ScoreChip label="Testnet Score" value={score} className="ml-auto" />}
      </div>

      {testnet.status === "no-wallet" && (
        <Notice>
          Add your <span className="text-white">0x… wallet</span> in the search to pull your real on-chain activity from{" "}
          <a href={APP} target="_blank" rel="noreferrer" className="text-vibe hover:underline">
            testnet.vibevibe.fun
          </a>
          . It gives you a separate <span className="text-vibe">Testnet Score</span> (0–100) on your card.
        </Notice>
      )}
      {testnet.status === "unavailable" && (
        <Notice>⚠️ {testnet.error ?? "Testnet data is unavailable right now."} Try again in a minute.</Notice>
      )}
      {testnet.status === "empty" && (
        <Notice>
          No trades found for this wallet on the testnet yet.{" "}
          <a href={APP} target="_blank" rel="noreferrer" className="text-vibe hover:underline">
            Make your first trade →
          </a>
        </Notice>
      )}

      {testnet.status === "ok" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label="Trades" value={testnet.buyCount + testnet.sellCount} accent hint={`${testnet.buyCount} buys · ${testnet.sellCount} sells`} />
            <TextTile label="Volume" value={formatEth(testnet.volumeEth)} hint={`30d: ${formatEth(testnet.volume30dEth)}`} accent />
            <StatTile label="Tokens traded" value={testnet.tokensTraded} hint={`${testnet.openPositions} open positions`} delay={120} />
            <TextTile
              label="Total PnL"
              value={formatEth(testnet.pnlEth, true)}
              tone={testnet.pnlEth >= 0 ? "up" : "down"}
              hint={`realized ${formatEth(testnet.realizedPnlEth, true)}`}
            />
            <TextTile label="Equity" value={formatEth(testnet.equityEth)} hint="current holdings value" />
            <TextTile
              label="Win rate"
              value={testnet.winRate === null ? "—" : `${Math.round(testnet.winRate * 100)}%`}
              hint="profitable closes"
            />
          </div>

          {testnet.recentActivity.length > 0 && (
            <ul className="mt-3 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md">
              {testnet.recentActivity.map((a) => (
                <li key={a.id}>
                  <a
                    href={`${EXPLORER}/tx/${a.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group/tx flex items-center gap-3 px-4 py-3 font-mono text-xs transition hover:bg-vibe/[0.06]"
                  >
                    <span
                      className={`w-11 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold ${
                        a.type === "BUY"
                          ? "bg-vibe/15 text-vibe"
                          : a.type === "SELL"
                            ? "bg-[#ff4d6d]/15 text-[#ff8da1]"
                            : "bg-white/10 text-white/60"
                      }`}
                    >
                      {a.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-white/70">token {short(a.tokenAddress)}</span>
                    {a.amountEth !== null && <span className="shrink-0 text-white">{formatEth(a.amountEth)}</span>}
                    <span className="hidden w-16 shrink-0 text-right text-white/35 sm:inline">{timeAgo(a.occurredAt)}</span>
                    <ExternalIcon className="h-3 w-3 shrink-0 text-white/30 group-hover/tx:text-vibe" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          {testnet.asOfBlock && (
            <p className="mt-2 font-mono text-[10px] text-white/30">indexed through block #{formatFull(Number(testnet.asOfBlock))}</p>
          )}
        </>
      )}
    </section>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-black/35 p-5 text-sm leading-relaxed text-white/55 backdrop-blur-md">
      {children}
    </div>
  );
}

function TextTile({
  label,
  value,
  hint,
  accent,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  tone?: "up" | "down";
}) {
  const color = tone === "up" ? "text-vibe" : tone === "down" ? "text-[#ff8da1]" : accent ? "text-vibe text-glow" : "text-white";
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 ${
        accent ? "border-vibe/40 bg-vibe/[0.08] hover:border-vibe/70" : "border-white/10 bg-black/40 hover:border-vibe/40"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className={`mt-2 truncate font-display text-xl font-bold leading-none sm:text-2xl ${color}`} title={value}>
        {value}
      </div>
      {hint && <p className="mt-1.5 truncate font-mono text-[10px] text-white/35">{hint}</p>}
    </div>
  );
}
