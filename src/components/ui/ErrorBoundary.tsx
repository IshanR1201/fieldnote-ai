import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorBanner } from './ErrorBanner';

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message || 'The interface hit an unexpected error.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Fieldnote UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.message) {
      return (
        <div className="p-4">
          <ErrorBanner
            title="Display error"
            message={this.state.message}
            onRetry={() => this.setState({ message: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
