import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 mb-4 shadow-xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-display mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            PulseChat encountered an unexpected error. Click below to reload.
          </p>

          {this.state.error && (
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 text-left overflow-auto max-h-40">
              <p className="text-xs font-mono text-rose-400 font-semibold">{this.state.error.toString()}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all"
            >
              Clear Cache & Reload
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload PulseChat</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
