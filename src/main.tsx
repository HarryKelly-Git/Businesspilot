import { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 6h10c3.5 0 6 2 6 5.5S21.5 17 18 17h-4l6 9h-4l-6-9v9H8V6z" fill="rgba(255,255,255,0.9)"/>
              <path d="M8 6h8c2.5 0 4.5 1.5 4.5 4S18.5 14 16 14H8V6z" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '24px', maxWidth: '400px' }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
          {this.state.error && (
            <details style={{ marginTop: '24px', maxWidth: '600px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>
                View error details
              </summary>
              <pre style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '12px',
                color: '#f87171',
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <App />
        {/* Without this, every toast.success/toast.error in the app renders nothing. */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: 'hsl(var(--success))', secondary: 'white' } },
            error: { iconTheme: { primary: 'hsl(var(--destructive))', secondary: 'white' } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
