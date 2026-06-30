import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, Cookie, Users, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
  {
    icon: Database,
    title: 'Data We Collect',
    content: [
      'Account information: name, email, phone number, and business details',
      'Lead data: customer messages, phone numbers, and conversation history',
      'Usage data: pages visited, features used, and interaction patterns',
      'Payment information: processed securely through Stripe (we never store card numbers)',
    ],
  },
  {
    icon: Eye,
    title: 'How We Use Your Data',
    content: [
      'To provide and improve our lead capture and response services',
      'To send important notifications about your account and leads',
      'To generate reports and analytics you request',
      'To protect against fraud and ensure service security',
      'To communicate about product updates and offers (you can opt out)',
    ],
  },
  {
    icon: Lock,
    title: 'Data Security',
    content: [
      'All data is encrypted in transit using TLS 1.3',
      'Data at rest is encrypted using AES-256 encryption',
      'Access to your data is strictly limited to essential personnel',
      'We conduct regular security audits and vulnerability assessments',
      'We maintain SOC 2 Type II compliance for our infrastructure',
    ],
  },
  {
    icon: Users,
    title: 'Data Sharing',
    content: [
      'We never sell your personal data to third parties',
      'We share data only with service providers essential to operations (payment processors, hosting)',
      'We may share data if required by law or to protect our legal rights',
      'All third-party providers are contractually bound to protect your data',
    ],
  },
  {
    icon: Cookie,
    title: 'Cookies & Tracking',
    content: [
      'We use essential cookies to maintain your login session',
      'Analytics cookies help us understand how features are used',
      'You can disable non-essential cookies in your browser settings',
      'We do not use cookies for cross-site tracking or advertising',
    ],
  },
  {
    icon: Shield,
    title: 'Your Rights',
    content: [
      'Access: Request a copy of all data we hold about you',
      'Correction: Update or correct inaccurate information',
      'Deletion: Request deletion of your data (subject to legal requirements)',
      'Portability: Export your data in a standard format',
      'Objection: Object to certain processing activities',
    ],
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
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
            BusinessPilot AI is committed to protecting your privacy and the privacy of your
            customers. This policy explains what data we collect, how we use it, and the choices
            you have regarding your information.
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
          <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
          <p className="text-muted-foreground mb-4">
            If you have questions about this privacy policy or wish to exercise your data rights,
            please contact us:
          </p>
          <div className="flex items-center gap-2 text-primary">
            <Mail className="w-4 h-4" />
            <a href="mailto:privacy@businesspilot.ai" className="hover:underline">
              privacy@businesspilot.ai
            </a>
          </div>
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
          <Link to="/terms" className="text-primary hover:underline">
            Terms of Service
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
