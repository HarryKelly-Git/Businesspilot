import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, MessageSquare, Clock, User, X } from 'lucide-react';

export function ResponseComparison() {
  const [phase, setPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setPhase((prev) => (prev + 1) % 8);
    }, 1500);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleRestart = () => {
    setPhase(0);
    setIsPlaying(true);
  };

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
            <Clock className="w-4 h-4" />
            Speed Matters
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Every Minute Costs You Customers
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            78% of customers hire the first business that responds. See the difference BusinessPilot makes.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Without BusinessPilot */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border bg-red-500/5">
                <div className="flex items-center gap-2 text-red-600">
                  <X className="w-5 h-5" />
                  <span className="font-semibold">Without BusinessPilot</span>
                </div>
              </div>

              <div className="p-6 min-h-[300px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {phase < 2 && (
                    <motion.div
                      key="calling"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Phone className="w-8 h-8 text-red-500" />
                      </div>
                      <p className="font-medium">Customer calls at 2:34 PM</p>
                      <p className="text-sm text-muted-foreground">Phone ringing...</p>
                    </motion.div>
                  )}

                  {phase >= 2 && phase < 4 && (
                    <motion.div
                      key="voicemail"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <PhoneOff className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium">No answer</p>
                      <p className="text-sm text-muted-foreground">Sent to voicemail</p>
                    </motion.div>
                  )}

                  {phase >= 4 && phase < 6 && (
                    <motion.div
                      key="waiting"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-muted-foreground animate-spin" />
                      </div>
                      <p className="font-medium">4 hours later...</p>
                      <p className="text-sm text-muted-foreground">Still no response</p>
                    </motion.div>
                  )}

                  {phase >= 6 && (
                    <motion.div
                      key="lost"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-red-500" />
                      </div>
                      <p className="font-medium text-red-600">Customer called a competitor</p>
                      <p className="text-sm text-muted-foreground">Job lost to faster response</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* With BusinessPilot */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-green-500/30 overflow-hidden shadow-lg shadow-green-500/5"
            >
              <div className="px-6 py-4 border-b border-green-500/20 bg-green-500/5">
                <div className="flex items-center gap-2 text-green-600">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-semibold">With BusinessPilot</span>
                </div>
              </div>

              <div className="p-6 min-h-[300px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {phase < 2 && (
                    <motion.div
                      key="call-in"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Phone className="w-8 h-8 text-green-500" />
                      </div>
                      <p className="font-medium">Customer calls at 2:34 PM</p>
                      <p className="text-sm text-muted-foreground">Call received</p>
                    </motion.div>
                  )}

                  {phase >= 2 && phase < 5 && (
                    <motion.div
                      key="instant-reply"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-white" />
                      </div>
                      <p className="font-medium text-green-600">Instant AI Response!</p>
                      <p className="text-sm text-muted-foreground">Within 3 seconds</p>
                      <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-left">
                        <p>"Hi! I got your message. I can help with that. When would be a good time to come take a look?"</p>
                      </div>
                    </motion.div>
                  )}

                  {phase >= 5 && (
                    <motion.div
                      key="booked"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="font-medium text-green-600">Job Booked!</p>
                      <p className="text-sm text-muted-foreground">Customer scheduled for tomorrow 9am</p>
                      <div className="mt-4 p-3 bg-green-500/10 rounded-lg text-sm">
                        <p className="text-green-700 dark:text-green-400 font-medium">Revenue captured: $350</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              The first responder wins 78% of jobs. Be first, every time.
            </p>
            <button
              onClick={handleRestart}
              className="text-primary text-sm hover:underline"
            >
              Replay animation
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
