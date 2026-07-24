import { Sparkles } from 'lucide-react';
import { Card } from '../ui';

interface AICoachCardProps {
  /** True once the business has real leads/appointments to reason about. */
  hasRealData: boolean;
  insight?: string | null;
  loading?: boolean;
}

/**
 * Daily coach summary. When there's no real activity yet we show what the card
 * will become rather than inventing an insight — a fabricated "you booked 3
 * jobs overnight" on day one is the fastest way to lose a new user's trust.
 */
export function AICoachCard({ hasRealData, insight, loading }: AICoachCardProps) {
  return (
    <Card className="relative overflow-hidden border-[hsl(var(--accent))]/20 bg-gradient-to-br from-[hsl(var(--accent))]/10 via-card to-[hsl(var(--primary))]/5 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))]/15">
          <Sparkles
            className="h-5 w-5 text-[hsl(var(--accent))]"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-semibold">AI Business Coach</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Updated daily
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ) : hasRealData && insight ? (
            <p className="text-sm leading-relaxed text-foreground">{insight}</p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your AI coach will appear here once you start receiving enquiries. Once
              BusinessPilot starts capturing leads, you'll get a daily summary of what your AI
              did overnight, which leads are worth following up manually, and personalised
              recommendations to help you book more jobs.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
