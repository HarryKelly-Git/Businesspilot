import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Copy, Check, ArrowRight } from 'lucide-react';
import { Button } from '../ui';
import { Link } from 'react-router-dom';
import { industries } from '../../lib/industries';

export function LeakScore() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    industry: '',
    jobsPerMonth: '',
    avgJobValue: '',
    afterHoursCoverage: '',
  });
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedIndustry = industries.find(i => i.id === formData.industry);

  const leakScore = useMemo(() => {
    if (!formData.jobsPerMonth || !formData.avgJobValue || !formData.afterHoursCoverage) return 0;

    const jobs = parseInt(formData.jobsPerMonth) || 0;
    const value = parseInt(formData.avgJobValue) || 0;
    const hasCoverage = formData.afterHoursCoverage === 'yes';

    // Formula: Base score from volume + penalty for no after-hours coverage
    let score = 30; // Base

    // Volume impact (more jobs = more potential leaks)
    if (jobs > 50) score += 25;
    else if (jobs > 30) score += 20;
    else if (jobs > 15) score += 15;
    else if (jobs > 5) score += 10;
    else score += 5;

    // No after-hours penalty
    if (!hasCoverage) score += 25;
    else score += 5;

    // Value impact (higher value = more to lose)
    if (value > 500) score += 15;
    else if (value > 300) score += 10;
    else if (value > 100) score += 5;
    else score += 3;

    // Emergency services have higher risk
    const highRiskIndustries = ['plumber', 'hvac', 'electrician', 'pest_control', 'veterinary'];
    if (highRiskIndustries.includes(formData.industry)) score += 5;

    return Math.min(100, Math.max(0, score));
  }, [formData]);

  const monthlyLoss = useMemo(() => {
    if (!formData.jobsPerMonth || !formData.avgJobValue) return 0;
    const jobs = parseInt(formData.jobsPerMonth) || 0;
    const value = parseInt(formData.avgJobValue) || 0;
    const missedCalls = Math.round(jobs * 0.15); // ~15% of leads come after hours
    const loss = missedCalls * value * 0.6; // 60% close rate
    return loss;
  }, [formData]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Critical - High Leak Risk';
    if (score >= 40) return 'Moderate Leak Risk';
    return 'Low Leak Risk';
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleShare = async () => {
    const text = `I just checked my business with BusinessPilot's Leak Score calculator. My score: ${leakScore}/100 - that's an estimated $${monthlyLoss.toLocaleString()}/month in missed revenue! Check yours at businesspilot.ai`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(text);
    }
  };

  const reset = () => {
    setStep(0);
    setFormData({
      industry: '',
      jobsPerMonth: '',
      avgJobValue: '',
      afterHoursCoverage: '',
    });
    setShowResult(false);
  };

  return (
    <section className="py-12 sm:py-16 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-semibold mb-4">
            <AlertTriangle className="w-4 h-4" />
            Free Audit Tool
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
            What's Your Leak Score?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Answer 4 quick questions to discover how much revenue is slipping through the cracks.
          </p>
        </motion.div>

        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border p-8 shadow-xl"
          >
            {!showResult ? (
              <>
                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-8">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        i <= step ? 'bg-[hsl(var(--accent))]' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>

                {/* Questions */}
                <div className="min-h-[220px]">
                  {step === 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <p className="text-lg font-semibold mb-4 text-center">What's your industry?</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-2">
                        {industries.map((industry) => {
                          const Icon = industry.icon;
                          const isSelected = formData.industry === industry.id;
                          return (
                            <button
                              key={industry.id}
                              onClick={() => setFormData({ ...formData, industry: industry.id })}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                isSelected
                                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md'
                                  : 'bg-muted hover:bg-muted/80 border border-border'
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate text-left">{industry.shortName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <p className="text-lg font-semibold mb-4 text-center">How many jobs do you complete per month?</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['1-5', '6-15', '16-30', '31-50', '50+'].map((range) => (
                          <button
                            key={range}
                            onClick={() => setFormData({ ...formData, jobsPerMonth: range === '50+' ? '60' : range.split('-')[1] || range })}
                            className={`px-4 py-4 rounded-lg text-sm font-semibold transition-all ${
                              formData.jobsPerMonth === (range === '50+' ? '60' : range.split('-')[1] || range)
                                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md'
                                : 'bg-muted hover:bg-muted/80 border border-border'
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <p className="text-lg font-semibold mb-4 text-center">What's your average job value?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['Under $100', '$100-$300', '$300-$500', '$500-$1000', '$1000-$3000', '$3000+'].map((range) => (
                          <button
                            key={range}
                            onClick={() => {
                              let value = '100';
                              if (range.includes('Under')) value = '50';
                              else if (range.includes('$3000')) value = '5000';
                              else if (range.includes('+')) value = range.split('-')[1]?.replace('$', '').replace(/\+$/, '') || '5000';
                              else value = range.split('-')[1]?.replace('$', '') || '100';
                              setFormData({ ...formData, avgJobValue: value });
                            }}
                            className={`px-4 py-4 rounded-lg text-sm font-semibold transition-all ${
                              formData.avgJobValue === (range.includes('Under') ? '50' : range.includes('$3000') ? '5000' : range.split('-')[1]?.replace('$', '').replace(/\+$/, '') || '100')
                                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md'
                                : 'bg-muted hover:bg-muted/80 border border-border'
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <p className="text-lg font-semibold mb-4 text-center">Do you have after-hours call coverage?</p>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setFormData({ ...formData, afterHoursCoverage: 'yes' })}
                          className={`px-6 py-5 rounded-xl text-sm font-semibold transition-all ${
                            formData.afterHoursCoverage === 'yes'
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'bg-muted hover:bg-muted/80 border border-border'
                          }`}
                        >
                          <span className="block text-lg mb-1">Yes</span>
                          <span className="block text-xs opacity-70">Answering service, voicemail alerts, etc.</span>
                        </button>
                        <button
                          onClick={() => setFormData({ ...formData, afterHoursCoverage: 'no' })}
                          className={`px-6 py-5 rounded-xl text-sm font-semibold transition-all ${
                            formData.afterHoursCoverage === 'no'
                              ? 'bg-red-500 text-white shadow-lg'
                              : 'bg-muted hover:bg-muted/80 border border-border'
                          }`}
                        >
                          <span className="block text-lg mb-1">No</span>
                          <span className="block text-xs opacity-70">Calls go straight to voicemail</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="mt-8 flex justify-between">
                  {step > 0 && (
                    <Button variant="ghost" onClick={() => setStep(step - 1)}>
                      Back
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    onClick={handleNext}
                    disabled={
                      (step === 0 && !formData.industry) ||
                      (step === 1 && !formData.jobsPerMonth) ||
                      (step === 2 && !formData.avgJobValue) ||
                      (step === 3 && !formData.afterHoursCoverage)
                    }
                  >
                    {step === 3 ? 'Get My Score' : 'Next'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="mb-8">
                  <div className="relative w-36 h-36 mx-auto mb-4">
                    <svg className="w-36 h-36 transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                        className="text-muted"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeDasharray={`${leakScore * 3.77} 377`}
                        strokeLinecap="round"
                        className={getScoreColor(leakScore)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-extrabold ${getScoreColor(leakScore)}`}>
                        {leakScore}
                      </span>
                      <span className="text-xs text-muted-foreground">out of 100</span>
                    </div>
                  </div>
                  <p className={`font-bold text-lg ${getScoreColor(leakScore)}`}>
                    {getScoreLabel(leakScore)}
                  </p>
                </div>

                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Estimated Monthly Revenue Lost</p>
                  <motion.p
                    key={monthlyLoss}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-extrabold text-red-500"
                  >
                    ${monthlyLoss.toLocaleString()}
                  </motion.p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on missed after-hours calls and unresponsive leads
                  </p>
                </div>

                <div className="mb-8">
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy My Result
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-3">
                  <Link to="/auth?signup=true" className="block">
                    <Button className="w-full">
                      Fix My Leak Score
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Button variant="ghost" onClick={reset}>
                    Retake Quiz
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
