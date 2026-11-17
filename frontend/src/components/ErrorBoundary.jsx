import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-white border border-[#E4E3DC] rounded-2xl p-8 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-bold text-[#171916] tracking-tight">Something went wrong</h2>
            <p className="text-sm text-[#6C7165] mt-2 leading-relaxed">
              Zentriq caught an unexpected view rendering issue. You can reload the page or reset the local session.
            </p>
            {this.state.error && (
              <div className="mt-4 p-3 bg-red-50/60 border border-red-200/60 rounded-lg text-left text-xs font-mono text-red-700 overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#174B3A] hover:bg-[#133F31] text-white text-sm font-semibold transition active:scale-98 shadow-sm"
              >
                <RefreshCw size={15} />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleResetState}
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-[#E4E3DC] bg-white hover:bg-[#F2F1EC] text-[#242923] text-sm font-medium transition active:scale-98"
              >
                <span>Reset Session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
