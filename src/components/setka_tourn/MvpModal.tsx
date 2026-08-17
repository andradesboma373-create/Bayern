import React, { useMemo, useState, useRef } from 'react';
import { X, Award, Medal, Trophy, Download, Sparkles, Check, ChevronDown } from 'lucide-react';
import { toPng } from 'html-to-image';
import TeamLogo from '../TeamLogo';
import PlayerAvatar from '../PlayerAvatar';
import { loadTournaments, saveTournament } from './storage';

interface Props {
  user: any;
  tournamentId: string;
  onClose: () => void;
}

export default function MvpModal({ user, tournamentId, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const uid = user?.uid || 'guest';

  // Load tourney & stats
  const { tourney, allPlayersStats, savedAwards } = useMemo(() => {
    const localTourneys = loadTournaments(uid);
    const localMatches = JSON.parse(localStorage.getItem(`matches_${uid}`) || '[]');
    const tourney = localTourneys.find((t: any) => t.id === tournamentId);
    const tourneyName = tourney?.name || '';

    // Filter matches
    const tourMatches = localMatches.filter((m: any) => {
      if (!m) return false;
      if (m.tournamentId && m.tournamentId === tournamentId) return true;
      if (tourneyName && m.tournamentName && m.tournamentName.toLowerCase().trim() === tourneyName.toLowerCase().trim()) return true;
      return false;
    });

    const playerStatsMap = new Map<string, any>();

    tourMatches.forEach((m: any) => {
      const matchMvpName = m.mvp?.nickname;
      const matchId = m.id || `${m.date}_${m.team1Name}_${m.team2Name}`;

      const processStats = (psArray: any[], fallbackTeamName: string) => {
        if (!psArray || !Array.isArray(psArray)) return;
        psArray.forEach((ps: any) => {
          const name = ps.nickname || ps.name || 'Unknown';
          const id = ps.id || `${name}_${fallbackTeamName}`;
          
          if (!playerStatsMap.has(id)) {
            playerStatsMap.set(id, {
              id,
              nickname: name,
              teamName: ps.teamName || fallbackTeamName,
              kills: 0,
              assists: 0,
              deaths: 0,
              damage: 0,
              rounds: 0,
              mvps: 0,
              matchIds: new Set<string>()
            });
          }
          const curr = playerStatsMap.get(id);
          curr.kills += (ps.kills || ps.k || 0);
          curr.assists += (ps.assists || ps.a || 0);
          curr.deaths += (ps.deaths || ps.d || 0);
          curr.damage += (ps.damage || 0);
          curr.rounds += (ps.totalRounds || 0);
          curr.matchIds.add(matchId);
          if (matchMvpName && name.toLowerCase().trim() === matchMvpName.toLowerCase().trim()) {
            curr.mvps += 1;
          }
        });
      };

      processStats(m.team1Stats, m.team1Name || 'Команда 1');
      processStats(m.team2Stats, m.team2Name || 'Команда 2');
    });

    const statsArr = Array.from(playerStatsMap.values()).map(p => {
      const kd = p.deaths > 0 ? (p.kills / p.deaths) : p.kills;
      const diff = p.kills - p.deaths;
      const adr = p.rounds > 0 ? (p.damage / p.rounds) : 0;
      const impact = 0.8 + (kd * 0.3) + (adr * 0.003) + (p.assists / (p.rounds || 1)) * 0.1;
      const rating = 0.5 + (kd * 0.35) + (adr * 0.004) + (impact * 0.15);

      return {
        ...p,
        matchesCount: p.matchIds.size,
        kd,
        diff,
        adr,
        impact,
        rating
      };
    });

    statsArr.sort((a, b) => b.rating - a.rating || b.kd - a.kd);

    return {
      tourney,
      allPlayersStats: statsArr,
      savedAwards: tourney?.awards || null
    };
  }, [uid, tournamentId]);

  // Selected MVP & EVPs state
  const [selectedMvpId, setSelectedMvpId] = useState<string>(() => {
    if (savedAwards?.mvpId) return savedAwards.mvpId;
    return allPlayersStats[0]?.id || '';
  });

  const [selectedEvpIds, setSelectedEvpIds] = useState<string[]>(() => {
    if (savedAwards?.evpIds && Array.isArray(savedAwards.evpIds)) return savedAwards.evpIds;
    return allPlayersStats.slice(1, 5).map(p => p.id);
  });

  // Save awards
  const handleSaveAwardSelection = (mvpId: string, evpIds: string[]) => {
    setSelectedMvpId(mvpId);
    setSelectedEvpIds(evpIds);

    const localTourneys = loadTournaments(uid);
    const target = localTourneys.find((t: any) => t.id === tournamentId);
    if (target) {
      const updated = {
        ...target,
        awards: {
          mvpId,
          evpIds
        }
      };
      saveTournament(uid, updated);
    }
  };

  const handleAutoSelect = () => {
    if (allPlayersStats.length === 0) return;
    const autoMvp = allPlayersStats[0].id;
    const autoEvps = allPlayersStats.slice(1, 5).map(p => p.id);
    handleSaveAwardSelection(autoMvp, autoEvps);
  };

  const mvpPlayer = useMemo(() => {
    return allPlayersStats.find(p => p.id === selectedMvpId) || allPlayersStats[0] || null;
  }, [allPlayersStats, selectedMvpId]);

  const evpPlayers = useMemo(() => {
    return selectedEvpIds.map(id => allPlayersStats.find(p => p.id === id)).filter(Boolean);
  }, [allPlayersStats, selectedEvpIds]);

  const handleExportPng = async () => {
    if (!modalRef.current) return;
    setIsExporting(true);
    setIsEditMode(false);
    try {
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 250)));
      const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let dataUrl: string;
      try {
        dataUrl = await toPng(modalRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#0d0e15',
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          cacheBust: true
        });
      } catch (e) {
        dataUrl = await toPng(modalRef.current, {
          quality: 0.9,
          pixelRatio: 1.5,
          backgroundColor: '#0d0e15',
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder
        });
      }
      const link = document.createElement('a');
      link.download = `awards-${tourney?.name || 'tournament'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export Awards image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      <div 
        ref={modalRef}
        className="bg-[#0d0e15] border border-[#ff8f00]/30 rounded-2xl w-full max-w-5xl flex flex-col shadow-[0_0_60px_rgba(255,143,0,0.15)] relative overflow-hidden my-auto p-6 sm:p-8"
      >
        {/* Glow ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-[#ff8f00]/10 blur-[140px] pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center pb-6 border-b border-white/10 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[#ff8f00] text-xs font-black uppercase tracking-widest">
              <Award className="w-4 h-4" /> HLTV Awards & Medals
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mt-1">
              MVP & EVP Награды Турнира
            </h2>
            <p className="text-white/40 text-xs sm:text-sm mt-0.5">
              {tourney?.name || 'Турнирный этап'}
            </p>
          </div>

          {!isExporting && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  isEditMode 
                    ? 'bg-[#ff8f00] text-black border-[#ff8f00]' 
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
                }`}
              >
                {isEditMode ? '✓ Готово' : '⚙️ Настроить'}
              </button>
              <button
                onClick={handleAutoSelect}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                title="Автоматически выбрать лидеров по статистике"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ff8f00]" />
                <span className="hidden sm:inline">Авто-выбор</span>
              </button>
              <button
                onClick={handleExportPng}
                disabled={isExporting}
                className="bg-[#ff8f00]/20 hover:bg-[#ff8f00]/30 border border-[#ff8f00]/50 text-[#ff8f00] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'Экспорт...' : 'Скачать PNG'}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white/50 hover:text-white bg-white/5 rounded-full transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Custom Edit Panel (Shown only when isEditMode is active) */}
        {!isExporting && isEditMode && (
          <div className="mt-4 p-4 bg-[#141622] border border-[#ff8f00]/40 rounded-xl flex flex-col gap-4 relative z-20 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#ff8f00]">
                Ручной выбор обладателей наград:
              </span>
              <button
                onClick={handleAutoSelect}
                className="text-[11px] text-white/60 hover:text-white underline font-semibold"
              >
                Сбросить на авто-выбор по рейтингу
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* MVP Select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#ff8f00] uppercase">MVP (Главный игрок)</label>
                <select
                  value={selectedMvpId}
                  onChange={(e) => handleSaveAwardSelection(e.target.value, selectedEvpIds)}
                  className="bg-black text-[#ff8f00] border border-[#ff8f00]/50 rounded-lg text-xs font-bold p-2 outline-none cursor-pointer"
                >
                  {allPlayersStats.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nickname} ({p.teamName}) — R: {p.rating.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* EVPs Selects */}
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-blue-400 uppercase">EVP #{idx + 1}</label>
                  <select
                    value={selectedEvpIds[idx] || ''}
                    onChange={(e) => {
                      const newEvps = [...selectedEvpIds];
                      newEvps[idx] = e.target.value;
                      handleSaveAwardSelection(selectedMvpId, newEvps);
                    }}
                    className="bg-black text-white/90 border border-white/20 rounded-lg text-xs font-semibold p-2 outline-none cursor-pointer"
                  >
                    <option value="">-- Выбрать --</option>
                    {allPlayersStats.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nickname} ({p.teamName})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {allPlayersStats.length === 0 ? (
          <div className="p-16 text-center text-white/30 font-bold uppercase tracking-widest">
            Нет сыгранных матчей для определения MVP
          </div>
        ) : (
          <div className="py-8 flex flex-col gap-8 relative z-10">
            {/* MVP HERO CARD SECTION */}
            <div className="flex flex-col items-center">
              <div className="text-center mb-4">
                <span className="bg-gradient-to-r from-[#ff8f00] to-[#ffd000] text-black font-black text-xs uppercase px-4 py-1.5 rounded-full tracking-[0.2em] shadow-[0_0_15px_rgba(255,143,0,0.5)] inline-flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 fill-black" /> Most Valuable Player (MVP)
                </span>
              </div>

              {mvpPlayer && (
                <div className="w-full max-w-md bg-gradient-to-b from-[#1c1a24] to-[#121118] border-2 border-[#ff8f00] rounded-2xl p-6 sm:p-8 flex flex-col items-center relative shadow-[0_0_40px_rgba(255,143,0,0.2)] group">

                  {/* MVP Badge ribbon */}
                  <div className="w-24 h-24 rounded-full border-4 border-[#ff8f00] p-1.5 bg-[#0d0e15] relative shadow-[0_0_25px_rgba(255,143,0,0.4)] mb-4">
                    <PlayerAvatar
                      playerName={mvpPlayer.nickname}
                      sizeClassName="w-full h-full"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-[#ff8f00] text-black p-1.5 rounded-full shadow-lg">
                      <Medal className="w-5 h-5 fill-black" />
                    </div>
                  </div>

                  {/* Nickname & Team */}
                  <h3 className="text-3xl font-black text-white uppercase tracking-wider text-center">
                    {mvpPlayer.nickname}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <TeamLogo teamName={mvpPlayer.teamName} sizeClassName="w-5 h-5" />
                    <span className="text-white/60 font-bold text-sm tracking-wide">
                      {mvpPlayer.teamName}
                    </span>
                  </div>

                  {/* HLTV MVP Ribbon */}
                  <div className="mt-4 px-6 py-1.5 bg-[#ff8f00]/10 border border-[#ff8f00]/40 rounded-full text-[#ff8f00] font-black text-xs uppercase tracking-[0.25em]">
                    HLTV MVP MEDAL
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 w-full mt-6 bg-black/50 border border-white/5 rounded-xl p-3 text-center">
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase">Rating</div>
                      <div className="text-lg font-black text-[#ff8f00]">{mvpPlayer.rating.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase">K/D</div>
                      <div className="text-lg font-black text-white">{mvpPlayer.kd.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase">ADR</div>
                      <div className="text-lg font-black text-white">{Math.round(mvpPlayer.adr)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/40 uppercase">Impact</div>
                      <div className="text-lg font-black text-white">{mvpPlayer.impact.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* EVP CARDS SECTION */}
            <div>
              <div className="text-center mb-4">
                <span className="bg-white/10 text-white/80 font-black text-xs uppercase px-4 py-1.5 rounded-full tracking-[0.2em] border border-white/10 inline-flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-400" /> Exceptionally Valuable Players (EVP)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((evpIdx) => {
                  const evpPlayer = evpPlayers[evpIdx];

                  return (
                    <div
                      key={evpIdx}
                      className="bg-[#151622] border border-white/10 hover:border-blue-500/50 rounded-xl p-4 flex flex-col items-center relative transition-colors"
                    >
                      {evpPlayer ? (
                        <>
                          <div className="w-16 h-16 rounded-full border-2 border-blue-400/50 p-1 bg-[#0d0e15] mb-2 relative">
                            <PlayerAvatar
                              playerName={evpPlayer.nickname}
                              sizeClassName="w-full h-full"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full text-[9px] font-black">
                              EVP
                            </div>
                          </div>

                          <div className="text-base font-black text-white truncate max-w-full text-center">
                            {evpPlayer.nickname}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-white/50 font-semibold mb-3">
                            <TeamLogo teamName={evpPlayer.teamName} sizeClassName="w-3.5 h-3.5" />
                            {evpPlayer.teamName}
                          </div>

                          <div className="grid grid-cols-3 gap-1 w-full text-center bg-black/40 rounded-lg p-2 border border-white/5 text-[10px]">
                            <div>
                              <div className="text-white/40">Rating</div>
                              <div className="font-bold text-blue-400">{evpPlayer.rating.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-white/40">K/D</div>
                              <div className="font-bold text-white">{evpPlayer.kd.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-white/40">ADR</div>
                              <div className="font-bold text-white">{Math.round(evpPlayer.adr)}</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="py-8 text-center text-white/20 text-xs font-bold uppercase">
                          Слот EVP #{evpIdx + 1}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
