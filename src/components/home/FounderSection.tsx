import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageSquare } from 'lucide-react';
import { Button } from '../ui';
import { ContactModal } from './ContactModal';

/**
 * Deliberately UNSIGNED — a warm company/founder voice with no named person and
 * no portrait. This is an intentional choice: we won't put an invented person on
 * the site, and the owner has chosen not to attach a real identity either.
 *
 * The component supports a signed variant (portrait + byline) if FOUNDER_NAME is
 * ever set to a real, non-empty name — but leave it empty unless a real founder
 * is genuinely being named, and add a real photo at public/images/founder.jpg
 * before doing so. An empty name here renders the honest company-voice story
 * below with no photo request, no broken image, and no fabricated persona.
 */
const FOUNDER_NAME = '';
const FOUNDER_TITLE = 'Founder & CEO, BusinessPilot';
const FOUNDER_PHOTO = '/images/founder.jpg';

const STORY = `I spent years watching small trade businesses lose jobs simply because nobody picked up the phone. A missed call at 9pm isn't just an inconvenience — it's a $400 job walking straight to a competitor who answered. I built BusinessPilot so that never happens again. Every enquiry gets a response in seconds, every lead gets followed up, and every job gets booked — whether you're on the tools, in a meeting, or asleep. If it doesn't work for your business, you get your money back. Simple as that.`;

// Same story, no first-person claim, for while FOUNDER_NAME is unset.
const STORY_UNSIGNED = `We spent years watching small trade businesses lose jobs simply because nobody picked up the phone. A missed call at 9pm isn't just an inconvenience — it's a $400 job walking straight to a competitor who answered. We built BusinessPilot so that never happens again. Every enquiry gets a response in seconds, every lead gets followed up, and every job gets booked — whether you're on the tools, in a meeting, or asleep. If it doesn't work for your business, you get your money back. Simple as that.`;

export function FounderSection() {
  const [contactOpen, setContactOpen] = useState(false);
  // If the photo file is missing, fall back to initials rather than showing a
  // broken-image icon — the section should never look broken.
  const [photoOk, setPhotoOk] = useState(true);
  const signed = FOUNDER_NAME.trim().length > 0;
  const initials = FOUNDER_NAME.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <section className="py-12 sm:py-16 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8 lg:p-12">
            {signed && photoOk ? (
              <img
                src={FOUNDER_PHOTO}
                alt={`${FOUNDER_NAME}, ${FOUNDER_TITLE}`}
                width={112}
                height={112}
                loading="lazy"
                onError={() => setPhotoOk(false)}
                className="mx-auto mb-6 h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-[hsl(var(--accent))]/20"
              />
            ) : signed ? (
              <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-3xl font-bold text-white shadow-lg ring-4 ring-[hsl(var(--accent))]/20">
                {initials}
              </div>
            ) : (
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] shadow-lg">
                <Heart className="h-9 w-9 text-white" aria-hidden="true" />
              </div>
            )}

            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))]/10 px-4 py-2 text-sm font-semibold text-[hsl(var(--accent))]">
              <Heart className="h-4 w-4" aria-hidden="true" />
              {signed ? 'A note from our founder' : 'Why we built this'}
            </div>

            <blockquote className="text-lg leading-relaxed text-muted-foreground lg:text-xl">
              {signed ? `"${STORY}"` : STORY_UNSIGNED}
            </blockquote>

            {signed && (
              <div className="mt-6">
                <p className="font-semibold text-foreground">{FOUNDER_NAME}</p>
                <p className="text-sm text-muted-foreground">{FOUNDER_TITLE}</p>
              </div>
            )}

            <div className="mt-8 border-t border-border pt-6">
              <p className="mb-4 text-sm text-muted-foreground">
                Want to know if it suits your business? Ask us directly.
              </p>
              <Button size="lg" variant="outline" onClick={() => setContactOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                Get in touch
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </section>
  );
}
