import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui';
import { getDailySummary } from '../../lib/api';

interface AICoachCardProps {
  /** True once the business has real leads/appointments to reason about. */
  hasRealData: boolean;
}

/**
 * Daily coach summary. Fetches the cached daily briefing (generated at most once
 * per day server-side). With no real activity yet, shows what the card will
 * become rather than inventing an insight.
 */
export function AICoachCard({ hasRealData }: AICoachCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasRealData) return;
    let active = true;
    setLoading(true);
    getDailySummary()
      .then((res) => {
        if (active) setSummary(res.summary);
      })
      .catch(() => {
        /* leave summary null → falls back to the placeholder copy */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasRealData]);

  // Split the model's "→ recommendation" line out for emphasis, if present.
  const [body, recommendation] = splitRecommendation(summary);

  return (
    <Card className="relative overflow-hidden border-[hsl(var(--accent))]/20 bg-gradient-to-br from-[hsl(var(--accent))]/10 via-card to-[hsl(var(--primary))]/5 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent))]/15">
          <Sparkles className="h-5 w-5 text-[hsl(var(--accent))]" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="font-semibold">Your AI Coach</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Updated daily
            </span>
          </div>

          {loading ? (
            <div className="space-y-2" aria-hidden="true">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ) : hasRealData && summary ? (
            <div className="space-y-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{body}</p>
              {recommendation && (
                <p className="rounded-lg bg-[hsl(var(--accent))]/10 px-3 py-2 text-sm font-medium text-foreground">
                  {recommendation}
                </p>
              )}
            </div>
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

/** Separates a trailing "→ …" recommendation line from the summary body. */
function splitRecommendation(text: string | null): [string, string | null] {
  if (!text) return ['', null];
  const idx = text.indexOf('→');
  if (idx === -1) return [text, null];
  return [text.slice(0, idx).trim(), text.slice(idx).trim()];
}
