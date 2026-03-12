import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 p-8 bg-gray-50 dark:bg-slate-950 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Đã xảy ra lỗi</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              {this.state.error?.message || 'Lỗi không xác định. Vui lòng thử lại.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
