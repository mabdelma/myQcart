import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  componentDidMount() {
    this.handleRejection = this.handleRejection.bind(this);
    window.addEventListener('unhandledrejection', this.handleRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleRejection);
  }

  private handleRejection(event: PromiseRejectionEvent) {
    Sentry.captureException(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
      extra: { type: 'unhandledrejection' },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div role="alert" className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="mb-3 text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="mb-6 text-gray-600">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-amber-700 px-6 py-2 text-white hover:bg-amber-800"
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
