import { daysBetween, formatDate, timeAgo } from "@/lib/format";
import type { XStats } from "@/lib/types";
import SectionTitle from "./SectionTitle";
import ScoreChip from "./ScoreChip";
import StatTile from "./StatTile";
import { CalendarIcon, EyeIcon, HeartIcon, PostIcon, QuoteIcon, ReplyIcon, RetweetIcon } from "./icons";

export default function XStatsSection({ x, score }: { x: XStats; score: number }) {
  const span = daysBetween(x.firstMention, x.lastMention);
  const engagement = x.totals.views > 0 ? (x.totals.likes + x.totals.replies + x.totals.retweets + x.totals.quotes) / x.totals.views : 0;

  return (
    <section aria-labelledby="x-stats" className="animate-rise" style={{ animationDelay: "120ms" }}>
      <SectionTitle
        index="01"
        title="X Stats"
        aside={
          <span className="flex items-center gap-2 font-mono text-[10px] text-white/40">
            <span className="hidden sm:inline">ER {(engagement * 100).toFixed(2)}%</span>
            <ScoreChip label="X Score" value={score} />
          </span>
        }
      />
      <h4 id="x-stats" className="sr-only">
        X statistics
      </h4>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Vibe posts" value={x.postCount} icon={<PostIcon />} accent delay={0} hint="mentions of vibe/vibe" />
        <StatTile label="Likes" value={x.totals.likes} icon={<HeartIcon />} delay={80} />
        <StatTile label="Views" value={x.totals.views} icon={<EyeIcon />} accent delay={160} />
        <StatTile label="Replies" value={x.totals.replies} icon={<ReplyIcon />} delay={240} />
        <StatTile label="Reposts" value={x.totals.retweets} icon={<RetweetIcon />} delay={320} />
        <StatTile label="Quotes" value={x.totals.quotes} icon={<QuoteIcon />} delay={400} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DateTile label="First mention" iso={x.firstMention} />
        <DateTile label="Last mention" iso={x.lastMention} />
      </div>
      {span !== null && (
        <p className="mt-3 font-mono text-[11px] text-white/40">
          ⚡ Vibing for <span className="text-vibe">{span} days</span> straight-ish.
        </p>
      )}
    </section>
  );
}

function DateTile({ label, iso }: { label: string; iso: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md transition hover:border-vibe/40">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-vibe/10 text-vibe">
        <CalendarIcon />
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{label}</div>
        <div className="font-display text-base font-semibold text-white">
          {formatDate(iso)}
          {iso && <span className="ml-2 font-mono text-xs font-normal text-white/40">{timeAgo(iso)}</span>}
        </div>
      </div>
    </div>
  );
}
