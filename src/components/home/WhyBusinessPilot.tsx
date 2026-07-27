import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, MapPin, Clock, Wallet } from 'lucide-react';
import { Button } from '../ui';

/**
 * "Why BusinessPilot" — answers "why you, not someone else" after the visitor
 * already understands what the product does.
 *
 * HONESTY RULE: every row here describes something the product does TODAY.
 * Rows for roadmap features (voice/accent recognition, approval mode, emergency
 * detection, lead resurrection) are deliberately NOT included — claiming them
 * would be the exact overstatement that erodes trust. Add each row back only
 * once its feature actually ships. No competitor is named, by design.
 */

interface Row {
  label: string;
  typical: string;
  us: string;
}

const rows: Row[] = [
  {
    label: 'Pricing',
    typical: 'Often charged per call or per minute — so a busy month becomes your most expensive',
    us: 'One flat monthly price for your plan. It never goes up with call volume — a busy month costs the same as a quiet one',
  },
  {
    label: 'Built for your work',
    typical: 'Usually generic scripts written for any business, anywhere',
    us: 'Asks the right questions for your trade — sparky, plumber, builder and more',
  },
  {
    label: 'Made for New Zealand',
    typical: 'Frequently US software with a NZ price tag — often billed in USD and supported from overseas',
    us: 'Priced in NZ$, run and supported from right here in New Zealand',
  },
  {
    label: 'Day and night',
    typical: 'After hours you often get voicemail, or a call that quietly costs you more',
    us: 'Replies to every enquiry in seconds — 11pm or Sunday — at the same flat price',
  },
  {
    label: 'Support',
    typical: 'Often a ticket queue and a day or two before anyone gets back to you',
    us: 'A real person, usually same day — not a queue, not a bot',
  },
];

const differentiators = [
  {
    icon: MapPin,
    emoji: '🇳🇿',
    title: 'Built in New Zealand',
    body: "Priced in NZ$. Run and supported from Christchurch. Not American software with a Kiwi price tag bolted on.",
  },
  {
    icon: Clock,
    emoji: '💬',
    title: 'Answers day and night',
    body: "Someone texts at 11pm, they get a reply in seconds — not a voicemail, and not tomorrow morning.",
  },
  {
    icon: Wallet,
    emoji: '💰',
    title: 'Your bill never changes',
    body: "Flat monthly price. Most services charge per call, so a storm week costs you double. Yours doesn't move.",
  },
];

const AVG_JOB_VALUE_NZD = 350;

export function WhyBusinessPilot() {
  return (
    <section className="py-12 sm:py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-10 max-w-2xl text-center sm:mb-14"
        >
          <h2 className="mb-4 text-3xl font-extrabold lg:text-4xl">
            Why trade businesses choose BusinessPilot
          </h2>
          <p className="text-lg text-muted-foreground">
            Most AI answering services were built for any business, anywhere. This one was built
            for yours.
          </p>
        </motion.div>

        {/* Section 2 — three differentiators */}
        <div className="mx-auto mb-12 grid max-w-5xl gap-4 sm:mb-16 sm:grid-cols-3">
          {differentiators.map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="mb-3 text-3xl" aria-hidden="true">
                {d.emoji}
              </div>
              <h3 className="mb-2 font-bold">{d.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{d.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Section 1 — comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl"
        >
          {/* Desktop table (≥640px) */}
          <table className="hidden w-full border-separate border-spacing-0 sm:table">
            <thead>
              <tr>
                <th scope="col" className="w-1/4" aria-label="Feature" />
                <th
                  scope="col"
                  className="rounded-tl-xl border border-border bg-muted/40 px-5 py-4 text-left text-sm font-semibold text-muted-foreground"
                >
                  Typical AI answering service
                </th>
                <th
                  scope="col"
                  className="rounded-tr-xl border border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 px-5 py-4 text-left text-base font-extrabold text-foreground"
                >
                  BusinessPilot
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const last = i === rows.length - 1;
                return (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className="py-4 pr-4 text-left align-top text-sm font-bold"
                    >
                      {row.label}
                    </th>
                    <td className="border-x border-b border-border bg-muted/20 px-5 py-4 align-top text-sm text-muted-foreground">
                      {row.typical}
                    </td>
                    <td
                      className={`border-r border-b border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/[0.07] px-5 py-4 align-top text-sm font-medium text-foreground ${
                        last ? 'rounded-br-xl' : ''
                      }`}
                    >
                      <span className="flex gap-2">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]"
                          aria-hidden="true"
                        />
                        <span>{row.us}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile stacked cards (<640px) — no horizontal scroll */}
          <div className="space-y-4 sm:hidden">
            {rows.map((row) => (
              <div key={row.label} className="overflow-hidden rounded-xl border border-border">
                <p className="bg-muted/40 px-4 py-2 text-sm font-bold">{row.label}</p>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Typical service
                    </p>
                    <p className="text-sm text-muted-foreground">{row.typical}</p>
                  </div>
                  <div className="rounded-lg border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/[0.07] p-3">
                    {/* text-foreground, not accent: small amber text on the faint
                        amber tint fails WCAG AA (2.0:1). The border + tint carry
                        the brand emphasis instead. */}
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground">
                      BusinessPilot
                    </p>
                    <p className="flex gap-2 text-sm font-medium text-foreground">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]"
                        aria-hidden="true"
                      />
                      <span>{row.us}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section 3 — honest limitations */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mt-8 max-w-4xl rounded-xl bg-muted/40 p-6"
        >
          <h3 className="mb-4 text-sm font-bold text-muted-foreground">
            What BusinessPilot won't do
          </h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">It won't replace you.</span>{' '}
              Complex quotes, tricky jobs and difficult customers still need you — BusinessPilot
              handles the routine stuff so you only get involved when it actually matters.
            </p>
            <p>
              <span className="font-semibold text-foreground">It won't quote.</span>{' '}
              It captures the job and the details, and leaves pricing to you — a real quote still
              needs your eyes on the job.
            </p>
            <p>
              <span className="font-semibold text-foreground">
                It won't pretend to be you.
              </span>{' '}
              It replies on your behalf so no enquiry goes cold, but it's your assistant — not an
              impersonation of you or your team. The tricky stuff still comes to you.
            </p>
          </div>
        </motion.div>

        {/* Section 4 — one job pays for it */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mt-14 max-w-2xl text-center sm:mt-20"
        >
          <p className="text-2xl font-extrabold leading-snug sm:text-3xl">
            The average NZ trade job is worth around NZ${AVG_JOB_VALUE_NZD}.
          </p>
          <p className="mt-2 text-xl font-semibold text-[hsl(var(--success))] sm:text-2xl">
            BusinessPilot costs less than one recovered job a month.
          </p>
          <div className="mt-8">
            <Link to="/auth?signup=true">
              <Button size="lg" className="px-10 py-5 text-lg font-bold">
                Start free — no card needed
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
