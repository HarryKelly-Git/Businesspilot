import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { supabase } from '../../lib/supabase';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Writes straight to the `contact_submissions` table. RLS allows anonymous
 * INSERT but no SELECT, so visitors can submit without being able to read
 * anyone else's messages back. No third-party form service involved.
 */
export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSending(true);
    setError(null);

    const { error: insertError } = await supabase.from('contact_submissions').insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      source: 'website',
    });

    setSending(false);

    if (insertError) {
      console.error('Contact form error:', insertError);
      setError("That didn't send. Please try again in a moment.");
      return;
    }

    setSent(true);
  };

  const handleClose = () => {
    onClose();
    // Reset after the close animation so the form doesn't visibly flip back.
    setTimeout(() => {
      setSent(false);
      setName('');
      setEmail('');
      setMessage('');
      setError(null);
    }, 200);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={sent ? undefined : 'Get in touch'}>
      {sent ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--success))]/10">
            <CheckCircle
              className="h-7 w-7 text-[hsl(var(--success))]"
              aria-hidden="true"
            />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Message sent</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Thanks {name.split(' ')[0]} — we'll come back to you shortly.
          </p>
          <Button onClick={handleClose}>Close</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Questions about whether this suits your business? Send a message and you'll get a
            real reply.
          </p>

          <Input
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Textarea
            label="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            placeholder="What would you like to know?"
            className="min-h-[120px]"
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={sending} disabled={sending}>
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              Send message
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
