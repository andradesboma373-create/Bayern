import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from '../firebase';
import TeamLogo from './TeamLogo';
import PlayerAvatar from './PlayerAvatar';
import TeamProfileModal from './TeamProfileModal';
import { Trophy, Shield, Users, ChevronLeft, ChevronRight, Award, Sparkles, Star } from 'lucide-react';

interface Player {
  id: string;
  nickname: string;
  role: string;
  rating: number;
  valRating: number;
}

interface Team {
  id: string;
  name: string;
  players: Player[];
  totalValRating?: number;
  channelId: string;
  logoUrl?: string;
  game?: string;
}

export default function Statistics({ user }: { user: any }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTeamProfile, setSelectedTeamProfile] = useState<any | null>(null);
  const itemsPerPage = 5;

  const fetchTeamsData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      if (user.isLocalDemo) {
        throw new Error("Local demo mode");
      }

      const q = query(collection(db, 'teams'), where('channelId', '==', user.uid));
      const qs = await getDocs(q);
      const fetchedTeams = qs.docs.map(d => {
        const data = d.data();
        const players = (data.players || []) as Player[];
        const calculatedVal = players.slice(0, 5).reduce((acc, p) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0);
        
        return {
          id: d.id,
          name: data.name || 'Unknown Team',
          players: players,
          totalValRating: calculatedVal,
          channelId: data.channelId
        } as Team;
      });

      // Sort by total VAC Pts descending
      fetchedTeams.sort((a, b) => (b.totalValRating || 0) - (a.totalValRating || 0));
      setTeams(fetchedTeams);
    } catch (e) {
      console.warn("Using localStorage fallback for teams in stats", e);
      try {
        const localTeamsRaw = JSON.parse(localStorage.getItem(`teams_${user.uid}`) || '[]');
        const fetchedTeams = localTeamsRaw.map((t: any) => {
          if (t.isAcademy) return null;
          const players = (t.players || []) as Player[];
          const calculatedVal = players.slice(0, 5).reduce((acc, p) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0);
          return {
            id: t.id,
            name: t.name || 'Unknown Team',
            players: players,
            totalValRating: calculatedVal,
            channelId: t.channelId
          } as Team;
        }).filter(Boolean) as Team[];
        fetchedTeams.sort((a, b) => (b.totalValRating || 0) - (a.totalValRating || 0));
        setTeams(fetchedTeams);
      } catch (err) {
        console.error("Error computing local teams stats:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeamsData();
    window.addEventListener("db-user-updated", fetchTeamsData);
    return () => window.removeEventListener("db-user-updated", fetchTeamsData);
  }, [fetchTeamsData]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4 py-20">
        <Shield className="w-16 h-16 text-blue-500 animate-pulse" />
        <h2 className="text-xl font-bold">Войдите, чтобы просматривать рейтинг команд.</h2>
      </div>
    );
  }

  // Pagination math
  const totalPages = Math.max(1, Math.ceil(teams.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTeams = teams.slice(indexOfFirstItem, indexOfLastItem);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Find maximum VAC Pts in the list to calculate relative percentage for bars
  const maxValRating = teams.length > 0 ? Math.max(...teams.map(t => t.totalValRating || 1)) : 1;

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-white">
      {/* Banner / Header */}
      <div className="bg-[#12121a] rounded-2xl p-8 border border-white/5 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#ff8f00]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <Trophy className="text-[#ff8f00] w-8 h-8 drop-shadow-[0_0_10px_rgba(255,143,0,0.3)] animate-bounce" />
              Таблица VAC Pts
            </h1>
            <p className="text-white/40 text-sm mt-2 font-semibold">
              Официальный рейтинг команд на основе суммарной силы состава (VAC Pts всех 5 игроков)
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 px-5 py-3.5 rounded-xl flex items-center gap-3">
            <Award className="text-blue-400 w-5 h-5" />
            <div>
              <div className="text-[10px] text-white/30 uppercase font-black">Всего команд</div>
              <div className="text-lg font-black font-mono text-white">{teams.length}</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-white/50 p-12 text-center font-bold flex flex-col items-center gap-3 bg-[#12121a] rounded-2xl border border-white/5">
          <div className="w-10 h-10 border-4 border-[#ff8f00] border-t-transparent rounded-full animate-spin" />
          <span>Вычисление показателей рейтинга...</span>
        </div>
      ) : teams.length === 0 ? (
        <div className="p-12 text-center bg-[#12121a] border border-white/5 rounded-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/30 text-2xl font-black">
            ?
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wider text-white/80">Команды не созданы</h3>
            <p className="text-white/40 text-xs font-semibold max-w-sm mx-auto mt-1 leading-relaxed">
              Перейдите в раздел "Команды", чтобы добавить клубы и игроков. После этого они появятся в глобальном топе!
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* List of Teams for the current page */}
          <div className="flex flex-col gap-3">
            {/* Table Header (Desktop) */}
            <div className="hidden md:flex items-center px-4 py-2 bg-black/40 border border-white/5 rounded-t-xl text-[10px] uppercase font-bold tracking-widest text-white/30">
              <div className="w-1/3 flex items-center gap-4">
                <div className="w-8 text-center">#</div>
                <div>Команда</div>
              </div>
              <div className="w-1/3 text-center">Состав</div>
              <div className="w-1/3 text-right">Очки</div>
            </div>

            <div className="flex flex-col border border-white/5 rounded-b-xl border-t-0 bg-[#0f0f18]">
              {currentTeams.map((t, idx) => {
                const globalIdx = indexOfFirstItem + idx;
                const valRating = t.totalValRating || 0;
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => setSelectedTeamProfile(t)}
                    className="group flex flex-col md:flex-row items-center p-3 md:px-4 md:py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.05] transition-colors cursor-pointer"
                    title={`Открыть HLTV профиль команды ${t.name}`}
                  >
                    {/* Rank & Team */}
                    <div className="flex items-center gap-4 w-full md:w-1/3">
                      <div className="text-base md:text-lg font-black font-mono w-8 text-center text-white/40 group-hover:text-white transition-colors">
                        {globalIdx + 1}
                      </div>
                      <TeamLogo game={t.game as any} teamName={t.name} logoUrl={t.logoUrl} sizeClassName="w-10 h-10 md:w-12 md:h-12" />
                      <h2 className="text-sm md:text-base font-black uppercase tracking-wide truncate text-white/80 group-hover:text-white transition-colors">
                        {t.name}
                      </h2>
                    </div>

                    {/* Roster */}
                    <div className="flex items-center justify-center gap-1.5 w-full md:w-1/3 py-3 md:py-0">
                      {t.players?.map((p: any, pIdx: number) => {
                        const isEmpty = !p || !p.id;
                        if (isEmpty) return null;
                        return (
                          <div key={pIdx} className="relative group/player cursor-help hover:z-20">
                            <PlayerAvatar 
                              playerName={p.nickname} 
                              avatarUrl={p.avatarUrl}
                              game={t.game as any} 
                              sizeClassName="w-8 h-8 md:w-10 md:h-10" 
                              className="border border-white/10 hover:border-white/30 transition-colors"
                            />
                            {/* tooltip */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover/player:opacity-100 pointer-events-none transition-opacity z-10 flex flex-col items-center shadow-xl">
                                <span>{p.nickname}</span>
                                <span className="text-[#ff8f00] font-mono text-[9px]">{p.valRating || 0} pts</span>
                            </div>
                          </div>
                        );
                      })}
                      {t.players.filter((p: any) => p && p.id).length === 0 && (
                        <span className="text-xs text-white/20 italic">Нет состава</span>
                      )}
                    </div>

                    {/* Points */}
                    <div className="flex justify-between md:justify-end items-center w-full md:w-1/3 text-right">
                      <span className="md:hidden text-[10px] font-bold text-white/30 uppercase tracking-widest">Очки</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-sm md:text-lg font-black text-white/70 group-hover:text-[#ff8f00] transition-colors">{valRating.toLocaleString()}</span>
                        <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination Controls / Листы */}
          <div className="flex items-center justify-between bg-[#12121a] border border-white/5 rounded-2xl p-4 mt-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 disabled:bg-transparent disabled:opacity-20 text-white/80 disabled:text-white/20 border border-white/5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Предыдущий лист
            </button>
            
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/40">
              <span>Лист</span>
              <span className="text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono text-sm">{currentPage}</span>
              <span>из</span>
              <span className="text-white/60 font-mono">{totalPages}</span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 disabled:bg-transparent disabled:opacity-20 text-white/80 disabled:text-white/20 border border-white/5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Следующий лист
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TEAM PROFILE MODAL */}
      {selectedTeamProfile && (
        <TeamProfileModal
          team={selectedTeamProfile}
          user={user}
          allTeams={teams}
          onClose={() => {
            setSelectedTeamProfile(null);
            fetchTeamsData();
          }}
          onUpdateTeam={(updatedTeam) => {
            setTeams(prev => {
              const updated = prev.map(t => (t.id === updatedTeam.id || t.name === updatedTeam.name) ? {
                ...t,
                ...updatedTeam,
                totalValRating: (updatedTeam.players || []).slice(0, 5).reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0)
              } : t);
              updated.sort((a, b) => (b.totalValRating || 0) - (a.totalValRating || 0));
              return updated;
            });
            setSelectedTeamProfile(updatedTeam);
          }}
        />
      )}
    </div>
  );
}
