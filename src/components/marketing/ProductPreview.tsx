import { Send, Check, Sparkles, Target } from 'lucide-react';

// Static, on-brand snapshot of the in-app "Today" screen for the marketing hero.
// This is NOT the live app — it's a hand-built mock composed from the same design
// tokens and card language as MatchCard / TodayScreen, so the preview reads as the
// real product without pulling in authenticated data. Rendered desktop-only (the
// hero wraps it in `hidden lg:block`). No gradient / glow — depth is a contact
// shadow and a single offset panel, per the design system.
export function ProductPreview() {
  return (
    <div className="relative">
      {/* Depth: a second panel offset behind. Contact shadow only. */}
      <div
        aria-hidden
        className="absolute -right-5 -top-5 hidden h-full w-full rounded-3xl border border-border/50 bg-surface-muted/40 xl:block"
      />

      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-lg">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted/20" />
          <span className="ml-2 text-caption text-foreground-muted">Circle — Today</span>
        </div>

        <div className="space-y-4 p-5">
          {/* Operator line + headline, mirroring TodayScreen's voice */}
          <div>
            <p className="text-caption text-foreground-secondary">
              Overnight I looked across your Ideas and Circle.
            </p>
            <p className="mt-1 text-title-3 text-foreground">3 Matches waiting for you.</p>
          </div>

          {/* The drafted Move — the money shot: "we draft it, you hit Send" */}
          <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-caption-bold text-primary">
                DK
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-caption-bold text-foreground">Dana Kove</p>
                <p className="truncate text-caption text-foreground-secondary">
                  VP Engineering · Northwind
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Target className="h-3 w-3" />
                Customer
              </span>
            </div>

            <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              Drafted Move · LinkedIn DM
            </p>
            <p className="mt-1.5 rounded-xl border border-border/50 bg-card/80 p-3 text-caption leading-relaxed text-foreground">
              Dana — saw Northwind is scaling the platform team. I packaged the fractional
              CTO sprint we sketched last spring. Worth 20 minutes this week?
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-caption-bold text-primary-foreground shadow-sm">
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
              <button className="inline-flex h-9 items-center justify-center rounded-full border border-border/60 px-4 text-caption font-medium text-foreground-secondary">
                Edit
              </button>
            </div>
          </div>

          {/* A second match, condensed */}
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
              RM
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-caption-bold text-foreground">Raj Mehta</p>
              <p className="truncate text-caption text-foreground-secondary">Founder · Tella</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
              <Sparkles className="h-3 w-3" />
              Warm
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
            <Check className="h-3 w-3 text-primary" />
            Match Engine ran 6 hours ago
          </div>
        </div>
      </div>
    </div>
  );
}
