import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Server,
  Key,
  Cloud,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const securityFeatures = [
  {
    icon: Lock,
    title: 'Encryption Everywhere',
    description: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Your lead data and conversations are protected by industry-standard encryption protocols.',
  },
  {
    icon: Key,
    title: 'Secure Authentication',
    description: 'We use industry-standard OAuth 2.0 and JWT tokens for session management. Multi-factor authentication is available for all accounts.',
  },
  {
    icon: Server,
    title: 'Infrastructure Security',
    description: 'Our infrastructure runs on enterprise-grade cloud providers with automatic security patching, network isolation, and continuous monitoring.',
  },
  {
    icon: Cloud,
    title: 'Data Backup & Recovery',
    description: 'Automated daily backups with point-in-time recovery. Data is replicated across multiple geographic regions for disaster resilience.',
  },
];

const complianceItems = [
  { label: 'SOC 2 Type II', status: 'Certified' },
  { label: 'GDPR Compliance', status: 'Compliant' },
  { label: 'CCPA Compliance', status: 'Compliant' },
  { label: 'PCI DSS', status: 'Via Stripe' },
];

const practices = [
  {
    icon: FileCheck,
    title: 'Regular Audits',
    description: 'We conduct quarterly security audits and annual penetration testing by independent third-party security firms.',
  },
  {
    icon: AlertTriangle,
    title: 'Incident Response',
    description: 'We maintain a 24/7 incident response team. Security incidents are investigated immediately and affected customers are notified within 72 hours.',
  },
  {
    icon: CheckCircle,
    title: 'Access Controls',
    description: 'Employee access to customer data is strictly limited to those who need it for support purposes. All access is logged and audited.',
  },
];

export function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
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
          <h1 className="text-4xl font-bold mb-4">Security at BusinessPilot AI</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We treat your business data and your customers' information with the highest level
            of security. Here's how we protect what matters to you.
          </p>
        </motion.div>

        {/* Security Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-2 gap-6 mb-12"
        >
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className="bg-card rounded-xl p-6 border"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Compliance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl p-8 border mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">Compliance & Certifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {complianceItems.map((item) => (
              <div
                key={item.label}
                className="text-center p-4 bg-muted rounded-lg"
              >
                <p className="font-semibold mb-1">{item.label}</p>
                <span className="inline-flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Security Practices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-center">Our Security Practices</h2>
          <div className="space-y-6">
            {practices.map((practice, index) => {
              const Icon = practice.icon;
              return (
                <motion.div
                  key={practice.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + index * 0.05 }}
                  className="bg-card rounded-xl p-6 border"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{practice.title}</h3>
                      <p className="text-muted-foreground">{practice.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Report Vulnerability */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-muted rounded-xl p-8 text-center"
        >
          <h2 className="text-xl font-semibold mb-4">Found a Security Issue?</h2>
          <p className="text-muted-foreground mb-4">
            We appreciate responsible disclosure. Report security vulnerabilities to our security
            team, and we'll respond within 24 hours.
          </p>
          <a
            href="mailto:harry@thebusinesspilot.com"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Shield className="w-4 h-4" />
            harry@thebusinesspilot.com
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
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
          <Link to="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
