import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  ExternalLink,
  RefreshCw,
  Zap,
  CreditCard,
  MessageSquare,
  Clock,
  Globe,
  Facebook,
  MessageCircle,
  FileText,
  Calculator,
  DollarSign,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { Link } from 'react-router-dom';

interface Integration {
  name: string;
  description: string;
  status: 'connected' | 'not_configured' | 'error' | 'coming_soon';
  icon: React.ReactNode;
  docsUrl?: string;
  required: boolean;
  setupUrl?: string;
  note?: string;
  category: 'core' | 'messaging' | 'payments' | 'coming_soon';
}

export function IntegrationsPage() {
  const integrations: Integration[] = [
    // Core integrations
    {
      name: 'Supabase',
      description: 'Database, authentication, and real-time subscriptions',
      status: 'connected',
      icon: <Zap className="w-6 h-6 text-green-500" />,
      required: true,
      category: 'core',
    },
    {
      name: 'Stripe',
      description: 'Payment processing and subscription management',
      status: 'connected',
      icon: <CreditCard className="w-6 h-6 text-green-500" />,
      required: false,
      setupUrl: '/dashboard/settings?tab=billing',
      note: 'Webhook endpoint: /functions/v1/stripe-webhook',
      category: 'payments',
    },
    {
      name: 'Twilio',
      description: 'SMS messaging for lead capture and follow-ups',
      status: 'connected',
      icon: <MessageSquare className="w-6 h-6 text-green-500" />,
      required: false,
      note: 'Webhook endpoint: /functions/v1/twilio-webhook',
      category: 'messaging',
    },
    {
      name: 'Claude AI (Anthropic)',
      description: 'AI-powered response generation for customer enquiries',
      status: 'connected',
      icon: <Zap className="w-6 h-6 text-green-500" />,
      required: false,
      note: 'Uses Claude 3 Haiku for fast, cost-effective responses',
      category: 'core',
    },

    // Coming Soon
    {
      name: 'Google Business Profile',
      description: 'Respond to Google messages and reviews automatically',
      status: 'coming_soon',
      icon: <Globe className="w-6 h-6 text-muted-foreground" />,
      required: false,
      category: 'coming_soon',
    },
    {
      name: 'Facebook & Instagram Lead Ads',
      description: 'Auto-follow-up on social media lead form submissions',
      status: 'coming_soon',
      icon: <Facebook className="w-6 h-6 text-muted-foreground" />,
      required: false,
      category: 'coming_soon',
    },
    {
      name: 'WhatsApp Business',
      description: 'Customer messaging via WhatsApp for international reach',
      status: 'coming_soon',
      icon: <MessageCircle className="w-6 h-6 text-muted-foreground" />,
      required: false,
      category: 'coming_soon',
    },
    {
      name: 'QuickBooks',
      description: 'Auto-create draft invoices when leads are marked as booked',
      status: 'coming_soon',
      icon: <FileText className="w-6 h-6 text-muted-foreground" />,
      required: false,
      category: 'coming_soon',
    },
    {
      name: 'Xero',
      description: 'Sync booked jobs to your Xero accounting',
      status: 'coming_soon',
      icon: <DollarSign className="w-6 h-6 text-muted-foreground" />,
      required: false,
      category: 'coming_soon',
    },
    {
      name: 'Quote & Estimate Builder',
      description: 'AI can give rough price ranges during conversations based on job type',
      status: 'coming_soon',
      icon: <Calculator className="w-6 h-6 text-muted-foreground" />,
      required: false,
      category: 'coming_soon',
    },
  ];

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <Badge variant="success">Connected</Badge>;
      case 'not_configured':
        return <Badge variant="muted">Not Configured</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'coming_soon':
        return <Badge variant="muted" className="text-xs border border-muted-foreground/30 text-muted-foreground">Coming Soon</Badge>;
    }
  };

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'not_configured':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'coming_soon':
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;
  const activeIntegrations = integrations.filter((i) => i.status !== 'coming_soon');
  const requiredConnected = activeIntegrations.filter((i) => i.required && i.status === 'connected').length;
  const requiredTotal = activeIntegrations.filter((i) => i.required).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Manage connections to external services
        </p>
      </div>

      {/* Status Summary */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-semibold">Integration Status</h2>
              {requiredConnected === requiredTotal ? (
                <Badge variant="success">All Required Connected</Badge>
              ) : (
                <Badge variant="warning">Setup Required</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {connectedCount} of {activeIntegrations.length} integrations connected
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </Card>

      {/* Connected Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-500" />
          Active Integrations
        </h2>
        <div className="grid gap-4">
          {integrations.filter(i => i.status === 'connected').map((integration, index) => (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                      {integration.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{integration.name}</h3>
                        {integration.required && (
                          <Badge variant="muted" className="text-xs border border-border">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {integration.description}
                      </p>
                      {integration.note && (
                        <p className="text-xs text-primary mt-1 font-mono">
                          {integration.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integration.status)}
                      {getStatusBadge(integration.status)}
                    </div>

                    {integration.setupUrl && (
                      <Link to={integration.setupUrl}>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Button>
                      </Link>
                    )}

                    {integration.docsUrl && (
                      <a
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Docs
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Coming Soon Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Coming Soon
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.filter(i => i.status === 'coming_soon').map((integration, index) => (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-5 opacity-75">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {integration.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{integration.name}</h3>
                      {getStatusBadge(integration.status)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <Card className="p-6 bg-muted/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Need Help Setting Up?</h3>
            <p className="text-sm text-muted-foreground">
              Our team can help you configure your integrations. Book a setup call
              or check our documentation.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/contact">
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/50">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Core Systems Operational
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Your CRM is fully operational with AI-powered responses, SMS via Twilio, and payment processing via Stripe.
              Additional integrations are being added based on customer feedback - let us know what you need!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
