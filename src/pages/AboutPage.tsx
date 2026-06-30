import { Link } from 'react-router-dom';
import { ArrowLeft, Bot, Target, Heart, Users, Zap, Shield, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-4">About BusinessPilot</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We help service businesses capture every lead, respond instantly, and book more jobs with AI-powered automation.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <Card className="p-8">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Small service businesses lose thousands of dollars every year to missed calls and slow response times.
                  We built BusinessPilot to change that. Our AI-powered platform ensures every customer inquiry gets
                  an instant, professional response, 24/7. No more missed opportunities. No more lost revenue.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold mb-8 text-center">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Speed</h3>
              <p className="text-sm text-muted-foreground">
                Every second counts. Our system responds to leads in under 60 seconds, dramatically increasing conversion rates.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Heart className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Simplicity</h3>
              <p className="text-sm text-muted-foreground">
                We believe powerful tools shouldn't require a PhD to use. Our platform is designed to be intuitive and easy to set up.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Trust</h3>
              <p className="text-sm text-muted-foreground">
                Your data is your business. We maintain enterprise-grade security and never sell or share your customer information.
              </p>
            </Card>
          </div>
        </motion.div>

        {/* Team */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <Card className="p-8">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">Our Team</h2>
                <p className="text-muted-foreground leading-relaxed">
                  BusinessPilot is built by a team with experience in the service industry.
                  We understand the challenges of running a business where every call matters.
                  Our team spans multiple time zones, ensuring our platform and support are always available when you need us.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Mission */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16 text-center"
        >
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're building tools to help service businesses capture every opportunity.
            Every missed call is a lost customer, and we're on a mission to change that.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <Card className="p-8 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 border-primary/20">
            <Award className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Be a Founding Customer</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              We just launched. Join us as an early customer and help shape the future of BusinessPilot.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Footer Links */}
      <div className="border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/security" className="hover:text-foreground">Security</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} BusinessPilot. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
