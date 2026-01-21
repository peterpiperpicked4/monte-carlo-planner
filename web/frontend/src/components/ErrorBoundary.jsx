import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CSS_COLORS } from '../utils/colors';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: CSS_COLORS.bgPrimary }}
          role="alert"
        >
          <div
            className="max-w-md w-full p-8 rounded-2xl text-center"
            style={{
              background: CSS_COLORS.bgElevated,
              border: `1px solid ${CSS_COLORS.border}`
            }}
          >
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(248, 113, 113, 0.1)' }}
            >
              <AlertTriangle className="w-8 h-8" style={{ color: CSS_COLORS.coral }} />
            </div>
            <h1 className="font-display text-2xl mb-3" style={{ color: CSS_COLORS.textPrimary }}>
              Something went wrong
            </h1>
            <p className="text-sm mb-6" style={{ color: CSS_COLORS.textSecondary }}>
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
              type="button"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
