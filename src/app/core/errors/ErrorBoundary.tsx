/**
 * ErrorBoundary — Global error catch for DrivePass+
 *
 * Rule 2.5: ErrorWidget equivalent — displays custom error screen.
 * Rule 6.1: Never ignore errors.
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // Future: send to error reporting service (Sentry, etc.)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#fef2f2' }}
            >
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-gray-900 mb-2" style={{ fontSize: 18, fontWeight: 600 }}>
              Что-то пошло не так
            </h2>
            <p className="text-gray-500 mb-6" style={{ fontSize: 14 }}>
              {this.state.error?.message || 'Произошла непредвиденная ошибка'}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white"
              style={{ background: '#2563eb', fontSize: 14, fontWeight: 600 }}
            >
              <RefreshCw className="w-4 h-4" />
              Попробовать снова
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

