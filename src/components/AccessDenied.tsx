import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface AccessDeniedProps {
  roomName?: string;
  sectionName: string;
}

export default function AccessDenied({ roomName, sectionName }: AccessDeniedProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-[#12121a] border border-amber-500/30 rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center space-y-6 relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.1)] animate-fade-in">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-red-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" /> Только для администратора
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            Доступ ограничен
          </h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Раздел <span className="text-white font-bold">«{sectionName}»</span> доступен только в комнате администратора главной базы (<span className="text-amber-400 font-mono font-bold">bamep</span>).
          </p>
        </div>

        {roomName && (
          <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white/50">
            Ваша текущая комната: <span className="text-white font-mono font-bold">{roomName}</span>
          </div>
        )}

        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться в симулятор
          </Link>
        </div>
      </div>
    </div>
  );
}
