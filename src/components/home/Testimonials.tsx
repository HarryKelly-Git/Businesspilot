import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

/**
 * Real customer quotes only.
 *
 * HOW TO ADD ONE: append an object below. The section appears automatically as
 * soon as there is at least one entry, and renders nothing while the list is
 * empty — so the live site never shows placeholder cards like "[Name]",
 * which read as unfinished and cost more trust than an absent section.
 *
 * Only add quotes a real person actually said and is happy to be named for.
 * One genuine quote outperforms ten invented ones, and inventing them is both
 * a Fair Trading Act problem in NZ and the fastest way to lose a trade
 * customer who rings the "reference" and finds nobody there.
 *
 * Example:
 *   {
 *     quote: "Booked two jobs the first weekend. I was asleep for both.",
 *     name: 'Dave Wilson',
 *     business: 'Wilson Plumbing',
 *     location: 'Papakura',
 *   },
 */
interface Testimonial {
  quote: string;
  name: string;
  business: string;
  location: string;
}

const testimonials: Testimonial[] = [];

export function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <section className="bg-muted/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--success))]/10 px-4 py-2 text-sm font-semibold text-[hsl(var(--success))]">
            Early user feedback
          </div>
          <h2 className="text-3xl font-extrabold lg:text-4xl">
            From businesses using it right now
          </h2>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.figure
              key={testimonial.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="flex flex-col rounded-2xl border border-border bg-card p-6"
            >
              <Quote
                className="mb-3 h-6 w-6 text-[hsl(var(--accent))]"
                aria-hidden="true"
              />
              <blockquote className="flex-1 text-[15px] leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              <figcaption className="mt-4 border-t border-border pt-4">
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.business} · {testimonial.location}
                </p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
