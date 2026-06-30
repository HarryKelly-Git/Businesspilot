import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(7);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated success icon */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative w-24 h-24 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 text-sm font-medium">Payment successful</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">You're all set!</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Your subscription is now active. Welcome aboard — your AI-powered business assistant is ready to go.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 text-left">
          <p className="text-gray-500 text-sm mb-4">What's next?</p>
          <ul className="space-y-3">
            {['Set up your business profile', 'Configure your AI assistant', 'Connect your phone number'].map(
              (item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-400 text-xs font-bold">{i + 1}</span>
                  </div>
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-gray-600 text-sm mt-4">Redirecting automatically in {countdown}s</p>
      </div>
    </div>
  );
}