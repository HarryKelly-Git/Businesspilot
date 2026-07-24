import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Moon, Check, CalendarCheck } from 'lucide-react';
import { Button } from '../ui';

/**
 * A static, designed SMS thread showing exactly what happens when a customer
 * texts at 11pm. Deliberately NOT live: this is the most persuasive element on
 * the page, so it must render identically every time, instantly, with no API
 * call that can fail, rate-limit, or stall on a slow connection.
 */

interface Message {
  from: 'customer' | 'ai';
  text: string;
  time: string;
  /** Shown under an AI message to make the response speed explicit. */
  latency?: string;
}

const thread: Message[] = [
  {
    from: 'customer',
    text: "Hi, just tried calling. Hot water cylinder is leaking all over the garage floor. Can anyone come out?",
    time: '11:04 pm',
  },
  {
    from: 'ai',
    text: "Hi, sorry we missed you. That sounds urgent — is water still actively running, or have you managed to shut it off at the mains?",
    time: '11:04 pm',
    latency: 'Replied in 8 seconds',
  },
  {
    from: 'customer',
    text: "Shut it off at the mains just now. Still a big puddle though.",
    time: '11:06 pm',
  },
  {
    from: 'ai',
    text: "Good call, that's the main thing. Since it's contained we can look at it first thing rather than call-out rates tonight. What's the address?",
    time: '11:06 pm',
  },
  {
    from: 'customer',
    text: "14 Rimu Street, Papakura",
    time: '11:07 pm',
  },
  {
    from: 'ai',
    text: "Got it. Dave can be there tomorrow between 8 and 9am to replace the cylinder. Does that work?",
    time: '11:07 pm',
  },
  {
    from: 'customer',
    text: "Yes perfect, thank you!",
    time: '11:08 pm',
  },
  {
    from: 'ai',
    text: "Booked in for 8am. You'll get a reminder in the morning. Try to keep the area clear so Dave can get straight to it.",
    time: '11:08 pm',
  },
];

export function SMSDemoThread() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))]/10 px-4 py-2 text-sm font-semibold text-[hsl(var(--primary))]">
            <Moon className="h-4 w-4" aria-hidden="true" />
            11:04pm on a Tuesday
          </div>
          <h2 className="mb-4 text-3xl font-extrabold lg:text-4xl">
            This is what your customer sees when you can't pick up
          </h2>
          <p className="text-lg text-muted-foreground">
            A real example of how BusinessPilot handles a missed call — from first text to booked job,
            without waking you up.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,380px)_1fr]">
          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto w-full max-w-[380px]"
          >
            <div className="overflow-hidden rounded-[2rem] border-4 border-gray-900 bg-gray-900 shadow-2xl">
              {/* Status bar */}
              <div className="flex items-center justify-between bg-gray-900 px-6 py-2 text-[11px] font-medium text-white">
                <span>11:08</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px]">▮▮▮</span>
                </div>
              </div>

              {/* Contact header */}
              <div className="border-b border-gray-200 bg-gray-100 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-gray-900">Waikato Plumbing</p>
                <p className="text-xs text-gray-500">Mobile</p>
              </div>

              {/* Messages */}
              <div className="space-y-3 bg-white px-3 py-4">
                {thread.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(index * 0.12, 1) }}
                  >
                    <div
                      className={`flex ${
                        message.from === 'customer' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug ${
                          message.from === 'customer'
                            ? 'rounded-bl-md bg-gray-200 text-gray-900'
                            : 'rounded-br-md bg-[#0b93f6] text-white'
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                    <div
                      className={`mt-1 flex items-center gap-1.5 px-1 text-[10px] text-gray-400 ${
                        message.from === 'customer' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <span>{message.time}</span>
                      {message.latency && (
                        <span className="font-semibold text-[hsl(var(--success))]">
                          · {message.latency}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Booking confirmation */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.1 }}
                  className="mt-4 rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 p-3"
                >
                  <div className="flex items-center gap-2">
                    <CalendarCheck
                      className="h-4 w-4 shrink-0 text-[hsl(var(--success))]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[hsl(var(--success))]">
                        Job booked — Wed 8:00am
                      </p>
                      <p className="text-[11px] text-gray-600">
                        Cylinder replacement · 14 Rimu St, Papakura
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Narrative */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
              <p className="text-xl font-bold lg:text-2xl">
                You were asleep for all of it.
              </p>
              <p className="mt-3 text-muted-foreground">
                You woke up to a job booked for 8am and a customer who never had a reason to ring
                anyone else. The competitor down the road never got the call.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                {
                  title: 'Answered in 8 seconds',
                  body: 'Before they had a chance to scroll down and call the next plumber.',
                },
                {
                  title: 'Asked what actually matters',
                  body: 'Water shut off? Address? The questions your trade needs, not a generic bot script.',
                },
                {
                  title: 'Protected your margin',
                  body: "Talked them out of an after-hours call-out when it wasn't needed — and still won the job.",
                },
                {
                  title: 'Booked it into your calendar',
                  body: 'No callback list. No voicemail to work through at 6am.',
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success))]/15">
                    <Check
                      className="h-3 w-3 text-[hsl(var(--success))]"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div>
              <Link to="/auth?signup=true">
                <Button size="lg" className="w-full sm:w-auto">
                  Set this up for my business
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <p className="mt-3 text-sm text-muted-foreground">
                Free for 14 days. No card needed.
              </p>
            </div>
          </motion.div>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-muted-foreground">
          Illustrative example of a BusinessPilot conversation. Names and details are not a real customer.
        </p>
      </div>
    </section>
  );
}
