import { useState, useEffect, useCallback } from 'react';
import {
  Ghost,
  Upload,
  ClipboardPaste,
  PlusCircle,
  ArrowLeft,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Input, Textarea, Select, Badge, Spinner, EmptyState } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  importResurrectionLeads,
  generateResurrectionMessages,
  type RawResurrectionRow,
  type ResurrectionPreviewMessage,
} from '../lib/api';

// ---------------------------------------------------------------------------
// Parsing helpers (kept in-file — this is the only place they're used).
// ---------------------------------------------------------------------------

/** Delimiter-aware parser that respects quoted fields and quoted newlines. */
function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field); field = '';
    } else if (c === '\r') {
      // ignore
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

type FieldKey = 'name' | 'phone' | 'job_description' | 'quote_amount' | 'quote_date';
const FIELD_LABELS: Record<FieldKey, string> = {
  name: 'Name',
  phone: 'Phone (required)',
  job_description: 'Job description',
  quote_amount: 'Quote amount',
  quote_date: 'Quote date',
};

/** Guess which column maps to each field from the header text. */
function guessMapping(headers: string[]): Record<FieldKey, number> {
  const find = (keys: string[]) =>
    headers.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)));
  return {
    name: find(['name', 'customer', 'client', 'contact']),
    phone: find(['phone', 'mobile', 'cell', 'number', 'ph']),
    job_description: find(['job', 'description', 'service', 'work', 'notes', 'detail']),
    quote_amount: find(['quote', 'amount', 'price', 'value', 'total', '$']),
    quote_date: find(['date', 'when', 'quoted']),
  };
}

const ANGLE_OPTIONS = [
  { value: 'checking_in', label: 'Checking back in' },
  { value: 'availability', label: 'We have availability' },
  { value: 'seasonal', label: 'Seasonal reminder' },
  { value: 'custom', label: 'Custom message' },
];

interface Recipient {
  id: string;
  name: string | null;
  phone: string;
  job_description: string | null;
  quote_amount: number | null;
  quote_date: string | null;
  generated_message: string | null;
  included: boolean;
  status: string;
  sent_at: string | null;
  replied_at: string | null;
}

interface Campaign {
  id: string;
  name: string;
  angle: string;
  status: string;
  created_at: string;
}

// ===========================================================================

export function GhostLeadsPage() {
  const { business } = useAuth();
  const [mode, setMode] = useState<'overview' | 'import' | 'build'>('overview');
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Ghost className="w-7 h-7 text-indigo-400 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold">Ghost Lead Resurrector</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Reactivate old quotes and dead leads you already have. Import them, and we'll write a
        personalised text to win the job back.
      </p>

      {mode === 'overview' && (
        <Overview
          businessId={business?.id ?? null}
          onNew={() => setMode('import')}
          onOpen={(id) => { setActiveCampaignId(id); setMode('build'); }}
        />
      )}
      {mode === 'import' && (
        <ImportFlow
          onBack={() => setMode('overview')}
          onImported={(id) => { setActiveCampaignId(id); setMode('build'); }}
        />
      )}
      {mode === 'build' && activeCampaignId && (
        <CampaignBuilder
          campaignId={activeCampaignId}
          businessId={business?.id ?? null}
          onBack={() => { setActiveCampaignId(null); setMode('overview'); }}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- Overview

function Overview({
  businessId,
  onNew,
  onOpen,
}: {
  businessId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ sent: 0, replies: 0, booked: 0, revenue: 0, replyRate: 0 });

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      setLoading(true);
      const [{ data: camps }, { data: recips }] = await Promise.all([
        supabase
          .from('resurrection_campaigns')
          .select('id, name, angle, status, created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),
        supabase
          .from('resurrection_recipients')
          .select('status, quote_amount, sent_at, replied_at')
          .eq('business_id', businessId),
      ]);
      setCampaigns(camps ?? []);
      const rs = recips ?? [];
      const sent = rs.filter((r) => r.sent_at).length;
      const replies = rs.filter((r) => r.replied_at).length;
      const booked = rs.filter((r) => r.status === 'booked').length;
      const revenue = rs
        .filter((r) => r.status === 'booked')
        .reduce((s, r) => s + (Number(r.quote_amount) || 0), 0);
      setStats({ sent, replies, booked, revenue, replyRate: sent ? Math.round((replies / sent) * 100) : 0 });
      setLoading(false);
    })();
  }, [businessId]);

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  const statCards = [
    { label: 'Messages sent', value: stats.sent.toString() },
    { label: 'Replies', value: stats.replies.toString() },
    { label: 'Reply rate', value: `${stats.replyRate}%` },
    { label: 'Jobs booked', value: stats.booked.toString() },
    { label: 'Revenue recovered', value: `NZ$${stats.revenue.toLocaleString()}`, highlight: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={`p-4 ${s.highlight ? 'border-indigo-500/40 col-span-2 md:col-span-1' : ''}`}
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 break-words ${s.highlight ? 'text-indigo-400' : ''}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campaigns</h2>
        <Button onClick={onNew} className="gap-2">
          <PlusCircle className="w-4 h-4" /> New campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={<Ghost className="w-10 h-10" />}
            title="No campaigns yet"
            description="Import your old quotes and dead leads to bring them back to life."
            action={<Button onClick={onNew} className="gap-2"><PlusCircle className="w-4 h-4" /> Start your first campaign</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <Card key={c.id} hover className="p-4 flex items-center justify-between gap-4" onClick={() => onOpen(c.id)}>
              <div className="min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ANGLE_OPTIONS.find((a) => a.value === c.angle)?.label ?? c.angle} ·{' '}
                  {new Date(c.created_at).toLocaleDateString('en-NZ')}
                </p>
              </div>
              <Badge variant={c.status === 'sent' ? 'success' : 'muted'}>{c.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- Import flow

function ImportFlow({ onBack, onImported }: { onBack: () => void; onImported: (id: string) => void }) {
  const [method, setMethod] = useState<'csv' | 'paste' | 'manual'>('csv');
  const [rawRows, setRawRows] = useState<string[][]>([]);   // parsed CSV/paste grid
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Record<FieldKey, number>>({
    name: -1, phone: -1, job_description: -1, quote_amount: -1, quote_date: -1,
  });
  const [manualRows, setManualRows] = useState<RawResurrectionRow[]>([]);
  const [manualDraft, setManualDraft] = useState<RawResurrectionRow>({});

  const [campaignName, setCampaignName] = useState('');
  const [angle, setAngle] = useState('checking_in');
  const [customMessage, setCustomMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [skipped, setSkipped] = useState<Array<{ name: string; phone: string; reason: string }> | null>(null);

  const ingest = (text: string, delim: string) => {
    const grid = parseDelimited(text, delim);
    if (grid.length === 0) { toast.error('Nothing to import'); return; }
    setRawRows(grid);
    setMapping(guessMapping(grid[0]));
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => ingest(String(reader.result ?? ''), ',');
    reader.readAsText(file);
  };

  // Build the final recipient list from whichever method is active.
  const buildRecipients = (): RawResurrectionRow[] => {
    if (method === 'manual') return manualRows;
    const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
    const pick = (r: string[], idx: number) => (idx >= 0 ? (r[idx] ?? '').trim() : '');
    return dataRows.map((r) => ({
      name: pick(r, mapping.name),
      phone: pick(r, mapping.phone),
      job_description: pick(r, mapping.job_description),
      quote_amount: pick(r, mapping.quote_amount),
      quote_date: pick(r, mapping.quote_date),
    }));
  };

  const recipientCount =
    method === 'manual' ? manualRows.length : Math.max(0, rawRows.length - (hasHeader ? 1 : 0));
  const phoneMapped = method === 'manual' || mapping.phone >= 0;

  const doImport = async () => {
    const recipients = buildRecipients();
    if (recipients.length === 0) { toast.error('No leads to import'); return; }
    setImporting(true);
    const res = await importResurrectionLeads({
      name: campaignName,
      angle,
      custom_message: angle === 'custom' ? customMessage : undefined,
      recipients,
      confirmed,
    });
    setImporting(false);
    if (res.error || !res.campaign_id) {
      toast.error(res.error || 'Import failed');
      return;
    }
    if (res.skipped && res.skipped.length > 0) {
      setSkipped(res.skipped);
    }
    toast.success(`Imported ${res.imported} lead${res.imported === 1 ? '' : 's'}${res.suppressed ? `, ${res.suppressed} on opt-out list` : ''}`);
    onImported(res.campaign_id);
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Method picker */}
      <div className="flex flex-wrap gap-2">
        {([['csv', 'CSV upload', Upload], ['paste', 'Paste a list', ClipboardPaste], ['manual', 'Enter manually', PlusCircle]] as const).map(
          ([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setMethod(key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                method === key ? 'border-indigo-500 bg-indigo-500/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          )
        )}
      </div>

      <Card className="p-5 space-y-4">
        {method === 'csv' && (
          <div>
            <label className="label">Upload a CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:text-foreground hover:file:bg-muted/80"
            />
            <p className="mt-1 text-xs text-muted-foreground">Any column layout is fine — you'll map the columns next.</p>
          </div>
        )}

        {method === 'paste' && (
          <div>
            <Textarea
              label="Paste rows (from a spreadsheet, or comma-separated)"
              placeholder={'Sarah Jones, 021 555 0142, Bathroom reno, 4200, 12/03/2026\nJohn Smith, 027 555 0198, Deck build, 8800, 05/02/2026'}
              onChange={(e) => {
                const text = e.target.value;
                if (text.trim()) ingest(text, text.includes('\t') ? '\t' : ',');
                else setRawRows([]);
              }}
              className="min-h-[140px] font-mono text-xs"
            />
          </div>
        )}

        {method === 'manual' && (
          <ManualEntry
            rows={manualRows}
            draft={manualDraft}
            setDraft={setManualDraft}
            onAdd={() => {
              if (!manualDraft.phone?.trim()) { toast.error('Phone is required'); return; }
              setManualRows((rows) => [...rows, manualDraft]);
              setManualDraft({});
            }}
            onRemove={(i) => setManualRows((rows) => rows.filter((_, idx) => idx !== i))}
          />
        )}

        {/* Column mapping (CSV/paste only) */}
        {method !== 'manual' && rawRows.length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Map your columns</p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                First row is a header
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(FIELD_LABELS) as FieldKey[]).map((f) => (
                <Select
                  key={f}
                  label={FIELD_LABELS[f]}
                  value={String(mapping[f])}
                  onChange={(e) => setMapping((m) => ({ ...m, [f]: Number(e.target.value) }))}
                  options={[
                    { value: '-1', label: '— none —' },
                    ...rawRows[0].map((h, i) => ({ value: String(i), label: hasHeader ? h || `Column ${i + 1}` : `Column ${i + 1}` })),
                  ]}
                />
              ))}
            </div>
            {!phoneMapped && <p className="text-xs text-warning">Map the Phone column to continue.</p>}
          </div>
        )}
      </Card>

      {/* Campaign details */}
      <Card className="p-5 space-y-4">
        <Input label="Campaign name" placeholder="Old bathroom quotes" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
        <Select label="Message angle" value={angle} onChange={(e) => setAngle(e.target.value)} options={ANGLE_OPTIONS} />
        {angle === 'custom' && (
          <Textarea
            label="Custom angle instruction"
            placeholder="e.g. Let them know we're doing 10% off deck builds before winter."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
        )}
      </Card>

      {/* Compliance */}
      <Card className="p-5 space-y-3 border-amber-500/30">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">These must be people who previously contacted your business.</p>
            <p className="mt-1">
              NZ law (Unsolicited Electronic Messages Act 2007) requires an existing relationship, that every
              message identifies you, and a working opt-out. We add “Reply STOP to opt out” to every message and
              never text anyone who has opted out. Do not import purchased or scraped lists.
            </p>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          <span>I confirm these are people who previously contacted my business.</span>
        </label>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={doImport}
          loading={importing}
          disabled={!confirmed || recipientCount === 0 || !phoneMapped}
          className="gap-2"
        >
          <Upload className="w-4 h-4" /> Import {recipientCount > 0 ? `${recipientCount} lead${recipientCount === 1 ? '' : 's'}` : 'leads'}
        </Button>
        {!confirmed && recipientCount > 0 && <span className="text-xs text-muted-foreground">Tick the confirmation to continue.</span>}
      </div>

      {skipped && skipped.length > 0 && (
        <Card className="p-4 border-warning/30">
          <p className="text-sm font-medium flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> {skipped.length} row{skipped.length === 1 ? '' : 's'} skipped
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5 max-h-40 overflow-y-auto">
            {skipped.map((s, i) => (
              <li key={i}>{s.name || s.phone || `Row ${i + 1}`} — {s.reason}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ManualEntry({
  rows, draft, setDraft, onAdd, onRemove,
}: {
  rows: RawResurrectionRow[];
  draft: RawResurrectionRow;
  setDraft: (d: RawResurrectionRow) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Name" value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <Input label="Phone" placeholder="021 123 4567" value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        <Input label="Job description" value={draft.job_description ?? ''} onChange={(e) => setDraft({ ...draft, job_description: e.target.value })} />
        <Input label="Quote amount" placeholder="4200" value={draft.quote_amount ?? ''} onChange={(e) => setDraft({ ...draft, quote_amount: e.target.value })} />
        <Input label="Quote date" placeholder="12/03/2026" value={draft.quote_date ?? ''} onChange={(e) => setDraft({ ...draft, quote_date: e.target.value })} />
      </div>
      <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5"><PlusCircle className="w-4 h-4" /> Add lead</Button>
      {rows.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="truncate">{r.name || '(no name)'} · {r.phone}</span>
              <button onClick={() => onRemove(i)} aria-label={`Remove ${r.name || r.phone || 'lead'}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- Campaign builder

function CampaignBuilder({
  campaignId, businessId, onBack,
}: {
  campaignId: string;
  businessId: string | null;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [previews, setPreviews] = useState<ResurrectionPreviewMessage[] | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('resurrection_recipients')
      .select('id, name, phone, job_description, quote_amount, quote_date, generated_message, included, status, sent_at, replied_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });
    setRecipients((data as Recipient[]) ?? []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string, included: boolean) => {
    setRecipients((rs) => rs.map((r) => (r.id === id ? { ...r, included } : r)));
    await supabase.from('resurrection_recipients').update({ included }).eq('id', id);
  };

  const includedCount = recipients.filter((r) => r.included && r.status !== 'suppressed').length;
  const suppressedCount = recipients.filter((r) => r.status === 'suppressed').length;

  const preview = async () => {
    setGenerating(true);
    const res = await generateResurrectionMessages(campaignId, 3);
    setGenerating(false);
    if (res.error) { toast.error(res.error); return; }
    setPreviews(res.messages ?? []);
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to campaigns
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {includedCount} of {recipients.length} selected to send
          {suppressedCount > 0 && <span> · {suppressedCount} on opt-out list (excluded)</span>}
        </p>
        <Button variant="outline" onClick={preview} loading={generating} disabled={includedCount === 0} className="gap-2">
          <Sparkles className="w-4 h-4" /> Preview first 3 messages
        </Button>
      </div>

      {/* Preview */}
      {previews && (
        <Card className="p-5 space-y-3">
          <p className="text-sm font-medium">Preview — this is exactly what the first {previews.length} will receive:</p>
          {previews.length === 0 && <p className="text-sm text-muted-foreground">No included recipients to preview.</p>}
          {previews.map((p) => (
            <div key={p.id} className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">{p.name || p.phone}</p>
              {p.message
                ? <p className="text-sm whitespace-pre-wrap">{p.message}</p>
                : <p className="text-sm text-destructive">Could not generate — check the Anthropic API key.</p>}
            </div>
          ))}
        </Card>
      )}

      {/* Recipient list */}
      <Card className="p-0 overflow-hidden">
        <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
          {recipients.map((r) => {
            const suppressed = r.status === 'suppressed';
            return (
              <label key={r.id} className={`flex items-center gap-3 px-4 py-3 ${suppressed ? 'opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={r.included && !suppressed}
                  disabled={suppressed}
                  onChange={(e) => toggle(r.id, e.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.name || '(no name)'} · {r.phone}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.job_description || 'No job details'}
                    {r.quote_amount != null && ` · NZ$${r.quote_amount}`}
                  </p>
                </div>
                {suppressed && <Badge variant="destructive">opted out</Badge>}
              </label>
            );
          })}
        </div>
      </Card>

      {/* Send — deliberately disabled until the SMS provider is live. */}
      <div className="flex flex-wrap items-center gap-3">
        <span title="SMS sending will be enabled once TNZ is connected" className="inline-block">
          <Button disabled className="gap-2 cursor-not-allowed">
            <Send className="w-4 h-4" /> Send campaign
          </Button>
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          SMS sending will be enabled once TNZ is connected.
        </span>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-success" />
        Every message identifies your business and includes “Reply STOP to opt out”. Opt-outs are honoured across all campaigns.
      </p>
    </div>
  );
}
