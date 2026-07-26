import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingDown, DollarSign, ArrowRight, Check } from 'lucide-react';
import { Button } from '../ui';
import { Link } from 'react-router-dom';
import { industries } from '../../lib/industries';

export function IndustryCalculator() {
  const [selectedIndustry, setSelectedIndustry] = useState(industries[0]);
  const [missedCalls, setMissedCalls] = useState(industries[0].missedCalls);
  const [avgJobValue, setAvgJobValue] = useState(industries[0].avgJobValue);
  const [closeRate, setCloseRate] = useState(industries[0].closeRate);

  const handleIndustryChange = (industryId: string) => {
    const industry = industries.find(i => i.id === industryId);
    if (industry) {
      setSelectedIndustry(industry);
      setMissedCalls(industry.missedCalls);
      setAvgJobValue(industry.avgJobValue);
      setCloseRate(industry.closeRate);
    }
  };

  const monthlyLoss = useMemo(() => {
    const capturedLeads = missedCalls * (closeRate / 100);
    return capturedLeads * avgJobValue;
  }, [missedCalls, avgJobValue, closeRate]);

  const yearlyLoss = monthlyLoss * 12;

  // ROI: how many recovered jobs it takes to cover the plan.
  // Note: previously this also computed a "weeks to recover" figure as
  // 30 / (jobsToRecover * 30), which algebraically collapses to 1/jobsToRecover
  // and always rounded to 1 — it claimed "one extra job every 1 week" for every
  // trade regardless of input. Removed rather than shown wrong.
  const growthPlanCost = 99;
  const jobsToRecoverMonthly = Math.max(1, Math.ceil(growthPlanCost / avgJobValue));

  return (
    <section className="py-12 sm:py-16 lg:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold mb-4">
            <TrendingDown className="w-4 h-4" />
            See What You're Losing
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
            Lost Revenue Calculator
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select your industry and adjust the numbers to see how much revenue is slipping away.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border p-5 sm:p-8 shadow-xl"
          >
            {/* Industry Selection */}
            <div className="mb-8">
              <label className="block text-sm font-semibold mb-3">Select Your Industry</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {industries.map((industry) => {
                  const Icon = industry.icon;
                  const isSelected = selectedIndustry.id === industry.id;
                  return (
                    <button
                      key={industry.id}
                      onClick={() => handleIndustryChange(industry.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md'
                          : 'bg-muted hover:bg-muted/80 text-foreground border border-border hover:border-[hsl(var(--accent))]/50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{industry.shortName}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Sliders pre-filled with estimated industry averages. Adjust to match your business.
              </p>
            </div>

            {/* Sliders */}
            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold">Missed Calls Per Month</label>
                  <span className="text-sm text-[hsl(var(--accent))] font-bold">{missedCalls}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={missedCalls}
                  onChange={(e) => setMissedCalls(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: 'hsl(var(--accent))' }}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5</span>
                  <span>100</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold">Average Job Value ($)</label>
                  <span className="text-sm text-[hsl(var(--accent))] font-bold">${avgJobValue.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="10000"
                  step="50"
                  value={avgJobValue}
                  onChange={(e) => setAvgJobValue(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: 'hsl(var(--accent))' }}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>$50</span>
                  <span>$10,000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold">Close Rate (%)</label>
                  <span className="text-sm text-[hsl(var(--accent))] font-bold">{closeRate}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  value={closeRate}
                  onChange={(e) => setCloseRate(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: 'hsl(var(--accent))' }}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>20%</span>
                  <span>95%</span>
                </div>
              </div>
            </div>

            {/* Results — the monthly loss is the emotional number, so it dominates. */}
            <div className="mt-10 pt-8 border-t border-border">
              <motion.div
                key={monthlyLoss}
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-2xl border-2 border-red-500/30 bg-red-500/5 p-6 sm:p-8 text-center"
              >
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-red-500">
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                  You are losing approximately
                </div>
                <p className="text-6xl font-extrabold leading-none text-red-500 sm:text-7xl">
                  ${monthlyLoss.toLocaleString()}
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">every month</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  ${yearlyLoss.toLocaleString()} a year · based on {missedCalls} missed calls at a{' '}
                  {closeRate}% close rate
                </p>
              </motion.div>

              {/* ROI framing */}
              <div className="mt-6 rounded-xl border border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/5 p-5">
                <p className="text-center text-base font-medium">
                  BusinessPilot pays for itself if it books you just{' '}
                  <span className="text-xl font-extrabold text-[hsl(var(--success))]">
                    {jobsToRecoverMonthly} extra {selectedIndustry.shortName.toLowerCase()} job
                    {jobsToRecoverMonthly > 1 ? 's' : ''}
                  </span>{' '}
                  a month.
                </p>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  At NZ$99/month on the Growth plan.
                </p>
              </div>

              <div className="mt-8 text-center">
                <Link to="/auth?signup=true">
                  <Button size="lg" className="px-8 py-5 text-lg font-bold">
                    Start recovering this revenue — free for 14 days
                    <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                  </Button>
                </Link>

                {/* Trust Badges */}
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    14-day free trial
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    No credit card required
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500" />
                    Cancel anytime
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
