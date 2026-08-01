import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Settings,
  Sparkles,
  DollarSign,
  X,
  Zap,
  Star,
} from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useLeads, useAppointments, useMissedCalls } from '../hooks/useData';
import { formatTime, getGreeting, timeAgo } from '../lib/utils';
import { TestMessage } from '../components/TestMessage';
import { AICoachCard } from '../components/dashboard/AICoachCard';
import { supabase } from '../lib/supabase';
import {
  sampleLeads,
  sampleAppointments,
  sampleActivity,
  shouldShowSampleData,
  SAMPLE_REVENUE_RECOVERED,
} from '../lib/sampleData';

/** Small marker so nothing on screen can be mistaken for real activity. */
const SampleBadge = () => (
  <span className="ml-2 shrink-0 rounded-full bg-[hsl(var(--accent))]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--accent))]">
    Sample
  </span>
);

// Skeleton component for loading states
const MetricCardSkeleton = () => (
  <Card className="p-6 animate-pulse">
    <div className="h-10 w-10 rounded-lg bg-gray-700 mb-2" />
    <div className="h-8 w-16 bg-gray-700 rounded mb-1" />
    <div className="h-4 w-24 bg-gray-700/50 rounded" />
  </Card>
);

const ListSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gray-700 rounded" />
          <div className="h-3 w-48 bg-gray-700/50 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export function DashboardPage() {
  const { profile, business, refreshBusiness } = useAuth();
  const { leads: realLeads, loading: leadsLoading } = useLeads();
  const { appointments: realAppointments, loading: appointmentsLoading } = useAppointments();
  const { missedCalls, loading: callsLoading } = useMissedCalls();
  const [dismissing, setDismissing] = useState(false);

  // Reputation Loop counts — real data from review_requests (0 until jobs are
  // completed with the loop switched on). Never sample data.
  const [reviewStats, setReviewStats] = useState<{
    prepared: number;
    positive: number;
    protected: number;
  } | null>(null);

  useEffect(() => {
    if (!business?.id) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('review_requests')
        .select('sentiment')
        .eq('business_id', business.id);
      if (!active) return;
      const rows = data ?? [];
      setReviewStats({
        prepared: rows.length,
        positive: rows.filter((r) => r.sentiment === 'positive').length,
        protected: rows.filter((r) => r.sentiment === 'negative' || r.sentiment === 'mixed').length,
      });
    })();
    return () => {
      active = false;
    };
  }, [business?.id]);

  const greeting = getGreeting();
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Show sample data only while the account is genuinely empty and new. The
  // moment a real lead arrives, or the user dismisses, real data takes over.
  const showSample = shouldShowSampleData(
    business as { created_at?: string; sample_data_dismissed_at?: string | null } | null,
    realLeads.length > 0
  );

  const leads = showSample ? sampleLeads : realLeads;
  const appointments = showSample ? sampleAppointments : realAppointments;

  const handleDismissSample = async () => {
    if (!business) return;
    setDismissing(true);
    await supabase
      .from('businesses')
      .update({ sample_data_dismissed_at: new Date().toISOString() })
      .eq('id', business.id);
    await refreshBusiness();
    setDismissing(false);
  };

  // Don't block on all loading - show content progressively
  const leadsReady = !leadsLoading;
  const appointmentsReady = !appointmentsLoading;
  const callsReady = !callsLoading;

  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return appointments
      .filter((a) => a.scheduled_date >= today && a.status !== 'cancelled' && a.status !== 'completed')
      .sort((a, b) => {
        if (a.scheduled_date === b.scheduled_date) {
          return a.scheduled_time.localeCompare(b.scheduled_time);
        }
        return a.scheduled_date.localeCompare(b.scheduled_date);
      })
      .slice(0, 5);
  }, [appointments]);

  const recentLeads = useMemo(() => {
    return leads.filter(l => l.status !== 'lost').slice(0, 5);
  }, [leads]);

  const unconvertedLeads = useMemo(() => {
    return leads.filter(l => l.status === 'new' || l.status === 'contacted');
  }, [leads]);

  const conversionRate = useMemo(() => {
    if (leads.length === 0) return 0;
    const converted = leads.filter(l => l.status === 'converted').length;
    return Math.round((converted / leads.length) * 100);
  }, [leads]);

  // Check setup completion
  const setupComplete = business?.name && business?.phone && business?.industry;
  const hasLeads = leads.length > 0;
  const hasAppointments = appointments.length > 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Sample-data banner */}
      {showSample && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col gap-3 rounded-xl border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="font-semibold">This is sample data</span> to show you how
              BusinessPilot works. It'll be replaced by your real data as leads come in.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissSample}
              loading={dismissing}
              className="shrink-0 self-start sm:self-auto"
            >
              <X className="mr-1 h-4 w-4" aria-hidden="true" />
              Dismiss
            </Button>
          </div>
        </motion.div>
      )}

      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{greeting}, {firstName}</h1>
              <p className="text-muted-foreground mt-1">
                {leadsReady && hasLeads
                  ? `You have ${unconvertedLeads.length} leads waiting for response`
                  : 'Your lead capture system is ready'}
              </p>
            </div>
            <div className="flex gap-3">
              <TestMessage onMessageSent={() => {}} />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Setup Banner (shown if setup incomplete) */}
      {!setupComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  Complete Your Setup
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Add your business details to start capturing leads effectively.
                </p>
                <Link to="/settings">
                  <Button size="sm" variant="outline" className="mt-3">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Settings
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* First-time user CTA */}
      {leadsReady && !hasLeads && !hasAppointments && setupComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-8 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 border-primary/20">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Welcome to BusinessPilot!</h3>
                <p className="text-muted-foreground">
                  Your AI-powered lead capture system is ready. Start by testing the messaging system or
                  configure your Twilio integration for live SMS.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <TestMessage onMessageSent={() => {}} />
                <Link to="/integrations">
                  <Button variant="outline">
                    <Phone className="w-4 h-4 mr-2" />
                    Setup SMS
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Revenue recovered — lead with the number that means money. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <DollarSign
              className="h-4 w-4 text-[hsl(var(--success))]"
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-muted-foreground">
              Revenue recovered this month
            </span>
            {showSample && <SampleBadge />}
          </div>
          <p className="mt-2 text-5xl font-extrabold text-[hsl(var(--success))]">
            $
            {(showSample
              ? SAMPLE_REVENUE_RECOVERED
              : realLeads
                  .filter((l) => l.status === 'converted')
                  .reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0)
            ).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            From jobs booked by your AI
          </p>
        </Card>
      </motion.div>

      {/* AI Business Coach */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <AICoachCard hasRealData={realLeads.length > 0} />
      </motion.div>

      {/* Live AI activity */}
      {showSample && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Zap
                className="h-4 w-4 text-[hsl(var(--accent))]"
                aria-hidden="true"
              />
              <h2 className="font-semibold">What your AI has been doing</h2>
              <SampleBadge />
            </div>
            <ul className="space-y-3">
              {sampleActivity.map((item) => (
                <li key={item.id} className="flex items-start gap-3 text-sm">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--success))]"
                    aria-hidden="true"
                  />
                  <span className="flex-1">{item.text}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}

      {/* Real Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {leadsReady ? (
          <>
            <Card className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold">{leads.length}</div>
              <div className="text-sm text-muted-foreground">Total Leads</div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold">{leads.filter(l => l.status === 'converted').length}</div>
              <div className="text-sm text-muted-foreground">Jobs Booked</div>
            </Card>
          </>
        ) : (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        )}

        {callsReady ? (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Phone className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="text-3xl font-bold">{missedCalls.length}</div>
            <div className="text-sm text-muted-foreground">Missed Calls</div>
          </Card>
        ) : (
          <MetricCardSkeleton />
        )}

        {appointmentsReady ? (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold">{upcomingAppointments.length}</div>
            <div className="text-sm text-muted-foreground">Upcoming Jobs</div>
          </Card>
        ) : (
          <MetricCardSkeleton />
        )}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                Recent Leads
                {showSample && <SampleBadge />}
              </h2>
              <Link to="/leads" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>

            {leadsLoading ? (
              <ListSkeleton />
            ) : !hasLeads ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium">No leads yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Connect your business and start capturing enquiries
                </p>
                <TestMessage onMessageSent={() => {}} />
              </div>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {lead.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{lead.name}</p>
                        <Badge
                          variant={
                            lead.status === 'converted'
                              ? 'success'
                              : lead.status === 'new'
                              ? 'primary'
                              : 'muted'
                          }
                        >
                          {lead.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.last_message || lead.service_needed || lead.phone || 'No details'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {timeAgo(lead.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Upcoming Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center">
                Upcoming Jobs
                {showSample && <SampleBadge />}
              </h2>
              <Link to="/appointments" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>

            {appointmentsLoading ? (
              <ListSkeleton />
            ) : !hasAppointments ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium">No scheduled jobs</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Booked jobs will appear here
                </p>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No upcoming jobs scheduled
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="text-center shrink-0">
                      <div className="text-xs text-muted-foreground uppercase">
                        {new Date(apt.scheduled_date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-2xl font-bold">
                        {new Date(apt.scheduled_date).getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{apt.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(apt.scheduled_time)}
                        {apt.service_type && ` - ${apt.service_type}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats */}
      {(hasLeads || hasAppointments) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">At a Glance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {leads.filter(l => l.status === 'new').length}
                </div>
                <div className="text-sm text-muted-foreground">New Leads</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {leads.filter(l => l.status === 'contacted').length}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{conversionRate}%</div>
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {missedCalls.filter(c => c.recovered).length}/{missedCalls.length}
                </div>
                <div className="text-sm text-muted-foreground">Calls Recovered</div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Reputation Loop — real counts from review_requests, never sample data. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-400" aria-hidden="true" />
              Reviews protected
            </h2>
            <Link to="/reviews" className="text-sm text-primary hover:underline shrink-0">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold break-words">{reviewStats?.prepared ?? 0}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Requests prepared</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold break-words text-green-500">
                {reviewStats?.positive ?? 0}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Positive replies</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold break-words text-indigo-400">
                {reviewStats?.protected ?? 0}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Reviews protected</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Completed jobs become review requests automatically. Unhappy customers are caught
            privately before they post. Sending starts once TNZ is connected.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
