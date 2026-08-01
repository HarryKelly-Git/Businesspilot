import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Badge, Spinner, EmptyState, Textarea } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { classifyReviewReply } from '../lib/api';
import { reviewsEnabled, type ReviewRequest } from '../lib/reviews';

function sentimentBadge(s: ReviewRequest['sentiment']) {
  if (s === 'positive') return <Badge variant="success">Positive</Badge>;
  if (s === 'negative') return <Badge variant="destructive">Negative</Badge>;
  if (s === 'mixed') return <Badge variant="warning">Mixed</Badge>;
  return null;
}

export function ReviewsPage() {
  const { business } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [classifying, setClassifying] = useState(false);

  const load = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('review_requests')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });
    setRequests((data as ReviewRequest[]) ?? []);
    setLoading(false);
  }, [business?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const enabled = reviewsEnabled(business?.settings);

  const stats = {
    prepared: requests.length,
    positive: requests.filter((r) => r.sentiment === 'positive').length,
    awaiting: requests.filter((r) => !r.sentiment && r.status !== 'skipped').length,
    // "Reviews protected" = unhappy customers caught privately before they posted.
    protected: requests.filter((r) => r.sentiment === 'negative' || r.sentiment === 'mixed').length,
  };

  const statCards = [
    { label: 'Requests prepared', value: String(stats.prepared) },
    { label: 'Positive replies', value: String(stats.positive) },
    { label: 'Awaiting reply', value: String(stats.awaiting) },
    { label: 'Reviews protected', value: String(stats.protected), highlight: true },
  ];

  const submitReply = async (id: string) => {
    if (!replyText.trim()) {
      toast.error('Paste the reply first');
      return;
    }
    setClassifying(true);
    const res = await classifyReviewReply(id, replyText.trim());
    setClassifying(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Classified as ${res.sentiment}`);
    setReplyFor(null);
    setReplyText('');
    await load();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Star className="w-7 h-7 text-indigo-400 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold">Reputation Loop</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Completed jobs turn into Google reviews automatically — and unhappy customers get caught
        privately before they post publicly.{' '}
        {!enabled && (
          <span className="text-warning">
            Turn it on and add your review link in Settings → Reviews to start.
          </span>
        )}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={`p-4 ${s.highlight ? 'border-indigo-500/40 col-span-2 md:col-span-1' : ''}`}
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 break-words ${s.highlight ? 'text-indigo-400' : ''}`}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Send — deliberately disabled until the SMS provider is live. */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span title="SMS sending will be enabled once TNZ is connected" className="inline-block">
          <Button disabled className="gap-2 cursor-not-allowed">
            <Send className="w-4 h-4" /> Send review requests
          </Button>
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Sending is disabled until TNZ is connected. Requests are prepared and tracked now.
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={<Star className="w-10 h-10" />}
            title="No review requests yet"
            description={
              enabled
                ? 'Mark an appointment complete and a review request will be scheduled here automatically.'
                : 'Turn on the Reputation Loop in Settings → Reviews, then completed jobs will show up here.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {r.customer_name || '(no name)'}
                    {r.customer_phone ? ` · ${r.customer_phone}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.service_type || 'Job'} ·{' '}
                    {r.status === 'replied' ? 'Replied' : 'Scheduled to ask'}{' '}
                    {new Date(r.scheduled_for).toLocaleDateString('en-NZ')}
                  </p>
                </div>
                <div className="shrink-0">
                  {r.sentiment ? sentimentBadge(r.sentiment) : <Badge variant="muted">{r.status}</Badge>}
                </div>
              </div>

              {/* Prepared "how did it go?" ask (before a reply exists) */}
              {r.ask_message && !r.sentiment && (
                <p className="mt-3 text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                  {r.ask_message}
                </p>
              )}

              {/* Branched follow-up, prepared from the classified sentiment */}
              {r.sentiment && r.followup_message && (
                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Prepared reply{' '}
                    {r.sentiment === 'positive'
                      ? '(+ review link)'
                      : '(no link — flagged for your call)'}
                    :
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{r.followup_message}</p>
                </div>
              )}

              {r.owner_alert_prepared && r.owner_alert_message && (
                <div className="mt-2 rounded-lg border border-amber-500/30 p-3 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {r.owner_alert_message}
                  </p>
                </div>
              )}

              {/* Log a real reply and run it through the AI classifier */}
              {!r.sentiment &&
                (replyFor === r.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      label="Paste the customer's reply"
                      placeholder="e.g. Yeah the guys were great, tidy job — thanks!"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="min-h-[70px]"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => submitReply(r.id)}
                        loading={classifying}
                        className="gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Classify &amp; prepare follow-up
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReplyFor(null);
                          setReplyText('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setReplyFor(r.id);
                        setReplyText('');
                      }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Log a reply
                    </Button>
                  </div>
                ))}
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
        Replies are classified by AI (Claude Haiku). Only positive repliers are asked for a public
        review; unhappy customers are kept private and flagged to you.
      </p>
    </div>
  );
}
