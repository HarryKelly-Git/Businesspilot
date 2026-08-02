/**
 * Read-only mirror of INDUSTRY_QUESTIONS in
 * supabase/functions/_shared/ai.ts — the qualifying questions the AI actually
 * works into its SMS replies for each industry (when the owner hasn't overridden
 * them via settings.qualifyingQuestions).
 *
 * Kept as a frontend copy because the edge-function module is Deno and can't be
 * imported here. If you change the questions in _shared/ai.ts, update them here
 * too so onboarding shows what the AI genuinely asks.
 */
export const INDUSTRY_QUESTIONS: Record<string, string[]> = {
  electrician: [
    'Is this an emergency or routine work?',
    'Do you own or rent the property?',
    'What area are you in?',
  ],
  plumber: [
    'Is there water actively leaking right now?',
    'Is it a hot or cold water issue?',
    "What's the address?",
  ],
  builder: [
    'Is this a new build, a renovation, or a repair?',
    "What's the approximate scope?",
    'When are you looking to start?',
  ],
  mechanic: [
    "What's the make, model and year?",
    'Is it driveable, or does it need collection?',
    'What symptoms is it showing?',
  ],
  hvac: [
    'Is this heating or cooling?',
    'Has it failed completely, or is it underperforming?',
    'How old is the unit?',
  ],
  salon: [
    'What service are you after?',
    'Do you have a preferred stylist?',
    'Which days and times work for you?',
  ],
  dental: [
    'Are you a new or existing patient?',
    'Is this urgent pain, or a routine checkup?',
    'Do you have dental insurance?',
  ],
  veterinary: [
    'Is this an emergency or routine?',
    'What type of pet, and roughly how old?',
    'What symptoms are you seeing?',
  ],
  real_estate: [
    'Are you looking to buy, sell, or both?',
    "What's your timeframe?",
    'Which area are you interested in?',
  ],
  cleaning: [
    'Is this residential or commercial?',
    'One-off or regular service?',
    'Roughly what size is the space?',
  ],
  landscaper: [
    'What does the job involve?',
    'Roughly what size is the area?',
    'Is this one-off or ongoing maintenance?',
  ],
  law_firm: [
    'What type of legal matter is this?',
    'Is this urgent?',
    'Have you worked with a lawyer on this already?',
  ],
  personal_trainer: [
    'What are your goals?',
    'Do you prefer the gym or in-home sessions?',
    'How often would you like to train?',
  ],
  photographer: [
    'What type of shoot is it?',
    "What's the date and location?",
    'Do you have a budget in mind?',
  ],
  pest_control: [
    'What kind of pest are you seeing?',
    'Whereabouts on the property?',
    'Is it a rental or owner-occupied?',
  ],
  other: [
    'What service do you need?',
    'How urgent is it?',
    'What area are you in?',
  ],
};

/** The questions the AI will use for an industry (falls back to the generic set). */
export function questionsForIndustry(industryId: string | null | undefined): string[] {
  if (!industryId) return INDUSTRY_QUESTIONS.other;
  return INDUSTRY_QUESTIONS[industryId] ?? INDUSTRY_QUESTIONS.other;
}
