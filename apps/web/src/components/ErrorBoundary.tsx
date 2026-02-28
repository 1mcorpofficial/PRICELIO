import { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from './ui/Card';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="page-shell" style={{ placeItems: 'center', minHeight: '50vh' }}>
          <Card style={{ textAlign: 'center', borderColor: 'var(--accent-red)' }}>
            <h2 style={{ color: 'var(--accent-red)' }}>Something went wrong</h2>
            <p className="muted" style={{ marginBottom: '1rem' }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              className="ui-btn ui-btn--outline"
              onClick={() => window.location.reload()}
            >
              Reload application
            </button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
