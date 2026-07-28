import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, User } from 'lucide-react';
import { askAssistant } from '../../lib/api';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'How many jobs did I get this week?',
  'Which customers need following up?',
  'How much revenue have I recovered this month?',
  'Draft a follow-up text to my newest lead',
];

/**
 * "Pilot" — the owner's AI assistant. A floating button on every dashboard page
 * that opens a chat panel talking to the owner-assistant edge function (Haiku).
 * Portaled to <body> so the fixed panel is never trapped by a transformed
 * dashboard ancestor.
 */
export function OwnerAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const res = await askAssistant(trimmed, history);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.response || res.error || "Sorry, I couldn't answer that just now.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network hiccup — please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open your AI assistant"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-label="AI assistant"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed inset-x-3 bottom-3 top-16 z-50 mx-auto flex max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[600px] sm:max-h-[calc(100dvh-2.5rem)] sm:w-96"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-[hsl(var(--accent))]/10 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent))]/20">
                    <Sparkles className="h-4 w-4 text-[hsl(var(--accent))]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Pilot</p>
                    <p className="text-[11px] text-muted-foreground">Your AI assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close assistant"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
                {messages.length === 0 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Ask me anything about your business — what's coming up, who to chase, or to
                      draft a message.
                    </p>
                    <div className="space-y-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="block w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:border-[hsl(var(--accent))]/50 hover:bg-muted"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' && (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent))]/15">
                        <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" aria-hidden="true" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                        m.role === 'user'
                          ? 'rounded-br-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                          : 'rounded-bl-md bg-muted text-foreground'
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.role === 'user' && (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                        <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--accent))]/15">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse text-[hsl(var(--accent))]" aria-hidden="true" />
                    </div>
                    <span className="animate-pulse">Thinking…</span>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex shrink-0 items-center gap-2 border-t border-border p-3"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Pilot…"
                  aria-label="Message the assistant"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="Send"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
