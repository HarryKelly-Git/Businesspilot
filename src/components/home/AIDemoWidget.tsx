import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Sparkles, Lock } from 'lucide-react';
import { Button } from '../ui';
import { Link } from 'react-router-dom';

const presetQueries = [
  { label: 'Emergency: Burst pipe', query: 'Hi, I have a burst pipe in my kitchen and water is everywhere! I need someone urgently.' },
  { label: 'Quote request', query: 'Hello, I need a quote for some electrical work. I want to add 4 new outlets in my living room.' },
  { label: 'Service inquiry', query: 'Hey, my AC stopped working yesterday and its really hot. Can you come take a look at it?' },
  { label: 'Schedule appointment', query: 'I need to schedule a tune-up for my furnace before winter. Do you have any availability next week?' },
];

const MAX_TRIES = 3;

export function AIDemoWidget() {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triesLeft, setTriesLeft] = useState(MAX_TRIES);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track tries in sessionStorage
  useEffect(() => {
    const storedTries = sessionStorage.getItem('ai-demo-tries');
    if (storedTries) {
      setTriesLeft(MAX_TRIES - parseInt(storedTries));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (query: string) => {
    if (!query.trim() || isLoading || triesLeft <= 0) return;

    const newTriesUsed = MAX_TRIES - triesLeft + 1;
    sessionStorage.setItem('ai-demo-tries', newTriesUsed.toString());
    setTriesLeft(MAX_TRIES - newTriesUsed);

    setIsLoading(true);
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setCustomQuery('');
    setSelectedPreset(null);

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ message: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setError('Unable to connect to AI. Please try again.');
      setMessages(prev => prev.slice(0, -1));
      // Restore the try on error
      setTriesLeft(prev => Math.min(MAX_TRIES, prev + 1));
      sessionStorage.setItem('ai-demo-tries', (MAX_TRIES - triesLeft).toString());
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetClick = (index: number) => {
    setSelectedPreset(index);
    setCustomQuery(presetQueries[index].query);
  };

  const isLocked = triesLeft <= 0;

  return (
    <section className="py-12 sm:py-16 lg:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            Powered by Claude AI
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
            See BusinessPilot AI in Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Type a sample customer enquiry or pick a preset below to see how our AI responds instantly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xl">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">BusinessPilot AI</p>
                  <p className="text-xs text-muted-foreground">Always online, ready to respond</p>
                </div>
              </div>
              <div className={`text-sm font-medium ${isLocked ? 'text-red-500' : triesLeft <= 1 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                {isLocked ? 'Limit reached' : `${triesLeft} tries left`}
              </div>
            </div>

            {/* Preset Queries */}
            {!isLocked && (
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <p className="text-xs text-muted-foreground mb-3">Try these example queries:</p>
                <div className="flex flex-wrap gap-2">
                  {presetQueries.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handlePresetClick(index)}
                      className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                        selectedPreset === index
                          ? 'bg-[hsl(var(--accent))] text-white'
                          : 'bg-background border border-border hover:border-[hsl(var(--accent))]/50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && !isLoading && !isLocked && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Send a message to see the AI respond</p>
                </div>
              )}

              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === 'user'
                          ? 'bg-[hsl(var(--accent))]/10'
                          : 'bg-[hsl(var(--primary))]'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-[hsl(var(--accent))]" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div
                      className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-[hsl(var(--accent))] text-white rounded-tr-none'
                          : 'bg-muted rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-muted">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      BusinessPilot AI is replying...
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="text-center py-4">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {/* Locked state */}
              {isLocked && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="font-semibold mb-2">Demo limit reached</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign up for a free trial to keep using the AI assistant.
                  </p>
                  <Link to="/auth?signup=true">
                    <Button>
                      Start Free Trial
                    </Button>
                  </Link>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {!isLocked && (
              <div className="px-6 py-4 border-t border-border bg-muted/50">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend(customQuery);
                  }}
                  className="flex gap-3"
                >
                  <input
                    type="text"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="Type a customer enquiry..."
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/20 text-sm"
                    disabled={isLoading || isLocked}
                  />
                  <Button type="submit" disabled={isLoading || !customQuery.trim() || isLocked}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Live demo using Claude AI. {triesLeft > 0 ? `${triesLeft} tries remaining.` : 'Sign up for unlimited access.'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
