import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  MessageSquare,
  Users,
  Calendar,
  Sparkles,
  CreditCard,
  Building,
  CalendarClock,
  Webhook,
  Globe,
  FileText,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

type Status = 'live' | 'needs_setup' | 'coming_soon';

interface Capability {
  title: string;
  plainEnglish: string;
  status: Status;
  icon: React.ReactNode;
  /** What the owner should do next, when there's something to do. */
  action?: { label: string; to: string };
}

function StatusPill({ status }: { status: Status }) {
  switch (status) {
    case 'live':
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle className="w-4 h-4" aria-hidden="true" />
          Working
        </span>
      );
    case 'needs_setup':
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warning">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          Needs your input
        </span>
      );
    case 'coming_soon':
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Clock className="w-4 h-4" aria-hidden="true" />
          Coming soon
        </span>
      );
  }
}

export function IntegrationsPage() {
  const { business } = useAuth();
  const { subscription } = useSubscription(business?.id ?? null);

  const settings = (business?.settings ?? {}) as Record<string, unknown>;
  const hasPhone = Boolean(business?.phone);
  const hasProfile = Boolean(business?.name && business?.industry);
  const hasVoice = Boolean(settings.businessDescription || settings.responseTone);
  const hasServices = Array.isArray(settings.services) && settings.services.length > 0;

  // Every status below is derived from real account data. Nothing is hardcoded
  // to "connected" — if we can't verify it, we don't claim it.
  const capabilities: Capability[] = [
    {
      title: 'Answering enquiries day and night',
      plainEnglish:
        'When someone texts your business number, they get a real reply within seconds — including at 11pm on a Sunday.',
      status: hasPhone ? 'live' : 'needs_setup',
      icon: <MessageSquare className="w-5 h-5" />,
      action: hasPhone ? undefined : { label: 'Add your number', to: '/settings' },
    },
    {
      title: 'Capturing every lead',
      plainEnglish:
        'Every enquiry is saved with the name, number and what they asked for — so nothing gets lost in a text thread.',
      status: hasProfile ? 'live' : 'needs_setup',
      icon: <Users className="w-5 h-5" />,
      action: hasProfile ? undefined : { label: 'Finish your profile', to: '/settings' },
    },
    {
      title: 'Asking the right questions for your trade',
      plainEnglish:
        'The AI knows what to ask for your line of work — whether a job is urgent, what the address is, what needs doing.',
      status: hasProfile ? 'live' : 'needs_setup',
      icon: <Sparkles className="w-5 h-5" />,
      action: hasProfile ? undefined : { label: 'Pick your trade', to: '/settings' },
    },
    {
      title: 'Sounding like your business',
      plainEnglish:
        'Replies match your tone and mention your services, so customers feel like they are talking to you.',
      status: hasVoice && hasServices ? 'live' : 'needs_setup',
      icon: <Building className="w-5 h-5" />,
      action:
        hasVoice && hasServices ? undefined : { label: 'Set your tone', to: '/settings' },
    },
    {
      title: 'Booking jobs into your calendar',
      plainEnglish:
        'Confirmed jobs appear in your BusinessPilot calendar. Two-way sync with Google Calendar is on the way.',
      status: 'live',
      icon: <Calendar className="w-5 h-5" />,
      action: { label: 'View calendar', to: '/appointments' },
    },
    {
      title: 'Your subscription',
      plainEnglish: subscription
        ? 'Your plan is active. You can change or cancel it any time.'
        : "You're on the free trial. Pick a plan to keep your AI answering when it ends.",
      status: subscription ? 'live' : 'needs_setup',
      icon: <CreditCard className="w-5 h-5" />,
      action: subscription ? undefined : { label: 'See plans', to: '/pricing' },
    },
    {
      title: 'Google Calendar two-way sync',
      plainEnglish:
        'Jobs booked by the AI push straight into Google Calendar, and changes you make there sync back.',
      status: 'coming_soon',
      icon: <CalendarClock className="w-5 h-5" />,
    },
    {
      title: 'Send leads to your other tools',
      plainEnglish:
        'Push every new lead and booked job to Zapier, so it lands in your accounting or job management software.',
      status: 'coming_soon',
      icon: <Webhook className="w-5 h-5" />,
    },
    {
      title: 'Google Business Profile messages',
      plainEnglish: 'Reply automatically to enquiries that come through your Google listing.',
      status: 'coming_soon',
      icon: <Globe className="w-5 h-5" />,
    },
    {
      title: 'Automatic draft invoices',
      plainEnglish: 'When a job is marked done, create a draft invoice in Xero or QuickBooks.',
      status: 'coming_soon',
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  const active = capabilities.filter((c) => c.status !== 'coming_soon');
  const upcoming = capabilities.filter((c) => c.status === 'coming_soon');
  const liveCount = active.filter((c) => c.status === 'live').length;
  const needsSetup = active.filter((c) => c.status === 'needs_setup');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">What BusinessPilot is doing for you</h1>
        <p className="text-muted-foreground">
          A plain-English view of what's switched on and what still needs a minute of your time.
        </p>
      </div>

      {/* Summary */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">
                {liveCount} of {active.length} working
              </h2>
              {needsSetup.length === 0 ? (
                <Badge variant="success">All set</Badge>
              ) : (
                <Badge variant="warning">
                  {needsSetup.length} thing{needsSetup.length > 1 ? 's' : ''} to finish
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {needsSetup.length === 0
                ? "Everything's running. You'll see new enquiries land on your dashboard."
                : `Finish ${needsSetup.length === 1 ? 'this' : 'these'} and your AI is fully live.`}
            </p>
          </div>
          {needsSetup.length > 0 && needsSetup[0].action && (
            <Link to={needsSetup[0].action.to} className="shrink-0">
              <Button>
                {needsSetup[0].action.label}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          )}
        </div>
      </Card>

      {/* Active capabilities */}
      <div className="space-y-3">
        {active.map((capability, index) => (
          <motion.div
            key={capability.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    capability.status === 'live'
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  {capability.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="font-semibold">{capability.title}</h3>
                    <StatusPill status={capability.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{capability.plainEnglish}</p>
                </div>
                {capability.action && (
                  <Link to={capability.action.to} className="shrink-0">
                    <Button variant="outline" size="sm">
                      {capability.action.label}
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Coming soon */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">On the way</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {upcoming.map((capability) => (
            <Card key={capability.title} className="p-5">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {capability.icon}
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-sm font-semibold">{capability.title}</h3>
                    <StatusPill status={capability.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{capability.plainEnglish}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-muted/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="mb-1 font-semibold">Want something that isn't here?</h3>
            <p className="text-sm text-muted-foreground">
              Tell us what you'd use and we'll build the ones people actually ask for.
            </p>
          </div>
          <Link to="/contact" className="shrink-0">
            <Button variant="outline" size="sm">
              Get in touch
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
