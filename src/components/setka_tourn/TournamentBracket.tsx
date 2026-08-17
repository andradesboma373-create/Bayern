import React, { ReactNode } from 'react';
import TournamentManager from './TournamentManager';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class TournamentErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Tournament Manager Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-white p-8 max-w-2xl mx-auto my-12 bg-[#12121a] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <h2 className="text-2xl font-black text-red-500 mb-4">Произошла ошибка при отображении турнира</h2>
          <p className="text-white/70 text-sm mb-6 bg-black/40 p-4 rounded-xl font-mono text-left overflow-x-auto whitespace-pre-wrap">
            {this.state.error?.toString() || 'Неизвестная ошибка'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="bg-[#ff8f00] hover:bg-[#ffa733] text-black font-black px-6 py-3 rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
          >
            Сбросить и перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function TournamentBracket({ user }: { user: any }) {
  return (
    <div className="text-white p-8 max-w-[1600px] mx-auto min-h-screen">
      <TournamentErrorBoundary>
        <TournamentManager user={user} />
      </TournamentErrorBoundary>
    </div>
  );
}
