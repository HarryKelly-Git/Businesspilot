import Anthropic from "npm:@anthropic-ai/sdk@0.112.5";

/**
 * Claude Haiku 4.5 — used for ALL customer-facing AI (SMS replies, demo widget,
 * daily coach). Fast and cheap, which is what matters when a customer is waiting
 * on a text at 11pm.
 *
 * The previous model here (claude-3-haiku-20240307) was retired on 2026-04-19,
 * so every call had been failing and silently falling through to canned replies.
 */
export const HAIKU_MODEL = "claude-haiku-4-5";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

export const anthropic = ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  : null;

/**
 * Default qualifying questions per industry. These are seed values — a business
 * that has customised its questions in Settings overrides them via
 * businesses.settings.qualifyingQuestions, which is the runtime source of truth.
 * Keys match the industry ids in src/lib/industries.ts.
 */
export const INDUSTRY_QUESTIONS: Record<string, string[]> = {
  electrician: [
    "Is this an emergency or routine work?",
    "Do you own or rent the property?",
    "What area are you in?",
  ],
  plumber: [
    "Is there water actively leaking right now?",
    "Is it a hot or cold water issue?",
    "What's the address?",
  ],
  builder: [
    "Is this a new build, a renovation, or a repair?",
    "What's the approximate scope?",
    "When are you looking to start?",
  ],
  mechanic: [
    "What's the make, model and year?",
    "Is it driveable, or does it need collection?",
    "What symptoms is it showing?",
  ],
  hvac: [
    "Is this heating or cooling?",
    "Has it failed completely, or is it underperforming?",
    "How old is the unit?",
  ],
  salon: [
    "What service are you after?",
    "Do you have a preferred stylist?",
    "Which days and times work for you?",
  ],
  dental: [
    "Are you a new or existing patient?",
    "Is this urgent pain, or a routine checkup?",
    "Do you have dental insurance?",
  ],
  veterinary: [
    "Is this an emergency or routine?",
    "What type of pet, and roughly how old?",
    "What symptoms are you seeing?",
  ],
  real_estate: [
    "Are you looking to buy, sell, or both?",
    "What's your timeframe?",
    "Which area are you interested in?",
  ],
  cleaning: [
    "Is this residential or commercial?",
    "One-off or regular service?",
    "Roughly what size is the space?",
  ],
  landscaper: [
    "What does the job involve?",
    "Roughly what size is the area?",
    "Is this one-off or ongoing maintenance?",
  ],
  law_firm: [
    "What type of legal matter is this?",
    "Is this urgent?",
    "Have you worked with a lawyer on this already?",
  ],
  personal_trainer: [
    "What are your goals?",
    "Do you prefer the gym or in-home sessions?",
    "How often would you like to train?",
  ],
  photographer: [
    "What type of shoot is it?",
    "What's the date and location?",
    "Do you have a budget in mind?",
  ],
  pest_control: [
    "What kind of pest are you seeing?",
    "Whereabouts on the property?",
    "Is it a rental or owner-occupied?",
  ],
  other: [
    "What service do you need?",
    "How urgent is it?",
    "What area are you in?",
  ],
};

export interface BusinessContext {
  name: string | null;
  industry: string | null;
  settings: Record<string, unknown> | null;
}

/**
 * New Zealand context so the AI understands Kiwi customers naturally — this is
 * the difference between a US-tuned bot and one built for NZ trades. Shared by
 * the customer-facing SMS prompt and the demo widget.
 */
export const NZ_CONTEXT = `NEW ZEALAND
You are talking to New Zealand customers. Write in New Zealand English (organised, colour, labour, specialise, cheque) and money is always NZ dollars, written like NZ$450.

Understand Kiwi words and use them naturally when the customer does:
- "munted" / "buggered" = broken; "sweet as", "chur", "yeah nah" / "nah yeah" = casual agreement/disagreement; "keen" = interested; "heaps" = a lot; "flat out" = very busy.
- Trade terms: hot water cylinder (not "water heater"); spouting (not "gutters"); gib / gibbing = plasterboard; sparky = electrician; chippy = builder; RCD (not GFCI); switchboard (not "breaker panel"); section = the property/land; ute = pickup; bach / crib = holiday home; the dairy = corner shop; jandals = flip-flops.
- Dates are day/month (e.g. 7/10 = 7 October). Times often "half four" = 4:30.

If a customer is in Christchurch/Canterbury, these are local suburbs and towns you can confirm naturally: Riccarton, Papanui, Merivale, Sydenham, Addington, Fendalton, Ilam, Hornby, Halswell, Sumner, New Brighton, Shirley, Burwood, Linwood, Woolston, Cashmere, Rolleston, Rangiora, Kaiapoi.`;

/**
 * Builds the system prompt. Stable, business-specific content only — nothing
 * per-message goes in here, so the prefix stays byte-identical across every
 * message for a given business and can be cached.
 */
export function buildSystemPrompt(business: BusinessContext): string {
  const settings = business.settings ?? {};
  const industry = (business.industry as string) || "other";

  const custom = settings.qualifyingQuestions as string[] | undefined;
  const questions =
    custom && custom.length > 0 ? custom : INDUSTRY_QUESTIONS[industry] ?? INDUSTRY_QUESTIONS.other;

  const tone = (settings.responseTone as string) || "friendly";
  const description = settings.businessDescription as string | undefined;
  const services = settings.services as string[] | undefined;
  const serviceArea = settings.serviceArea as string | undefined;
  const customInstructions = settings.customInstructions as string | undefined;
  const transferInstructions = settings.transferInstructions as string | undefined;
  const faqs = settings.faqs as Array<{ question: string; answer: string }> | undefined;

  const parts: string[] = [
    `You are answering enquiries for ${business.name || "a local service business"}, replying by SMS on the owner's behalf.`,
    description ? `About the business: ${description}` : "",
    services?.length ? `Services offered: ${services.join(", ")}.` : "",
    serviceArea ? `Service area: ${serviceArea}.` : "",
    "",
    "YOUR JOB",
    "Turn this enquiry into a booked job. Reply immediately, sound like a real person from the business, and work towards a confirmed time.",
    "",
    "QUALIFYING QUESTIONS",
    "Work these in naturally across the conversation. Ask ONE at a time — never send a numbered list:",
    ...questions.map((q) => `- ${q}`),
    "",
    "RULES",
    `- Tone: ${tone}. Write like a person texting, not a chatbot.`,
    "- Keep every reply under 160 characters where you can. This is SMS.",
    "- Ask one question per message.",
    "- Never invent prices, availability, or timeframes. If you don't know, say the owner will confirm.",
    "- Once you have enough detail, propose a specific time to book.",
    "- Never say you are an AI unless you are asked directly.",
    "",
    NZ_CONTEXT,
  ];

  if (faqs?.length) {
    parts.push("", "COMMON QUESTIONS AND APPROVED ANSWERS");
    for (const faq of faqs) {
      parts.push(`Q: ${faq.question}\nA: ${faq.answer}`);
    }
  }

  if (customInstructions) {
    parts.push("", `ADDITIONAL INSTRUCTIONS FROM THE OWNER: ${customInstructions}`);
  }

  if (transferInstructions) {
    parts.push("", `WHEN TO HAND OFF TO THE OWNER: ${transferInstructions}`);
  }

  return parts.filter(Boolean).join("\n");
}

/**
 * Generates a reply. Returns null when the API is unconfigured or errors — the
 * caller decides what to do rather than silently serving a canned line that
 * looks like a working AI.
 */
export async function generateReply(
  business: BusinessContext,
  customerMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string | null> {
  if (!anthropic) {
    console.error("ANTHROPIC_API_KEY is not configured");
    return null;
  }

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 300, // Deliberately small — these are SMS replies.
      system: [
        {
          type: "text",
          text: buildSystemPrompt(business),
          // Caching only engages above 4096 tokens on Haiku 4.5, so this is a
          // no-op for a business with a short profile and starts paying off
          // once they add FAQs and custom instructions.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        ...history.slice(-8).map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
        { role: "user" as const, content: customerMessage },
      ],
    });

    console.log("Anthropic usage:", {
      model: HAIKU_MODEL,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
    });

    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text.trim() : null;
  } catch (error) {
    console.error("Anthropic API error:", error);
    return null;
  }
}
