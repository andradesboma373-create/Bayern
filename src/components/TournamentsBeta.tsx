import React from 'react';
import { Trophy, Sparkles } from 'lucide-react';

export default function TournamentsBeta({ user }: { user: any }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="bg-yellow-500/10 p-6 rounded-full mb-6">
        <Trophy className="w-16 h-16 text-yellow-500 animate-pulse" />
      </div>
      <h1 className="text-4xl font-bold text-white mb-4 flex items-center gap-3">
        Турниры (Бета) <Sparkles className="text-yellow-400 w-6 h-6" />
      </h1>
      <p className="text-zinc-400 text-xl max-w-md">
        Этот раздел находится в разработке. Совсем скоро здесь появится полноценная система турниров!
      </p>
      <div className="mt-10 p-4 border border-zinc-800 rounded-lg bg-zinc-900/50">
        <p className="text-sm text-zinc-500 italic">Coming Soon...</p>
      </div>
    </div>
  );
}
