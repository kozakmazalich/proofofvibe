import type { ReactNode } from "react";
import { formatCompact, timeAgo } from "@/lib/format";
import type { VibePost } from "@/lib/types";
import SectionTitle from "./SectionTitle";
import { EyeIcon, ExternalIcon, HeartIcon, QuoteIcon, ReplyIcon, RetweetIcon } from "./icons";

/** Highlight project mentions inside the post text. */
function highlight(text: string) {
  const parts = text.split(/(@vibevibefun|@vibevibeeco|vibe\/vibe|#?vibevibe|bg\.vibevibe\.fun)/gi);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-semibold text-vibe">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export default function RecentPosts({ posts, username }: { posts: VibePost[]; username: string }) {
  return (
    <section aria-label="Recent posts" className="animate-rise" style={{ animationDelay: "340ms" }}>
      <SectionTitle
        index="04"
        title="Recent Posts"
        aside={<span className="font-mono text-[10px] text-white/40">{posts.length} latest</span>}
      />

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-8 text-center font-mono text-sm text-white/40">
          No vibe posts found for @{username} yet. Time to post about @vibevibefun ⚡
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((post, i) => (
            <li key={post.id} className="animate-rise" style={{ animationDelay: `${380 + i * 70}ms` }}>
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="group/post block rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-vibe/50 hover:bg-black/60 hover:shadow-[0_0_30px_-12px_#dff904]"
              >
                <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[10px] text-white/40">
                  <span>
                    @{username} · {timeAgo(post.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 opacity-0 transition group-hover/post:text-vibe group-hover/post:opacity-100">
                    open on X <ExternalIcon className="h-3 w-3" />
                  </span>
                </div>
                <p className="text-[15px] leading-relaxed text-white/85 [overflow-wrap:anywhere]">{highlight(post.text)}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-white/45">
                  <Metric icon={<EyeIcon className="h-3.5 w-3.5" />} value={post.metrics.views} label="views" />
                  <Metric icon={<HeartIcon className="h-3.5 w-3.5" />} value={post.metrics.likes} label="likes" />
                  <Metric icon={<ReplyIcon className="h-3.5 w-3.5" />} value={post.metrics.replies} label="replies" />
                  <Metric icon={<RetweetIcon className="h-3.5 w-3.5" />} value={post.metrics.retweets} label="reposts" />
                  <Metric icon={<QuoteIcon className="h-3.5 w-3.5" />} value={post.metrics.quotes} label="quotes" />
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${value} ${label}`}>
      <span className="text-white/30 group-hover/post:text-vibe/70">{icon}</span>
      {formatCompact(value)}
    </span>
  );
}
