import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('signup') === 'true' ? 'signup' : 'signin'
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const isSignup = mode === 'signup';

  const toggleMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setSignupSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (isSignup && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (isSignup && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { error: signUpError } = await signUp(email, password, fullName.trim());
        if (signUpError) {
          setError(signUpError.message);
        } else {
          // If the project auto-confirms, AuthContext's listener signs the user in
          // and App redirects to /dashboard. Otherwise, prompt to confirm via email.
          setSignupSuccess(true);
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message);
        }
        // On success, the auth listener flips the session and App redirects.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link to="/">
              <Logo size="lg" />
            </Link>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-extrabold text-foreground">
                {isSignup ? 'Start your free trial' : 'Welcome back'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSignup
                  ? '14 days free. No credit card required.'
                  : 'Sign in to your BusinessPilot account.'}
              </p>
            </div>

            {signupSuccess ? (
              <div className="text-center space-y-4">
                <div className="rounded-lg bg-success/10 text-success px-4 py-3 text-sm">
                  Account created! Check your inbox to confirm your email address, then sign in.
                </div>
                <Button className="w-full" onClick={() => setMode('signin')}>
                  Go to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <Input
                    label="Full name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    icon={<UserIcon className="w-4 h-4" />}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                )}

                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@business.com"
                  icon={<Mail className="w-4 h-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />

                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                    icon={<Lock className="w-4 h-4" />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" loading={loading} disabled={loading}>
                  {isSignup ? 'Create account' : 'Sign in'}
                </Button>
              </form>
            )}

            {!signupSuccess && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-medium text-[hsl(var(--accent))] hover:underline"
                >
                  {isSignup ? 'Sign in' : 'Start free trial'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
