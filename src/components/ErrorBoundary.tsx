import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Component Tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08080c] text-white flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-[#12121a] border border-red-500/20 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-wide text-white uppercase">
                Произошла ошибка
              </h1>
              <p className="text-sm text-white/60">
                Приложение столкнулось с непредвиденной ошибкой. Вы можете обновить страницу или сбросить локальный кэш.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-left font-mono text-xs text-red-300 max-h-40 overflow-y-auto break-words">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Обновить страницу
              </button>

              <button
                onClick={this.handleClearStorageAndReload}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Сбросить кэш и перезагрузить
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
