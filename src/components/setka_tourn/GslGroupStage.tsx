import React, { useState } from 'react';
import { Tournament, Match, GslGroup, Team } from './types';
import TeamLogo from '../TeamLogo';
import MatchCard from './MatchCard';
import { updateGslMatch, getGslGroupStandings, areAllGslGroupsFinished } from './gslLogic';
import { Trophy, ArrowRight, Shield, Award, Users, CheckCircle2 } from 'lucide-react';

interface Props {
  tournament: Tournament;
  onUpdate: (tournament: Tournament) => void;
  onAdvanceToBracket: () => void;
  onVetoMatch?: (t1: Team, t2: Team, matchInfo?: any) => void;
  isExporting?: boolean;
  isSwapMode?: boolean;
}

export default function GslGroupStage({ tournament, onUpdate, onAdvanceToBracket, onVetoMatch, isExporting, isSwapMode }: Props) {
  const gslGroups = tournament.gslGroups || [];
  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number>(0);
  const settings = tournament.settings;
  const isAllReady = areAllGslGroupsFinished(gslGroups);

  const handleSwapTeam = (
    groupIndex: number,
    bracketType: 'upper' | 'lower',
    rIdx: number,
    mIdx: number,
    teamNum: 1 | 2,
    teamId: string
  ) => {
    let team = tournament.teams.find(t => t.id === teamId) || null;
    if (teamId === 'BYE') team = { id: 'BYE', name: 'BYE' };

    const newGroups = gslGroups.map((g, gIdx) => {
      if (gIdx !== groupIndex) return g;
      const targetBracket = bracketType === 'upper' ? [...g.upperBracket] : [...g.lowerBracket];
      const targetRound = [...targetBracket[rIdx]];
      const targetMatch = { ...targetRound[mIdx] };

      if (teamNum === 1) targetMatch.team1 = team;
      else targetMatch.team2 = team;

      targetRound[mIdx] = targetMatch;
      targetBracket[rIdx] = targetRound;

      return {
        ...g,
        upperBracket: bracketType === 'upper' ? targetBracket : g.upperBracket,
        lowerBracket: bracketType === 'lower' ? targetBracket : g.lowerBracket
      };
    });

    onUpdate({ ...tournament, gslGroups: newGroups });
  };

  const handleUpdateScore = (
    groupIndex: number,
    bracketType: 'upper' | 'lower',
    rIdx: number,
    mIdx: number,
    teamNum: 1 | 2,
    score: number
  ) => {
    const newGroups = [...gslGroups];
    const targetGroup = newGroups[groupIndex];
    if (!targetGroup) return;

    const targetBracket = bracketType === 'upper' ? targetGroup.upperBracket : targetGroup.lowerBracket;
    const match = targetBracket[rIdx]?.[mIdx];
    if (match) {
      if (teamNum === 1) match.score1 = score;
      else match.score2 = score;
      onUpdate({ ...tournament, gslGroups: newGroups });
    }
  };

  const handleAdvanceWinner = (
    groupIndex: number,
    bracketType: 'upper' | 'lower',
    rIdx: number,
    mIdx: number
  ) => {
    const targetGroup = gslGroups[groupIndex];
    if (!targetGroup) return;

    const targetBracket = bracketType === 'upper' ? targetGroup.upperBracket : targetGroup.lowerBracket;
    const match = targetBracket[rIdx]?.[mIdx];
    if (!match) return;

    const updatedGroup = updateGslMatch(targetGroup, bracketType, rIdx, mIdx, match.score1, match.score2);
    const newGroups = [...gslGroups];
    newGroups[groupIndex] = updatedGroup;
    onUpdate({ ...tournament, gslGroups: newGroups });
  };

  const getUpperRoundLabel = (rIdx: number, total: number) => {
    const remaining = total - rIdx;
    if (remaining === 1) return 'Финал за 1-е и 2-е место';
    if (remaining === 2) return 'Полуфинал верхней сетки';
    return `Раунд ${rIdx + 1} (1/4)`;
  };

  const getLowerRoundLabel = (rIdx: number, total: number) => {
    const remaining = total - rIdx;
    if (remaining === 1) return 'Финал за 3-е и 4-е место';
    if (remaining === 2) return '1/4 нижней сетки';
    return `Раунд ${rIdx + 1} нижней сетки`;
  };

  const activeGroup = gslGroups[selectedGroupIdx] || gslGroups[0];
  const activeStandings = activeGroup ? getGslGroupStandings(activeGroup) : null;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header Info & Advance Button */}
      <div className="bg-[#12121a] p-6 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#ff8f00]/20 text-[#ff8f00] font-black text-xs px-3 py-1 rounded-lg uppercase tracking-wider">
              1-й Этап: Группы GSL / Double Elimination (ESL Pro League)
            </span>
            {isAllReady ? (
              <span className="bg-emerald-500/20 text-emerald-400 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Все группы завершены
              </span>
            ) : (
              <span className="bg-white/5 text-white/50 text-xs px-2.5 py-1 rounded-lg">
                Идут матчи группового этапа
              </span>
            )}
          </div>
          <p className="text-white/60 text-xs mt-2 max-w-2xl leading-relaxed">
            В каждой группе: победитель финала виннеров занимает <strong>1 место (прямой выход в 1/4)</strong>,
            проигравший финала виннеров занимает <strong>2 место (выход в R2 плей-офф)</strong> и не падает в лузера.
            В нижней сетке команды разыгрывают <strong>3 и 4 места (выход в R1 плей-офф)</strong>.
          </p>
        </div>

        {!isExporting && (
          <button
            onClick={onAdvanceToBracket}
            disabled={!isAllReady}
            className={`px-6 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              isAllReady
                ? 'bg-gradient-to-r from-[#ff8f00] to-amber-500 hover:from-[#ffa733] hover:to-amber-400 text-black shadow-[0_0_25px_rgba(255,143,0,0.4)] scale-105'
                : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
            }`}
          >
            <span>🏆 Перейти к Плей-офф</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Group Tabs */}
      {gslGroups.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {gslGroups.map((group, idx) => {
            const st = getGslGroupStandings(group);
            const isSelected = selectedGroupIdx === idx;
            return (
              <button
                key={group.id}
                onClick={() => setSelectedGroupIdx(idx)}
                className={`px-5 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#ff8f00] text-black border-[#ff8f00] shadow-[0_0_15px_rgba(255,143,0,0.3)]'
                    : 'bg-[#12121a] text-white/70 border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                <span>{group.name}</span>
                {st.isGroupFinished && (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-black' : 'bg-emerald-400'}`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Active Group Content */}
      {activeGroup && activeStandings && (
        <div className="flex flex-col gap-8 bg-[#0e0e16] p-6 rounded-2xl border border-white/5">
          {/* Group Header & Standings Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 flex flex-col justify-center">
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <Users className="w-6 h-6 text-[#ff8f00]" />
                {activeGroup.name}
              </h3>
              <p className="text-xs text-white/50 mt-1">
                Сетка группы: Верхняя сетка (Upper Bracket) и Нижняя сетка (Lower Bracket)
              </p>
            </div>

            {/* Live Seeds Box */}
            <div className="bg-black/50 p-4 rounded-xl border border-white/10 flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ff8f00]">
                Итоги группы (Путевки в Плей-офф):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <span className="text-[10px] text-emerald-400 font-bold block">1-е место (1/4)</span>
                  <span className="font-extrabold text-white truncate block">
                    {activeStandings.first?.name || 'TBD'}
                  </span>
                </div>
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <span className="text-[10px] text-blue-400 font-bold block">2-е место (R2)</span>
                  <span className="font-extrabold text-white truncate block">
                    {activeStandings.second?.name || 'TBD'}
                  </span>
                </div>
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <span className="text-[10px] text-amber-400 font-bold block">3-е место (R1)</span>
                  <span className="font-extrabold text-white truncate block">
                    {activeStandings.third?.name || 'TBD'}
                  </span>
                </div>
                <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <span className="text-[10px] text-purple-400 font-bold block">4-е место (R1)</span>
                  <span className="font-extrabold text-white truncate block">
                    {activeStandings.fourth?.name || 'TBD'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upper Bracket Section */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Верхняя сетка (Upper Bracket) — Победитель занимает 1-е место, Проигравший 2-е место
            </h4>
            <div className="flex gap-4 overflow-x-auto p-4 bg-black/30 rounded-xl border border-white/5 min-h-[220px]">
              {activeGroup.upperBracket.map((round, rIdx) => (
                <div key={`ub-${rIdx}`} className="flex flex-col w-[300px] shrink-0">
                  <div className="h-8 flex items-center justify-center font-black text-xs uppercase tracking-wider text-emerald-400/70 mb-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    {getUpperRoundLabel(rIdx, activeGroup.upperBracket.length)}
                  </div>
                  <div className="flex flex-col justify-around flex-1 gap-3">
                    {round.map((match, mIdx) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        bracketType="winners"
                        rIdx={rIdx}
                        mIdx={mIdx}
                        onUpdateScore={(type, r, m, teamNum, score) =>
                          handleUpdateScore(selectedGroupIdx, 'upper', r, m, teamNum, score)
                        }
                        onAdvanceWinner={(type, r, m) =>
                          handleAdvanceWinner(selectedGroupIdx, 'upper', r, m)
                        }
                        onVetoMatch={onVetoMatch ? (t1, t2) => onVetoMatch(t1, t2, { stage: 'gsl', groupId: activeGroup.id, bracketType: 'upper', rIdx, mIdx }) : undefined}
                        boxStyle={settings.boxStyle}
                        cardThemeColor={settings.cardThemeColor}
                        btnStyle={settings.btnStyle}
                        bracketMode={settings.bracketMode}
                        onSwapTeam={(bType, r, m, teamNum, teamId) =>
                          handleSwapTeam(selectedGroupIdx, 'upper', r, m, teamNum, teamId)
                        }
                        allTeams={tournament.teams}
                        isExporting={isExporting}
                        isSwapMode={isSwapMode}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lower Bracket Section */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
              <Award className="w-4 h-4" /> Нижняя сетка (Lower Bracket) — Матч за 3-е и 4-е место
            </h4>
            <div className="flex gap-4 overflow-x-auto p-4 bg-black/30 rounded-xl border border-white/5 min-h-[220px]">
              {activeGroup.lowerBracket.map((round, rIdx) => (
                <div key={`lb-${rIdx}`} className="flex flex-col w-[300px] shrink-0">
                  <div className="h-8 flex items-center justify-center font-black text-xs uppercase tracking-wider text-amber-400/70 mb-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    {getLowerRoundLabel(rIdx, activeGroup.lowerBracket.length)}
                  </div>
                  <div className="flex flex-col justify-around flex-1 gap-3">
                    {round.map((match, mIdx) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        bracketType="losers"
                        rIdx={rIdx}
                        mIdx={mIdx}
                        onUpdateScore={(type, r, m, teamNum, score) =>
                          handleUpdateScore(selectedGroupIdx, 'lower', r, m, teamNum, score)
                        }
                        onAdvanceWinner={(type, r, m) =>
                          handleAdvanceWinner(selectedGroupIdx, 'lower', r, m)
                        }
                        onVetoMatch={onVetoMatch ? (t1, t2) => onVetoMatch(t1, t2, { stage: 'gsl', groupId: activeGroup.id, bracketType: 'lower', rIdx, mIdx }) : undefined}
                        boxStyle={settings.boxStyle}
                        cardThemeColor={settings.cardThemeColor}
                        btnStyle={settings.btnStyle}
                        bracketMode={settings.bracketMode}
                        onSwapTeam={(bType, r, m, teamNum, teamId) =>
                          handleSwapTeam(selectedGroupIdx, 'lower', r, m, teamNum, teamId)
                        }
                        allTeams={tournament.teams}
                        isExporting={isExporting}
                        isSwapMode={isSwapMode}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
