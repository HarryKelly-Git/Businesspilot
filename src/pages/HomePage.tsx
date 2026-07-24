import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  Zap,
  Shield,
  Check,
  Menu,
  X,
  Sun,
  Moon,
  ArrowRight,
  Target,
  Lock,
  Heart,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui';
import { SalesAIChat } from '../components/SalesAIChat';
import { Logo, LogoMark } from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';
import { IndustryCalculator } from '../components/home/IndustryCalculator';
import { AIDemoWidget } from '../components/home/AIDemoWidget';
import { ResponseComparison } from '../components/home/ResponseComparison';
import { LeakScore } from '../components/home/LeakScore';
import { industries } from '../lib/industries';

const features = [
  {
    icon: Clock,
    title: 'Respond in Seconds, Not Hours',
    description:
      'Every minute counts. When a customer reaches out, respond instantly 24/7. Stop losing jobs to competitors who answer faster.',
  },
  {
    icon: Phone,
    title: 'Capture Every Enquiry',
    description:
      'Missed calls become captured leads. Our system follows up automatically so no potential job slips through the cracks.',
  },
  {
    icon: Target,
    title: 'Convert More, Work Less',
    description:
      'Qualify leads, send quotes, and book jobs automatically while you focus on the work that pays.',
  },
  {
    icon: Calendar,
    title: 'Fill Your Calendar',
    description:
      'Jobs get booked directly into your schedule with reminders sent automatically. No more back-and-forth.',
  },
  {
    icon: MessageSquare,
    title: 'Professional Communication',
    description:
      'Every customer gets consistent, professional responses. No typos, no forgotten follow-ups, no lost details.',
  },
  {
    icon: Shield,
    title: 'Built for Your Business',
    description:
      'Pre-configured for your industry. The AI understands your services and speaks your customers\' language.',
  },
];

const trustBadges = [
  { icon: Lock, text: 'Data encrypted' },
  { icon: Check, text: 'No credit card required' },
  { icon: Zap, text: 'Cancel anytime' },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for solo operators',
    features: [
      '100 conversations/month',
      'Lead capture & dashboard',
      'Basic automation',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: 99,
    description: 'For growing businesses',
    featured: true,
    features: [
      '1000 conversations/month',
      'Smart lead qualification',
      'Calendar booking',
      'SMS follow-up automation',
      'Priority support',
    ],
  },
  {
    name: 'Pro',
    price: 299,
    description: 'Maximum coverage',
    features: [
      'Unlimited conversations',
      'Team accounts',
      'Advanced automations',
      'Multiple business numbers',
      'Advanced reporting',
    ],
  },
];

export function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/95 dark:bg-background/95 backdrop-blur-xl border-b border-border shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center gap-2">
              <LogoMark size="sm" />
              <span className="text-xl font-extrabold">
                <span className="text-foreground">Business</span>
                <span className="text-[hsl(var(--accent))]">Pilot</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#industries" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Industries
              </a>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth?signup=true">
                <Button>Start Free Trial</Button>
              </Link>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border">
            <div className="px-4 py-4 space-y-4">
              <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#industries" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Industries
              </a>
              <div className="pt-4 flex flex-col gap-2">
                <Link to="/auth" className="w-full">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link to="/auth?signup=true" className="w-full">
                  <Button className="w-full">Start Free Trial</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 lg:pt-36 pb-20 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))]/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-[hsl(var(--accent))]/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[hsl(var(--primary))]/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] text-sm font-semibold mb-8">
                <Users className="w-4 h-4" />
                Built for Appointment-Driven Businesses
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="hero-headline mb-6"
            >
              Stop Losing Jobs to{' '}
              <span className="text-gradient">Slower Response Times</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Every missed call is a lost job. Capture every enquiry, respond instantly,
              and book more jobs without hiring staff or working evenings.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/auth?signup=true">
                <Button size="lg" className="px-8 py-4 text-base">
                  Start 14-Day Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="px-8 py-4 text-base">
                  See How It Works
                </Button>
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 flex flex-wrap justify-center gap-6"
            >
              {trustBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div key={badge.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="w-4 h-4 text-green-500" />
                    {badge.text}
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Founding member badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] text-sm font-medium">
              <Zap className="w-4 h-4" />
              Just launched - founding member pricing available
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
              Capture More Jobs, Work Less Hours
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Automate the time-consuming parts of your business so you can focus on
              what you do best.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="card-hover p-6 bg-card rounded-xl border border-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--accent))]/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[hsl(var(--accent))]" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From enquiry to booked job, everything happens automatically.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: 'Customer Reaches Out',
                description: 'They call, text, or fill out a form on your website—any time of day or night.',
              },
              {
                step: 2,
                title: 'Instant Response',
                description: 'The system responds within seconds, gathering job details and confirming their needs.',
              },
              {
                step: 3,
                title: 'Job Booked',
                description: 'Qualified leads get added to your calendar automatically. You show up, do the work, get paid.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Response Speed Comparison */}
      <ResponseComparison />

      {/* Industry Calculator */}
      <IndustryCalculator />

      {/* Leak Score Quiz */}
      <LeakScore />

      {/* AI Demo Widget */}
      <AIDemoWidget />

      {/* Industries Section */}
      <section id="industries" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
              Built for Your Business
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Pre-configured for your industry. The AI already knows what questions to ask
              and how to handle common situations.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {industries.map((industry) => {
              const Icon = industry.icon;
              return (
                <motion.div
                  key={industry.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border hover:border-[hsl(var(--accent))]/50 transition-all hover:shadow-md cursor-default"
                >
                  <Icon className="w-5 h-5 text-[hsl(var(--accent))] shrink-0" />
                  <span className="text-sm font-medium truncate">{industry.name}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TODO: Replace founder's note with real customer testimonials once available */}
      {/* Founder's Note Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-card rounded-2xl border border-border p-8 lg:p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-lg">
                {/* TODO: Replace with real founder photo */}
                FP
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] text-sm font-semibold mb-6">
                <Heart className="w-4 h-4" />
                A Note from Our Founder
              </div>

              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed mb-6">
                "I built BusinessPilot because service businesses lose real money to missed calls every day.
                We just launched, and I'm committed to making sure every early customer gets real value from this tool.
                If you're one of our founding businesses, I'll personally help you get set up and make sure it works for you."
              </p>

              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Founder, BusinessPilot</span>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4">
                  Be among our first customers and help shape the product.
                </p>
                <Link to="/auth?signup=true">
                  <Button size="lg">
                    Get Started as a Founding Member
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-semibold mb-4">
              <Zap className="w-4 h-4" />
              14-Day Free Trial - No Credit Card
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              One job recovered pays for the entire month. Start capturing leads today.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`relative bg-card rounded-2xl border p-8 flex flex-col ${
                  plan.featured
                    ? 'border-[hsl(var(--accent))] shadow-xl shadow-[hsl(var(--accent))]/10 scale-105 z-10'
                    : 'border-border'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-[hsl(var(--accent))] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/auth?signup=true" className="block">
                  <Button
                    variant={plan.featured ? 'primary' : 'outline'}
                    className="w-full"
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Need more?{' '}
              <Link to="/contact" className="text-[hsl(var(--accent))] hover:underline font-medium">
                Contact us about Enterprise plans
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-[hsl(var(--primary))] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
            Start Capturing Every Enquiry Today
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Stop losing jobs to missed calls and slow responses.
            Try BusinessPilot free for 14 days.
          </p>
          <Link to="/auth?signup=true">
            <Button
              size="lg"
              className="bg-white text-[hsl(var(--primary))] hover:bg-white/90 px-8 py-4 text-base font-bold"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          {/* Trust Badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm opacity-80">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Setup in 5 minutes
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo size="sm" />
              </div>
              <p className="text-sm text-muted-foreground">
                Capture every enquiry, respond instantly, and book more jobs.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#industries" className="hover:text-foreground">Industries</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
                <li><Link to="/about" className="hover:text-foreground">About</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link to="/security" className="hover:text-foreground">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>2026 BusinessPilot. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Sales AI Assistant */}
      <SalesAIChat />
    </div>
  );
}
