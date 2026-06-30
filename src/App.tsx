import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import DashboardLayout from './layouts/DashboardLayout';

// Lazy-loaded pages for code splitting — keeps the initial bundle small.
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LeadsPage = lazy(() => import('./pages/LeadsPage').then(m => ({ default: m.LeadsPage })));
const MissedCallsPage = lazy(() => import('./pages/MissedCallsPage').then(m => ({ default: m.MissedCallsPage })));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const SecurityPage = lazy(() => import('./pages/SecurityPage').then(m => ({ default: m.SecurityPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));

// Loading skeleton component
const PageSkeleton = () => (
  <div className="flex min-h-screen h-full items-center justify-center p-8">
    <div className="w-full max-w-4xl space-y-6">
      <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
      <div className="h-4 w-96 bg-gray-800/50 rounded animate-pulse" />
      <div className="grid grid-cols-4 gap-4 mt-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="h-64 bg-gray-800/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-800/50 rounded-lg animate-pulse" />
      </div>
    </div>
  </div>
);

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

          {user ? (
            <>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route
                path="/dashboard"
                element={
                  <DashboardLayout>
                    <DashboardPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/leads"
                element={
                  <DashboardLayout>
                    <LeadsPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/appointments"
                element={
                  <DashboardLayout>
                    <AppointmentsPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/missed-calls"
                element={
                  <DashboardLayout>
                    <MissedCallsPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/reports"
                element={
                  <DashboardLayout>
                    <ReportsPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/integrations"
                element={
                  <DashboardLayout>
                    <IntegrationsPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/settings"
                element={
                  <DashboardLayout>
                    <SettingsPage />
                  </DashboardLayout>
                }
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          ) : (
            <Route path="/dashboard" element={<Navigate to="/auth" replace />} />
          )}
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
