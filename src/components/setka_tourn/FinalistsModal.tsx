import React, { useMemo, useRef, useState } from 'react';
import { X, Trophy, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import TeamLogo from '../TeamLogo';
import PlayerAvatar from '../PlayerAvatar';

interface Props {
  user: any;
  tournamentId: string;
  onClose: () => void;
}

export default function FinalistsModal({ user, tournamentId, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!modalRef.current) return;
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 150));
      const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let dataUrl: string;
      try {
        dataUrl = await toPng(modalRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#1a1b26',
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          cacheBust: true
        });
      } catch (e) {
        dataUrl = await toPng(modalRef.current, {
          quality: 0.9,
          pixelRatio: 1.5,
          backgroundColor: '#1a1b26',
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder
        });
      }
      const link = document.createElement('a');
      link.download = `champions-${winnerInfo?.teamName || 'tournament'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export finalists image:', err);
    } finally {
      setIsExporting(false);
    }
  };
  const winnerInfo = useMemo(() => {
    const uid = user?.uid || 'guest';
    const localTourneys = JSON.parse(localStorage.getItem(`tournaments_${uid}`) || '[]');
    const tourney = localTourneys.find((t: any) => t.id === tournamentId);
    
    if (!tourney) return null;

    let winnerName = tourney.winnerName || '';
    if (!winnerName) {
      if (tourney.settings?.eliminationType === 'double') {
        if (tourney.grandFinal && tourney.grandFinal.length > 0) {
          const gf = tourney.grandFinal;
          if (gf[1] && gf[1].team1 && gf[1].winnerId) {
            const winningTeam = gf[1].winnerId === gf[1].team1?.id ? gf[1].team1 : gf[1].team2;
            winnerName = winningTeam?.name || '';
          } else if (gf[0]?.winnerId) {
            const winningTeam = gf[0].winnerId === gf[0].team1?.id ? gf[0].team1 : gf[0].team2;
            winnerName = winningTeam?.name || '';
          }
        }
      } else if (tourney.bracketRounds && tourney.bracketRounds.length > 0) {
        const lastRound = tourney.bracketRounds[tourney.bracketRounds.length - 1];
        if (lastRound && lastRound.length > 0 && lastRound[0]?.winnerId) {
          const winningTeam = lastRound[0].winnerId === lastRound[0].team1?.id ? lastRound[0].team1 : lastRound[0].team2;
          winnerName = winningTeam?.name || '';
        }
      }
    }

    if (!winnerName) return null;

    const localTeams = JSON.parse(localStorage.getItem(`teams_${uid}`) || '[]');
    const localPlayers = JSON.parse(localStorage.getItem(`players_${uid}`) || '[]');

    let team = localTeams.find((t: any) => t.name && t.name.toLowerCase().trim() === winnerName.toLowerCase().trim());
    if (!team && tourney.teams) {
      team = tourney.teams.find((t: any) => t.name && t.name.toLowerCase().trim() === winnerName.toLowerCase().trim());
    }

    let players: any[] = [];
    if (team?.id) {
      players = localPlayers.filter((p: any) => p.teamId === team.id);
    }
    if (players.length === 0 && team?.players && team.players.length > 0) {
      players = team.players;
    }

    return { teamName: winnerName, players };
  }, [user?.uid, tournamentId]);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-gradient-to-b from-[#1a1b26] to-black border border-[#e8c07d]/30 rounded-2xl w-full max-w-4xl flex flex-col shadow-[0_0_50px_rgba(232,192,125,0.1)] relative overflow-hidden">
        
        {/* Confetti or glowing background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-[#e8c07d]/20 blur-[120px] pointer-events-none"></div>
        
        <div className="absolute right-6 top-6 flex items-center gap-3 z-20">
          {winnerInfo && (
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="bg-[#e8c07d]/20 hover:bg-[#e8c07d]/30 border border-[#e8c07d]/50 text-[#e8c07d] font-black uppercase tracking-widest px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Экспорт...' : 'Скачать PNG'}
            </button>
          )}
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!winnerInfo ? (
            <div className="p-20 text-center relative z-10">
                <Trophy className="w-20 h-20 text-white/10 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-white/30 uppercase tracking-widest">Турнир еще не завершен</h2>
                <p className="text-white/20 mt-4">Победитель будет определен в финале</p>
            </div>
        ) : (
            <div className="p-12 relative z-10 flex flex-col items-center">
                <div className="mb-10 text-center animate-fade-in-up">
                    <div className="inline-block p-6 rounded-full bg-gradient-to-b from-[#e8c07d]/20 to-transparent border border-[#e8c07d]/30 mb-6">
                        <Trophy className="w-20 h-20 text-[#e8c07d]" />
                    </div>
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#e8c07d] to-[#f3dca1] uppercase tracking-[0.2em] drop-shadow-lg">
                        Чемпионы
                    </h2>
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <TeamLogo teamName={winnerInfo.teamName} sizeClassName="w-12 h-12" />
                        <h3 className="text-3xl font-black text-white uppercase tracking-widest">
                            {winnerInfo.teamName}
                        </h3>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-6 mt-4 w-full animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    {winnerInfo.players?.map((p: any) => (
                        <div key={p.id} className="w-48 bg-black/40 border border-[#e8c07d]/20 rounded-xl p-6 flex flex-col items-center text-center relative group overflow-hidden hover:border-[#e8c07d]/60 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#e8c07d]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="w-20 h-20 rounded-full border-2 border-[#e8c07d]/40 p-1 bg-[#1a1b26] flex items-center justify-center mb-4 relative z-10 shadow-[0_0_15px_rgba(232,192,125,0.2)]">
                                <PlayerAvatar 
                                    playerName={p.nickname || p.name} 
                                    avatarUrl={p.photo || p.avatarUrl || p.avatar || p.image} 
                                    sizeClassName="w-full h-full" 
                                />
                            </div>
                            
                            <div className="relative z-10">
                                <div className="text-lg font-black text-white truncate w-full px-2">
                                    {p.nickname}
                                </div>
                                <div className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">
                                    {p.role === 'captain' ? 'Капитан' : p.role === 'sniper' ? 'Снайпер' : 'Игрок'}
                                </div>
                            </div>
                        </div>
                    ))}
                    {winnerInfo.players.length === 0 && (
                        <div className="text-white/40 font-bold uppercase">Игроки не найдены</div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
