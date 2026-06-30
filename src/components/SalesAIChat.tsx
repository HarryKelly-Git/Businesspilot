import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const quickActions = [
  'How does pricing work?',
  'What industries do you serve?',
  'How does the free trial work?',
  'Can I see a demo?',
];

const pricingInfo = `
**Starter - $29/month**
Perfect for solo contractors. Up to 100 leads/month, basic automation.

**Growth - $99/month** (Most Popular)
For growing businesses. Up to 500 leads/month, full automation, priority support.

**Pro - $299/month**
For established companies. Unlimited leads, advanced analytics, custom integrations.

All plans include a 14-day free trial.
`;

const salesResponses: Record<string, string> = {
  pricing: `Great question about pricing! Here's our transparent pricing structure:${pricingInfo}\n\nWhich plan sounds like the best fit for your business? I can help you compare them.`,
  industries: `We work with all kinds of service businesses:\n\n• **Electricians** - Handle emergency calls, service upgrades, inspections\n• **Plumbers** - Emergency repairs, installations, maintenance\n• **HVAC Techs** - Seasonal tune-ups, installations, repairs\n• **Builders & Contractors** - Project inquiries, estimates, scheduling\n• **Landscapers** - Quotes, seasonal services, maintenance contracts\n• **Mechanics** - Service appointments, estimates, parts ordering\n\nEven if your trade isn't listed, we can customize our system for you. What industry are you in?`,
  trial: `Our 14-day free trial is the perfect way to test drive BusinessPilot AI:\n\n• Full access to your chosen plan's features\n• No credit card required to start\n• We'll help you set up your business profile\n• Test with real or simulated inquiries\n• Cancel anytime before the trial ends\n\nReady to give it a try? I can get you set up in about 2 minutes.`,
  demo: `I'd love to show you how BusinessPilot AI works!\n\nHere's what you can expect:\n1. We'll walk through your specific business needs\n2. Show you how leads are captured and qualified\n3. Demonstrate automated responses for your industry\n4. Walk through the dashboard and reporting\n\nYou can schedule a 20-minute demo call, or start your free trial right now and explore on your own.\n\nWhat would you prefer?`,
  features: `BusinessPilot AI helps you capture more leads and convert them into jobs automatically:\n\n• **Missed Call Recovery** - Instantly text back missed callers\n• **Lead Qualification** - AI asks the right questions automatically\n• **Smart Scheduling** - Book appointments without the back-and-forth\n• **Round-the-Clock Response** - Never miss a lead, even at night\n• **Industry Templates** - Pre-built workflows for your trade\n• **Analytics Dashboard** - See what's working in your business\n\nWhat's your biggest challenge right now - catching leads, qualifying them, or scheduling?`,
  integration: `Great question about integrations!\n\nCurrently we support:\n• **SMS via Twilio** - Built-in text messaging\n• **Email notifications** - Get alerts for new leads\n• **Calendar sync** - Works with Google Calendar\n• **Custom webhooks** - Connect to your existing systems\n\nPro plan customers can also request custom integrations through our API.\n\nWhat systems are you currently using that you'd want to connect?`,
  support: `Our support is designed for busy trade professionals:\n\n• **Chat support** - Talk to a real human during business hours\n• **Email support** - Response within 4 hours, guaranteed\n• **Setup assistance** - Free onboarding call for all plans\n• **Help center** - 24/7 access to guides and tutorials\n• **Priority support** - Faster response for Growth and Pro plans\n\nWe actually use our own product, so we know how important quick responses are!`,
  competitors: `I appreciate you doing your research!\n\nWhat makes BusinessPilot AI different:\n• **Built for trades** - Not a generic CRM, designed specifically for service businesses\n• **Faster setup** - Working in under an hour, not weeks\n• **All-in-one** - Lead capture, qualification, and scheduling together\n• **Fair pricing** - No per-lead fees, just simple monthly plans\n• **No contracts** - Cancel anytime, keep your data\n\nHappy to answer any specific questions about how we compare. What matters most to you in a solution?`,
  getting_started: `Getting started is simple and takes about 5 minutes:\n\n1. **Create your account** - Just an email and password\n2. **Tell us about your business** - Industry, services, hours\n3. **Set up your phone number** - Forward calls or use our number\n4. **Customize your responses** - We have templates for your trade\n5. **Start capturing leads!**\n\nThere's no risk with our 14-day free trial. Want me to walk you through any specific part?`,
};

function generateSalesResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('price') || msg.includes('cost') || msg.includes('pay') || msg.includes('plan') || msg.includes('starter') || msg.includes('growth') || msg.includes('pro')) {
    return salesResponses.pricing;
  }
  if (msg.includes('industry') || msg.includes('trade') || msg.includes('electrician') || msg.includes('plumber') || msg.includes('hvac') || msg.includes('builder') || msg.includes('landscap') || msg.includes('mechanic')) {
    return salesResponses.industries;
  }
  if (msg.includes('trial') || msg.includes('free') || msg.includes('try') || msg.includes('test')) {
    return salesResponses.trial;
  }
  if (msg.includes('demo') || msg.includes('call') || msg.includes('meeting') || msg.includes('show me')) {
    return salesResponses.demo;
  }
  if (msg.includes('feature') || msg.includes('what do') || msg.includes('how it work') || msg.includes('tell me about')) {
    return salesResponses.features;
  }
  if (msg.includes('integrat') || msg.includes('connect') || msg.includes('api') || msg.includes('sync')) {
    return salesResponses.integration;
  }
  if (msg.includes('support') || msg.includes('help') || msg.includes('contact') || msg.includes('talk to')) {
    return salesResponses.support;
  }
  if (msg.includes('competitor') || msg.includes('versus') || msg.includes('vs') || msg.includes('compare') || msg.includes('difference') || msg.includes('better')) {
    return salesResponses.competitors;
  }
  if (msg.includes('start') || msg.includes('sign up') || msg.includes('begin') || msg.includes('setup') || msg.includes('how do i')) {
    return salesResponses.getting_started;
  }
  if (msg.includes('yes') || msg.includes('sure') || msg.includes('okay') || msg.includes('let')) {
    return `Perfect! To get started with your free trial, just click the **"Start Free Trial"** button at the top of the page. No credit card required.\n\nOr if you'd like to schedule a quick demo call first, just say "demo" and we can set that up.\n\nWhat would you like to do?`;
  }

  return `Thanks for reaching out! I'm here to help you learn about BusinessPilot AI.\n\nI can help with:\n• **Pricing details** - Our plans start at $29/month\n• **Features** - Lead capture, qualification, and scheduling\n• **Getting started** - 14-day free trial, no credit card needed\n• **Your specific industry** - We serve electricians, plumbers, HVAC, and more\n\nWhat would you like to know more about?`;
}

export function SalesAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm here to help you learn about BusinessPilot AI. Looking to capture more leads for your service business?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const response = generateSalesResponse(userMessage.content);
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setTimeout(() => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: action,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      setTimeout(() => {
        const response = generateSalesResponse(action);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
      }, 1000 + Math.random() * 1000);
    }, 0);
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: 'spring' }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-48px)] bg-card rounded-2xl shadow-2xl border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b bg-primary text-primary-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Sales Assistant</h3>
                    <p className="text-xs opacity-80">Ask me anything</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-primary-foreground/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-se-md'
                          : 'bg-muted rounded-ss-md'
                      }`}
                    >
                      <div className="whitespace-pre-line">{message.content}</div>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="rounded-2xl rounded-ss-md bg-muted px-4 py-2.5">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleQuickAction(action)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-2.5 rounded-full bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
