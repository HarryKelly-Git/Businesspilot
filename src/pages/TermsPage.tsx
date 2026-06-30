import { motion } from 'framer-motion';
import { FileText, CheckCircle, CreditCard, AlertTriangle, Scale, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
  {
    icon: FileText,
    title: 'Service Agreement',
    content: [
      'BusinessPilot AI provides lead capture, qualification, and response automation services',
      'Services are provided on a subscription basis according to your selected plan',
      'We reserve the right to modify or discontinue features with 30 days notice',
      'You are responsible for maintaining the security of your account credentials',
    ],
  },
  {
    icon: CheckCircle,
    title: 'Acceptable Use',
    content: [
      'Use our services only for lawful business purposes',
      'Do not use the service for spam, harassment, or fraudulent activities',
      'Respect all applicable laws including TCPA regulations for SMS communications',
      'Obtain proper consent before contacting individuals via phone or text',
      'Do not attempt to reverse engineer or disrupt our infrastructure',
    ],
  },
  {
    icon: CreditCard,
    title: 'Billing & Payments',
    content: [
      'Subscriptions are billed monthly or annually in advance',
      'All payments are processed securely through Stripe',
      'Prices are subject to change with 30 days notice before the next billing cycle',
      'Unpaid accounts may be suspended after 7 days of failed payment attempts',
      'Annual subscriptions may be eligible for prorated refunds within 14 days of purchase',
    ],
  },
  {
    icon: RefreshCw,
    title: 'Cancellations & Refunds',
    content: [
      'You may cancel your subscription at any time from your account settings',
      'Cancellation takes effect at the end of your current billing period',
      'No refunds are provided for partial months of service',
      'Data export is available for 30 days after account closure',
    ],
  },
  {
    icon: AlertTriangle,
    title: 'Limitation of Liability',
    content: [
      'Our service is provided "as is" without warranties of any kind',
      'We are not liable for lost profits, revenue, or business opportunities',
      'Our total liability is limited to fees paid in the 12 months preceding any claim',
      'We are not responsible for third-party service outages (e.g., SMS providers)',
    ],
  },
  {
    icon: Scale,
    title: 'Dispute Resolution',
    content: [
      'We will attempt to resolve disputes through good-faith negotiation',
      'Unresolved disputes will be settled through binding arbitration',
      'Arbitration will be conducted under the rules of the American Arbitration Association',
      'The prevailing party is entitled to reasonable attorneys\' fees',
    ],
  },
];

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-lg text-muted-foreground">
            Last updated: January 2025
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="prose prose-gray dark:prose-invert max-w-none mb-12"
        >
          <p className="text-lg leading-relaxed">
            These Terms of Service govern your use of BusinessPilot AI. By accessing or using our
            service, you agree to be bound by these terms. Please read them carefully.
          </p>
        </motion.div>

        <div className="space-y-8">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="bg-card rounded-xl p-6 border"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
                    <ul className="space-y-2">
                      {section.content.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 p-6 bg-muted rounded-xl"
        >
          <h2 className="text-xl font-semibold mb-4">Governing Law</h2>
          <p className="text-muted-foreground">
            These terms are governed by the laws of the State of Delaware, without regard to its
            conflict of laws provisions. Any disputes arising under these terms shall be resolved
            in the courts of Delaware.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground"
        >
          <Link to="/" className="text-primary hover:underline">
            Return to Home
          </Link>
          {' · '}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          {' · '}
          <Link to="/security" className="text-primary hover:underline">
            Security
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
