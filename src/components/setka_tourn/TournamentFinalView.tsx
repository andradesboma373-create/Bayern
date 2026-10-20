import React from 'react';
import { BG_THEMES } from './TournamentManager';
import TeamLogo from '../TeamLogo';

interface FinalMatchViewProps {
  team1: any;
  team2: any;
  themeId: string;
  onClose: () => void;
}

export const FinalMatchView: React.FC<FinalMatchViewProps> = ({ team1, team2, themeId, onClose }) => {
  const theme = BG_THEMES[themeId as keyof typeof BG_THEMES] || BG_THEMES.cyber_grid;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${theme.className}`} style={theme.style}>
      <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 text-2xl">
        ✕
      </button>
      
      <div className="text-white/30 text-8xl font-black tracking-widest uppercase mb-16">
        {theme.watermark}
      </div>

      <div className="flex items-center gap-24">
        <div className="flex flex-col items-center gap-6">
          <div className="w-48 h-48 bg-white/5 rounded-full flex items-center justify-center p-4">
            <TeamLogo teamName={team1.name} sizeClassName="w-40 h-40" />
          </div>
          <h2 className="text-4xl font-black text-white">{team1.name}</h2>
        </div>

        <div className="text-white/20 text-6xl font-black italic">VS</div>

        <div className="flex flex-col items-center gap-6">
          <div className="w-48 h-48 bg-white/5 rounded-full flex items-center justify-center p-4">
            <TeamLogo teamName={team2.name} sizeClassName="w-40 h-40" />
          </div>
          <h2 className="text-4xl font-black text-white">{team2.name}</h2>
        </div>
      </div>
    </div>
  );
};

export { FinalMatchView as TournamentFinalView };
