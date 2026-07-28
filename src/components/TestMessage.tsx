import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Input, Textarea } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { sendIncomingMessage } from '../lib/api';

interface TestMessageProps {
  onMessageSent?: () => void;
}

export function TestMessage({ onMessageSent }: TestMessageProps) {
  const { business } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    lead_id?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.message) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await sendIncomingMessage(
        formData.phone,
        formData.message,
        formData.name || undefined
      );

      if (response.success) {
        setResult({
          success: true,
          message: response.message,
          lead_id: response.lead_id,
        });
        setFormData({ phone: '', name: '', message: '' });
        onMessageSent?.();
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to send message',
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const presetMessages = [
    "Hi, I need help with an electrical issue at my house.",
    "What's your pricing for a service call?",
    "I have an emergency - my power is out!",
    "Can I book an appointment for next week?",
  ];

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        Test Incoming Message
      </Button>

      {createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Test incoming message"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              // Flex column + scrollable body so the Send button stays reachable on a 375px screen.
              className="fixed inset-x-4 top-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-h-[calc(100dvh-2rem)] z-50 flex flex-col max-w-md mx-auto bg-card rounded-xl shadow-xl border border-border overflow-hidden"
            >
              <div className="flex shrink-0 items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Test Incoming Message</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close dialog"
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* The form is the flex body: a scrollable fields area + a pinned
                  footer, so the action buttons are never pushed off-screen. */}
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
                  <p className="text-sm text-muted-foreground">
                    Simulate an incoming SMS from a customer. This will create a lead and generate an AI response.
                  </p>

                  <Input
                    label="Phone Number *"
                    placeholder="021 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />

                  <Input
                    label="Customer Name (optional)"
                    placeholder="John Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />

                  <Textarea
                    label="Message *"
                    placeholder="Hi, I need help with..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className="min-h-[100px]"
                  />

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Quick messages:</p>
                    <div className="flex flex-wrap gap-2">
                      {presetMessages.map((msg) => (
                        <button
                          key={msg}
                          type="button"
                          onClick={() => setFormData({ ...formData, message: msg })}
                          className="text-xs px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors"
                        >
                          {msg.slice(0, 30)}...
                        </button>
                      ))}
                    </div>
                  </div>

                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg ${
                        result.success
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900'
                          : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          {result.success ? (
                            <>
                              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                Lead created successfully!
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                                Lead ID: {result.lead_id}
                              </p>
                              {result.message && (
                                <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded text-sm">
                                  <p className="text-xs text-muted-foreground mb-1">AI Response:</p>
                                  <p>{result.message}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-red-700 dark:text-red-400">
                              {result.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                </div>

                {/* Pinned footer — always visible, never clipped */}
                <div className="flex shrink-0 gap-3 border-t border-border p-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!formData.phone || !formData.message || loading}
                    loading={loading}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Message
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}
