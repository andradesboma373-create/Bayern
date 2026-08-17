import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Check, Trash2, ArrowLeft, Settings, Download, Image as ImageIcon, X, ChevronUp, ChevronDown, ZoomIn, ZoomOut, RotateCcw, Sliders, Palette, Sparkles, Award } from 'lucide-react';
import { Tournament, TournamentSettings, Team, Match, Group } from './types';
import { loadTournaments, saveTournament, deleteTournament, getTournamentBgImage } from './storage';
import SingleEliminationStage from './SingleEliminationStage';
import GroupStage from './GroupStage';
import SwissStage from './SwissStage';
import GslGroupStage from './GslGroupStage';
import TieredPlayoffStage from './TieredPlayoffStage';
import TournamentSettingsForm from './TournamentSettingsForm';
import MatchCard from './MatchCard';
import { generateDoubleElimination, cascadeAdvancements, advanceDoubleElimMatch } from './doubleEliminationLogic';
import { generateNextSwissRound } from './swissLogic';
import { generateGslGroups, generateTieredPlayoffBracket, getGslGroupStandings, updateGslMatch, advanceTieredPlayoffMatch } from './gslLogic';
import TeamLogo from '../TeamLogo';
import Top20Modal from './Top20Modal';
import FinalistsModal from './FinalistsModal';
import MvpModal from './MvpModal';

export const BG_THEMES = {
  cyber_grid: {
    id: 'cyber_grid',
    name: '👾 Кибер-Сетка',
    className: 'bg-[#050508]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(255, 143, 0, 0.08) 0%, transparent 65%),
        radial-gradient(circle at 20% 80%, rgba(255, 143, 0, 0.03) 0%, transparent 45%),
        radial-gradient(circle at 80% 20%, rgba(255, 143, 0, 0.03) 0%, transparent 45%),
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px',
    },
    overlay: null,
    watermark: 'STAKE RANKED'
  },
  cosmic_arena: {
    id: 'cosmic_arena',
    name: '🌌 Космос',
    className: 'bg-[#030206]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 15% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 55%),
        radial-gradient(circle at 85% 75%, rgba(236, 72, 153, 0.1) 0%, transparent 55%),
        radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
        linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 50px 50px, 50px 50px',
    },
    overlay: null,
    watermark: 'CHAMPIONS'
  },
  carbon_gold: {
    id: 'carbon_gold',
    name: '🔱 Золото',
    className: 'bg-[#08080a]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(255, 184, 0, 0.06) 0%, transparent 60%),
        radial-gradient(circle at 10% 10%, rgba(255, 184, 0, 0.03) 0%, transparent 35%),
        radial-gradient(circle at 90% 90%, rgba(255, 184, 0, 0.03) 0%, transparent 35%),
        radial-gradient(rgba(255, 184, 0, 0.1) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 24px 24px',
    },
    overlay: null,
    watermark: 'GRAND FINAL'
  },
  dark_minimalist: {
    id: 'dark_minimalist',
    name: '🖤 Минимал',
    className: 'bg-[#040406]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 50% 50%, #0c0c10 0%, #040406 100%)
      `,
      backgroundSize: '100% 100%',
    },
    overlay: null,
    watermark: ''
  }
};

export default function TournamentManager({ user }: { user: any }) {
  const userId = user?.uid || 'guest';
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState('');
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [activeTabList, setActiveTabList] = useState<'active' | 'completed'>('active');
  const [isConfirmingSave, setIsConfirmingSave] = useState<{ name: string; settings: TournamentSettings; teams: Team[]; logoUrl?: string; prizePool?: string } | null>(null);
  
  const stageRef = useRef<HTMLDivElement>(null);
  const isolatedBg = activeTournament ? getTournamentBgImage(activeTournament.id) : null;
  const rawBg = isolatedBg || activeTournament?.settings?.bgImage;
  const bgImage = (rawBg && rawBg !== 'null' && rawBg !== 'undefined' && String(rawBg).trim() !== '') ? rawBg : null;
  const bgTheme = activeTournament?.settings?.bgTheme || 'cyber_grid';
  const [isExporting, setIsExporting] = useState(false);
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [showTop20, setShowTop20] = useState(false);
  const [showFinalists, setShowFinalists] = useState(false);
    const [showMvpModal, setShowMvpModal] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [isSeedingOpen, setIsSeedingOpen] = useState(false);
  const [seedingTeams, setSeedingTeams] = useState<Team[]>([]);

  useEffect(() => {
    setTournaments(loadTournaments(userId, true));
    const handleSync = () => {
      setTournaments(loadTournaments(userId, true));
    };
    window.addEventListener('tournaments-updated', handleSync);
    return () => window.removeEventListener('tournaments-updated', handleSync);
  }, [userId]);

  useEffect(() => {
    if (activeTournament) {
        let needsUpdate = false;
        const newSettings = { ...activeTournament.settings };
        
        // Clean up legacy invalid string values ('null', 'undefined', '')
        if (newSettings.bgImage === 'null' || newSettings.bgImage === 'undefined' || newSettings.bgImage === '') {
            newSettings.bgImage = undefined;
            needsUpdate = true;
        }

        // Migrate from old localStorage
        const storedTheme = localStorage.getItem(`bgtheme_${activeTournament.id}`);
        if (storedTheme && !newSettings.bgTheme) {
            newSettings.bgTheme = storedTheme;
            needsUpdate = true;
        }
        const storedImg = localStorage.getItem(`bgimage_${activeTournament.id}`);
        if (storedImg && storedImg !== 'null' && storedImg !== 'undefined' && !newSettings.bgImage) {
            newSettings.bgImage = storedImg;
            newSettings.bgTheme = 'custom';
            needsUpdate = true;
        }

        try {
            localStorage.removeItem(`bgtheme_${activeTournament.id}`);
            localStorage.removeItem(`bgimage_${activeTournament.id}`);
        } catch(e) {}

        if (needsUpdate) {
            const updated = { ...activeTournament, settings: newSettings };
            // Save migrated settings
            saveTournament(userId, updated);
            setActiveTournament(updated);
            setTournaments(loadTournaments(userId));
        }
    }
  }, [activeTournament?.id]);

  const generateSingleEliminationBracket = (teamsList: Team[]): Match[][] => {
    let rounds: Match[][] = [];
    const numTeams = teamsList.length;
    if (numTeams === 0) return [];
    
    let nextPowerOfTwo = 1;
    while (nextPowerOfTwo < numTeams) nextPowerOfTwo *= 2;

    let currentRound: Match[] = [];
    const byes = nextPowerOfTwo - numTeams;
    const numRealVsReal = numTeams - nextPowerOfTwo / 2;
    const numRealVsBye = byes;

    for (let i = 0; i < numRealVsReal; i++) {
      const t1 = teamsList[i * 2];
      const t2 = teamsList[i * 2 + 1];
      currentRound.push({ id: `r0-m${i}`, team1: t1, team2: t2, score1: 0, score2: 0, winnerId: null });
    }

    for (let j = 0; j < numRealVsBye; j++) {
      const mIdx = numRealVsReal + j;
      const t1 = teamsList[numRealVsReal * 2 + j];
      currentRound.push({ id: `r0-m${mIdx}`, team1: t1, team2: null, score1: 0, score2: 0, winnerId: t1.id });
    }

    rounds.push(currentRound);

    let roundSize = nextPowerOfTwo / 4;
    let rIdx = 1;
    while (roundSize >= 1) {
      let nextRound: Match[] = [];
      for (let i = 0; i < roundSize; i++) {
        nextRound.push({ id: `r${rIdx}-m${i}`, team1: null, team2: null, score1: 0, score2: 0, winnerId: null });
      }
      rounds.push(nextRound);
      roundSize /= 2;
      rIdx++;
    }

    // Auto-advance initial winners (e.g., BYEs)
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < rounds.length - 1; r++) {
        for (let m = 0; m < rounds[r].length; m++) {
          const match = rounds[r][m];
          if (match.winnerId) {
            const winningTeam = match.team1?.id === match.winnerId ? match.team1 : match.team2?.id === match.winnerId ? match.team2 : null;
            if (winningTeam) {
              const nextRoundIdx = r + 1;
              const nextMatchIdx = Math.floor(m / 2);
              const isTeam1 = m % 2 === 0;
              const nextMatch = rounds[nextRoundIdx][nextMatchIdx];
              if (nextMatch) {
                if (isTeam1 && nextMatch.team1?.id !== winningTeam.id) {
                  nextMatch.team1 = winningTeam;
                  changed = true;
                } else if (!isTeam1 && nextMatch.team2?.id !== winningTeam.id) {
                  nextMatch.team2 = winningTeam;
                  changed = true;
                }
              }
            }
          }
        }
      }
    }

    return rounds;
  };

  const generateInitialData = (settings: TournamentSettings, teams: Team[]) => {
      let initialGroups: Group[] = [];
      let initialBracket: Match[][] = [];
      let initialLosersBracket: Match[][] = [];
      let initialGrandFinal: Match[] = [];
      let initialSwissRounds: Match[][] = [];
      let initialGslGroups: any[] = [];

      const stage1Type = settings.stage1Type || (settings.mode === 'two_stage' ? 'groups' : (settings.mode === 'swiss' ? 'swiss' : 'playoff'));

      if (stage1Type === 'gsl_groups') {
          const numGroups = settings.numberOfGroups || 2;
          const orderedTeams = settings.seedingType === 'random' ? [...teams].sort(() => Math.random() - 0.5) : [...teams];
          initialGslGroups = generateGslGroups(orderedTeams, numGroups);
      } else if (stage1Type === 'groups') {
          const numGroups = settings.numberOfGroups || 2;
          for (let i = 0; i < numGroups; i++) {
              initialGroups.push({
                  id: `group-${i}`,
                  name: `Группа ${String.fromCharCode(65 + i)}`,
                  teams: [],
                  matches: []
              });
          }
          
          const shuffled = settings.seedingType === 'random' ? [...teams].sort(() => Math.random() - 0.5) : [...teams];
          shuffled.forEach((team, idx) => {
              initialGroups[idx % numGroups].teams.push(team);
          });

          initialGroups.forEach(group => {
              const matches: Match[] = [];
              for (let i = 0; i < group.teams.length; i++) {
                  for (let j = i + 1; j < group.teams.length; j++) {
                      matches.push({
                          id: `m-${group.id}-${i}-${j}-1`,
                          team1: group.teams[i],
                          team2: group.teams[j],
                          score1: 0,
                          score2: 0,
                          winnerId: null
                      });
                      if (settings.matchesPerPairing === 2) {
                          matches.push({
                              id: `m-${group.id}-${i}-${j}-2`,
                              team1: group.teams[j],
                              team2: group.teams[i],
                              score1: 0,
                              score2: 0,
                              winnerId: null
                          });
                      }
                  }
              }
              group.matches = matches;
          });
      } else if (stage1Type === 'swiss') {
          const orderedTeams = settings.seedingType === 'random' ? [...teams].sort(() => Math.random() - 0.5) : [...teams];
          const firstRound = generateNextSwissRound(orderedTeams, [], settings.swissWinsToAdvance || 3, settings.swissLossesToEliminate || 3);
          if (firstRound) initialSwissRounds.push(firstRound);
      } else {
          const shuffled = settings.seedingType === 'random' ? [...teams].sort(() => Math.random() - 0.5) : [...teams];
          if (settings.eliminationType === 'double') {
              const res = generateDoubleElimination(shuffled);
              initialBracket = res.winnersBracket;
              initialLosersBracket = res.losersBracket;
              initialGrandFinal = res.grandFinal;
          } else {
              initialBracket = generateSingleEliminationBracket(shuffled);
          }
      }
      return { initialGroups, initialBracket, initialLosersBracket, initialGrandFinal, initialSwissRounds, initialGslGroups };
  };

  const handleCreate = (name: string, settings: TournamentSettings, teams: Team[], logoUrl?: string, prizePool?: string) => { console.log("handleCreate called:", name, teams.length, settings);
    const { initialGroups, initialBracket, initialLosersBracket, initialGrandFinal, initialSwissRounds, initialGslGroups } = generateInitialData(settings, teams);

    const t: Tournament = {
      id: Date.now().toString(),
      name,
      logoUrl,
      prizePool: prizePool || '$100,000',
      createdAt: Date.now(),
      settings,
      teams,
      activeStage: 1,
      completed: false,
      groups: initialGroups.length > 0 ? initialGroups : undefined,
      gslGroups: initialGslGroups.length > 0 ? initialGslGroups : undefined,
      bracketRounds: initialBracket.length > 0 ? initialBracket : undefined,
      losersBracketRounds: initialLosersBracket.length > 0 ? initialLosersBracket : undefined,
      grandFinal: initialGrandFinal.length > 0 ? initialGrandFinal : undefined,
      swissRounds: initialSwissRounds.length > 0 ? initialSwissRounds : undefined,
    };

    try {
      saveTournament(userId, t);
      setTournaments(loadTournaments(userId));
      setIsCreating(false);
      setActiveTournament(t);
    } catch (e: any) {
      setCreationError("Ошибка сохранения! Превышен лимит памяти (слишком много данных/картинок). Уменьшите размер логотипов команд в меню 'Команды'.");
      setTimeout(() => setCreationError(''), 10000);
    }
  };

  const toggleTournamentCompleted = () => {
    if (!activeTournament) return;
    const isComp = !activeTournament.completed && (activeTournament as any).status !== 'completed';
    const updated: Tournament = {
      ...activeTournament,
      completed: isComp,
      status: isComp ? 'completed' : 'ongoing'
    } as any;
    saveTournament(userId, updated);
    setActiveTournament(updated);
    setTournaments(loadTournaments(userId));
  };

  const handleUpdateActive = (updated: Tournament) => {
      let toSave = { ...updated };
      let winnerName = toSave.winnerName || '';
      if (toSave.settings?.stage1Type === 'gsl_groups' && toSave.activeStage === 2 && toSave.tieredBracketRounds && toSave.tieredBracketRounds.length > 0) {
          const lastRound = toSave.tieredBracketRounds[toSave.tieredBracketRounds.length - 1];
          if (lastRound && lastRound.length > 0 && lastRound[0]?.winnerId) {
              const wTeam = lastRound[0].winnerId === lastRound[0].team1?.id ? lastRound[0].team1 : lastRound[0].team2;
              winnerName = wTeam?.name || '';
          }
      } else if (toSave.settings?.eliminationType === 'double') {
          if (toSave.grandFinal && toSave.grandFinal.length > 0) {
              const gf = toSave.grandFinal;
              if (gf[1] && gf[1].winnerId) {
                  const wTeam = gf[1].winnerId === gf[1].team1?.id ? gf[1].team1 : gf[1].team2;
                  winnerName = wTeam?.name || '';
              } else if (gf[0]?.winnerId) {
                  const wTeam = gf[0].winnerId === gf[0].team1?.id ? gf[0].team1 : gf[0].team2;
                  winnerName = wTeam?.name || '';
              }
          }
      } else {
          if (toSave.bracketRounds && toSave.bracketRounds.length > 0) {
              const lastRound = toSave.bracketRounds[toSave.bracketRounds.length - 1];
              if (lastRound && lastRound.length > 0 && lastRound[0]?.winnerId) {
                  const wTeam = lastRound[0].winnerId === lastRound[0].team1?.id ? lastRound[0].team1 : lastRound[0].team2;
                  winnerName = wTeam?.name || '';
              }
          }
      }
      if (winnerName) {
          toSave.winnerName = winnerName;
      }

      try {
          saveTournament(userId, toSave);
          setActiveTournament(toSave);
          setTournaments(loadTournaments(userId));
      } catch (e) {
          console.warn("Could not save to localStorage due to size limit. Attempting to bypass local cache...");
          // Fallback if local storage quota exceeded: Try to save just to Firestore directly!
          if (toSave.id) {
            import('../../firebase').then(({ db, doc, setDoc }) => {
               setDoc(doc(db, "tournaments", toSave.id), toSave).then(() => {
                 setActiveTournament(toSave);
               }).catch(err => alert("Критическая ошибка сохранения: " + err.message));
            }).catch(console.error);
          } else {
             alert("Ошибка памяти устройства. Слишком много больших картинок.");
          }
      }
  };

  const handleRegenerateTournament = (newTeams: Team[]) => {
    if (!activeTournament) return;
    
    // Force seedingType to 'manual' so our newly custom seeded teams are preserved in order!
    const updatedSettings: TournamentSettings = {
      ...activeTournament.settings,
      seedingType: 'manual'
    };

    const { initialGroups, initialBracket, initialLosersBracket, initialGrandFinal, initialSwissRounds, initialGslGroups } = generateInitialData(updatedSettings, newTeams);

    const updated: Tournament = {
      ...activeTournament,
      settings: updatedSettings,
      teams: newTeams,
      groups: initialGroups.length > 0 ? initialGroups : undefined,
      gslGroups: initialGslGroups.length > 0 ? initialGslGroups : undefined,
      bracketRounds: initialBracket.length > 0 ? initialBracket : undefined,
      losersBracketRounds: initialLosersBracket.length > 0 ? initialLosersBracket : undefined,
      grandFinal: initialGrandFinal.length > 0 ? initialGrandFinal : undefined,
      swissRounds: initialSwissRounds.length > 0 ? initialSwissRounds : undefined,
    };

    handleUpdateActive(updated);
  };

  const moveTeamUp = (index: number) => {
    if (index === 0) return;
    const updated = [...seedingTeams];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSeedingTeams(updated);
  };

  const moveTeamDown = (index: number) => {
    if (index === seedingTeams.length - 1) return;
    const updated = [...seedingTeams];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSeedingTeams(updated);
  };

  const swapSeedingTeams = (idx1: number, idx2: number) => {
    const updated = [...seedingTeams];
    const temp = updated[idx1];
    updated[idx1] = updated[idx2];
    updated[idx2] = temp;
    setSeedingTeams(updated);
  };

  const shuffleSeedingTeams = () => {
    const shuffled = [...seedingTeams].sort(() => Math.random() - 0.5);
    setSeedingTeams(shuffled);
  };

  const pairFirstWithLastSeedingTeams = () => {
    const sorted = [...seedingTeams];
    const rearranged = [];
    let left = 0;
    let right = sorted.length - 1;
    while (left <= right) {
      if (left === right) {
        rearranged.push(sorted[left]);
      } else {
        rearranged.push(sorted[left]);
        rearranged.push(sorted[right]);
      }
      left++;
      right--;
    }
    setSeedingTeams(rearranged);
  };

  const handleEditSave = (name: string, newSettings: TournamentSettings, newTeams: Team[], logoUrl?: string, prizePool?: string) => {
      if (!activeTournament) return;
      
      const formatChanged = activeTournament.settings.mode !== newSettings.mode || 
                            activeTournament.settings.numberOfGroups !== newSettings.numberOfGroups || 
                            activeTournament.settings.matchesPerPairing !== newSettings.matchesPerPairing ||
                            activeTournament.settings.eliminationType !== newSettings.eliminationType;
      
      const oldTeamIds = new Set(activeTournament.teams.map(t => t.id));
      const newTeamIds = new Set(newTeams.map(t => t.id));
      
      let teamsChanged = oldTeamIds.size !== newTeamIds.size;
      if (!teamsChanged) {
          for (let id of newTeamIds) {
              if (!oldTeamIds.has(id)) {
                  teamsChanged = true;
                  break;
              }
          }
      }

      let orderChanged = false;
      if (activeTournament.teams.length !== newTeams.length) {
          orderChanged = true;
      } else {
          for (let i = 0; i < newTeams.length; i++) {
              if (activeTournament.teams[i]?.id !== newTeams[i]?.id) {
                  orderChanged = true;
                  break;
              }
          }
      }

      const hasPlayedMatches = (() => {
          if (activeTournament.groups) {
              for (const g of activeTournament.groups) {
                  for (const m of g.matches) {
                      if (m.score1 > 0 || m.score2 > 0 || m.winnerId) return true;
                  }
              }
          }
          if (activeTournament.bracketRounds) {
              for (const r of activeTournament.bracketRounds) {
                  for (const m of r) {
                      if (m.score1 > 0 || m.score2 > 0 || (m.winnerId && m.team1 && m.team2 && m.team1.id !== 'BYE' && m.team2.id !== 'BYE')) return true;
                  }
              }
          }
          return false;
      })();

      if (formatChanged || teamsChanged || orderChanged) {
          if (!hasPlayedMatches) {
              proceedWithSave(name, newSettings, newTeams, true, logoUrl, prizePool);
              return;
          }
          setIsConfirmingSave({ name, settings: newSettings, teams: newTeams, logoUrl, prizePool });
          return;
      }
      
      proceedWithSave(name, newSettings, newTeams, false, logoUrl, prizePool);
  };

  const proceedWithSave = (name: string, newSettings: TournamentSettings, newTeams: Team[], resetProgress: boolean, logoUrl?: string, prizePool?: string) => {
      if (!activeTournament) return;

      const oldTeamIds = new Set(activeTournament.teams.map(t => t.id));
      const newTeamIds = new Set(newTeams.map(t => t.id));
      
      let teamsChanged = oldTeamIds.size !== newTeamIds.size;
      if (!teamsChanged) {
          for (let id of newTeamIds) {
              if (!oldTeamIds.has(id)) {
                  teamsChanged = true;
                  break;
              }
          }
      }

      let updatedTournament = { 
        ...activeTournament, 
        name, 
        settings: newSettings, 
        teams: newTeams,
        logoUrl: logoUrl !== undefined ? logoUrl : activeTournament.logoUrl,
        prizePool: prizePool !== undefined ? prizePool : activeTournament.prizePool
      };

      // Update team names in existing structures if teams didn't change identity but names changed
      if (!teamsChanged) {
          const teamNameMap = new Map(newTeams.map(t => [t.id, t.name]));
          
          if (updatedTournament.groups) {
              updatedTournament.groups = updatedTournament.groups.map(g => ({
                  ...g,
                  teams: g.teams.map(t => ({ ...t, name: teamNameMap.get(t.id) || t.name })),
                  matches: g.matches.map(m => ({
                      ...m,
                      team1: m.team1 && m.team1.id !== 'BYE' ? { ...m.team1, name: teamNameMap.get(m.team1.id) || m.team1.name } : m.team1,
                      team2: m.team2 && m.team2.id !== 'BYE' ? { ...m.team2, name: teamNameMap.get(m.team2.id) || m.team2.name } : m.team2,
                  }))
              }));
          }
          if (updatedTournament.bracketRounds) {
              updatedTournament.bracketRounds = updatedTournament.bracketRounds.map(r => 
                  r.map(m => ({
                      ...m,
                      team1: m.team1 && m.team1.id !== 'BYE' ? { ...m.team1, name: teamNameMap.get(m.team1.id) || m.team1.name } : m.team1,
                      team2: m.team2 && m.team2.id !== 'BYE' ? { ...m.team2, name: teamNameMap.get(m.team2.id) || m.team2.name } : m.team2,
                  }))
              );
          }
          if (updatedTournament.losersBracketRounds) {
              updatedTournament.losersBracketRounds = updatedTournament.losersBracketRounds.map(r => 
                  r.map(m => ({
                      ...m,
                      team1: m.team1 && m.team1.id !== 'BYE' ? { ...m.team1, name: teamNameMap.get(m.team1.id) || m.team1.name } : m.team1,
                      team2: m.team2 && m.team2.id !== 'BYE' ? { ...m.team2, name: teamNameMap.get(m.team2.id) || m.team2.name } : m.team2,
                  }))
              );
          }
          if (updatedTournament.grandFinal) {
              updatedTournament.grandFinal = updatedTournament.grandFinal.map(m => ({
                  ...m,
                  team1: m.team1 && m.team1.id !== 'BYE' ? { ...m.team1, name: teamNameMap.get(m.team1.id) || m.team1.name } : m.team1,
                  team2: m.team2 && m.team2.id !== 'BYE' ? { ...m.team2, name: teamNameMap.get(m.team2.id) || m.team2.name } : m.team2,
              }));
          }
      }

      if (resetProgress) {
          const { initialGroups, initialBracket, initialLosersBracket, initialGrandFinal } = generateInitialData(newSettings, newTeams);
          updatedTournament.activeStage = 1;
          updatedTournament.groups = initialGroups.length > 0 ? initialGroups : undefined;
          updatedTournament.bracketRounds = initialBracket.length > 0 ? initialBracket : undefined;
          updatedTournament.losersBracketRounds = initialLosersBracket.length > 0 ? initialLosersBracket : undefined;
          updatedTournament.grandFinal = initialGrandFinal.length > 0 ? initialGrandFinal : undefined;
      }

      handleUpdateActive(updatedTournament);
      setIsEditingSettings(false);
      setIsConfirmingSave(null);
  };

  const handlePlayTournamentMatch = (team1: Team, team2: Team, matchInfo?: any) => {
      if (!activeTournament) return;
      const fullTeam1 = activeTournament.teams?.find(t => t.id === team1.id || t.name === team1.name) || team1;
      const fullTeam2 = activeTournament.teams?.find(t => t.id === team2.id || t.name === team2.name) || team2;

      navigate('/', {
          state: {
              team1: fullTeam1,
              team2: fullTeam2,
              game: activeTournament.settings?.game || 'cs2',
              format: (activeTournament.settings?.matchFormat || 'bo3').toUpperCase(),
              selectedTournament: activeTournament.id,
              tournament: activeTournament,
              matchInfo: matchInfo
          }
      });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("Вы уверены, что хотите удалить этот турнир?")) {
          await deleteTournament(userId, id);
          if (activeTournament?.id === id) {
              setActiveTournament(null);
          }
          setTournaments(loadTournaments(userId));
      }
  };

  
  const handleApplyMatchResult = (matchInfo: any, score1: number, score2: number) => {
      if (!activeTournament) {
          return;
      }
      let newT = { ...activeTournament };

      if (matchInfo && matchInfo.stage === 'gsl') {
          const { groupId, bracketType, rIdx, mIdx } = matchInfo;
          if (newT.gslGroups) {
              const gIdx = newT.gslGroups.findIndex(g => g.id === groupId);
              if (gIdx !== -1) {
                  const updatedGroup = updateGslMatch(newT.gslGroups[gIdx], bracketType, rIdx, mIdx, score1, score2);
                  const updatedGroups = [...newT.gslGroups];
                  updatedGroups[gIdx] = updatedGroup;
                  newT.gslGroups = updatedGroups;
              }
          }
      } else if (matchInfo && matchInfo.stage === 'tiered_playoff') {
          const { rIdx, mIdx } = matchInfo;
          if (newT.tieredBracketRounds) {
              const updatedRounds = advanceTieredPlayoffMatch(newT.tieredBracketRounds, rIdx, mIdx, score1, score2);
              newT.tieredBracketRounds = updatedRounds;
          }
      } else if (matchInfo && matchInfo.stage === 'group') {
          const newGroups = newT.groups?.map((g: any) => {
              if (g.id !== matchInfo.groupId) return g;
              const newMatches = g.matches.map((m: any) => {
                  if (m.id !== matchInfo.matchId) return m;
                  let wId = null;
                  if (score1 > score2) wId = m.team1?.id;
                  else if (score2 > score1) wId = m.team2?.id;
                  return { ...m, score1, score2, winnerId: wId, isFinished: true };
              });
              return { ...g, matches: newMatches };
          });
          newT.groups = newGroups;
      } else if (matchInfo && matchInfo.stage === 'swiss') {
          const newRounds = [...(newT.swissRounds || [])];
          if (newRounds[matchInfo.rIdx] && newRounds[matchInfo.rIdx][matchInfo.mIdx]) {
              const m = { ...newRounds[matchInfo.rIdx][matchInfo.mIdx] };
              m.score1 = score1;
              m.score2 = score2;
              if (score1 > score2) m.winnerId = m.team1?.id;
              else if (score2 > score1) m.winnerId = m.team2?.id;
              m.isFinished = true;
              newRounds[matchInfo.rIdx][matchInfo.mIdx] = m;
              newT.swissRounds = newRounds;
          }
      } else if (matchInfo && matchInfo.stage === 'playoff') {
          const { type, rIdx, mIdx } = matchInfo;
          const isDouble = newT.settings.eliminationType === 'double';
          let wBracket = newT.bracketRounds ? JSON.parse(JSON.stringify(newT.bracketRounds)) : [];
          let lBracket = newT.losersBracketRounds ? JSON.parse(JSON.stringify(newT.losersBracketRounds)) : [];
          let gFinal = newT.grandFinal ? JSON.parse(JSON.stringify(newT.grandFinal)) : [];

          let typeChar: 'w' | 'l' | 'gf' = type === 'winners' || type === 'w' ? 'w' : type === 'losers' || type === 'l' ? 'l' : 'gf';
          let matchToUpdate: any = null;

          if (typeChar === 'w' && wBracket[rIdx]?.[mIdx]) {
              matchToUpdate = wBracket[rIdx][mIdx];
          } else if (typeChar === 'l' && lBracket[rIdx]?.[mIdx]) {
              matchToUpdate = lBracket[rIdx][mIdx];
          } else if (typeChar === 'gf' && gFinal[rIdx]) {
              matchToUpdate = gFinal[rIdx];
          }

          if (matchToUpdate) {
              matchToUpdate.score1 = score1;
              matchToUpdate.score2 = score2;
              if (score1 > score2) matchToUpdate.winnerId = matchToUpdate.team1?.id || null;
              else if (score2 > score1) matchToUpdate.winnerId = matchToUpdate.team2?.id || null;

              const winningTeam = score1 > score2 ? matchToUpdate.team1 : matchToUpdate.team2;
              const losingTeam = score1 > score2 ? matchToUpdate.team2 : matchToUpdate.team1;

              if (isDouble) {
                  advanceDoubleElimMatch(wBracket, lBracket, gFinal, typeChar, rIdx, mIdx, winningTeam, losingTeam);
                  const cascaded = cascadeAdvancements(wBracket, lBracket, gFinal);
                  newT.bracketRounds = cascaded.winnersBracket;
                  newT.losersBracketRounds = cascaded.losersBracket;
                  newT.grandFinal = cascaded.grandFinal;
              } else {
                  if (rIdx < wBracket.length - 1) {
                      const nextRoundIdx = rIdx + 1;
                      const nextMatchIdx = Math.floor(mIdx / 2);
                      const isTeam1 = mIdx % 2 === 0;
                      const nextMatch = wBracket[nextRoundIdx]?.[nextMatchIdx];
                      if (nextMatch) {
                          if (isTeam1) nextMatch.team1 = winningTeam;
                          else nextMatch.team2 = winningTeam;
                      }
                  }
                  newT.bracketRounds = wBracket;
              }
          }
      }

      handleUpdateActive(newT);
  };

  const isTournamentFinished = () => {
      if (!activeTournament) return false;
      if (activeTournament.settings.stage1Type === 'gsl_groups' && activeTournament.activeStage === 2) {
          if (activeTournament.tieredBracketRounds && activeTournament.tieredBracketRounds.length > 0) {
              const lastRound = activeTournament.tieredBracketRounds[activeTournament.tieredBracketRounds.length - 1];
              if (lastRound && lastRound.length > 0 && lastRound[0] && lastRound[0].winnerId) return true;
          }
          if (activeTournament.bracketRounds && activeTournament.bracketRounds.length > 0) {
              const lastRound = activeTournament.bracketRounds[activeTournament.bracketRounds.length - 1];
              if (lastRound && lastRound.length > 0 && lastRound[0] && lastRound[0].winnerId) return true;
          }
      }
      if (activeTournament.settings.eliminationType === 'double') {
          if (activeTournament.grandFinal && activeTournament.grandFinal.length > 0) {
              const gf = activeTournament.grandFinal;
              if (gf[0] && gf[0].winnerId) return true;
          }
      } else {
          if (activeTournament.bracketRounds && activeTournament.bracketRounds.length > 0) {
              const lastRound = activeTournament.bracketRounds[activeTournament.bracketRounds.length - 1];
              if (lastRound && lastRound.length > 0 && lastRound[0] && lastRound[0].winnerId) return true;
          }
      }
      return false;
  };

  const handleAdvanceToBracket = () => {
      if (!activeTournament) return;
      
      const isGsl = activeTournament.settings.stage1Type === 'gsl_groups';
      const isGroups = activeTournament.settings.stage1Type === 'groups' || (!activeTournament.settings.stage1Type && activeTournament.settings.mode === 'two_stage');
      const isSwiss = activeTournament.settings.stage1Type === 'swiss' || (!activeTournament.settings.stage1Type && activeTournament.settings.mode === 'swiss');
      
      if (isGsl && !activeTournament.gslGroups) return;
      if (isGroups && !activeTournament.groups) return;
      if (isSwiss && !activeTournament.swissRounds) return;

      if (isGsl && activeTournament.gslGroups) {
          const stage2Type = activeTournament.settings.stage2Type || 'tiered';

          if (stage2Type === 'tiered') {
              const tieredRounds = generateTieredPlayoffBracket(activeTournament.gslGroups);
              const updated = {
                  ...activeTournament,
                  activeStage: 2 as const,
                  tieredBracketRounds: tieredRounds
              };
              handleUpdateActive(updated);
              return;
          } else {
              const advancingTeams: Team[] = [];
              activeTournament.gslGroups.forEach(g => {
                  const st = getGslGroupStandings(g);
                  if (st.first) advancingTeams.push(st.first);
                  if (st.second) advancingTeams.push(st.second);
                  if (st.third) advancingTeams.push(st.third);
                  if (st.fourth) advancingTeams.push(st.fourth);
              });

              let initialBracket: Match[][] = [];
              let initialLosersBracket: Match[][] = [];
              let initialGrandFinal: Match[] = [];

              if (stage2Type === 'double' || activeTournament.settings.eliminationType === 'double') {
                  const res = generateDoubleElimination(advancingTeams);
                  initialBracket = res.winnersBracket;
                  initialLosersBracket = res.losersBracket;
                  initialGrandFinal = res.grandFinal;
              } else {
                  initialBracket = generateSingleEliminationBracket(advancingTeams);
              }

              const updated = {
                  ...activeTournament,
                  activeStage: 2 as const,
                  bracketRounds: initialBracket,
                  losersBracketRounds: initialLosersBracket.length > 0 ? initialLosersBracket : undefined,
                  grandFinal: initialGrandFinal.length > 0 ? initialGrandFinal : undefined
              };
              handleUpdateActive(updated);
              return;
          }
      }

      const advancingTeams: Team[] = [];
      
      if (isSwiss && activeTournament.swissRounds) {
          const winsToAdvance = activeTournament.settings.swissWinsToAdvance || 3;
          const stats = new Map<string, { w: number, team: Team }>();
          activeTournament.teams.forEach(t => stats.set(t.id, { w: 0, team: t }));
          
          activeTournament.swissRounds.flat().forEach(m => {
              if (m.winnerId) {
                  if (m.team1 && m.team1.id !== 'BYE' && m.winnerId === m.team1.id) stats.get(m.team1.id)!.w++;
                  if (m.team2 && m.team2.id !== 'BYE' && m.winnerId === m.team2.id) stats.get(m.team2.id)!.w++;
              }
          });

          stats.forEach(s => {
              if (s.w >= winsToAdvance) advancingTeams.push(s.team);
          });
      } else if (activeTournament.groups) {
          activeTournament.groups.forEach(group => {
          const stats: any = {};
          group.teams.forEach(t => stats[t.id] = { team: t, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
          group.matches.forEach(m => {
            if (m.winnerId || m.isDraw) {
                const add = (tId: string, gf: number, ga: number, isW: boolean, isD: boolean) => {
                    stats[tId].gf += gf; stats[tId].ga += ga;
                    if (isW) { stats[tId].w++; stats[tId].pts += (activeTournament.settings.winPoints || 3); }
                    else if (isD) { stats[tId].d++; stats[tId].pts += (activeTournament.settings.drawPoints || 1); }
                    else { stats[tId].l++; stats[tId].pts += (activeTournament.settings.lossPoints || 0); }
                };
                if (m.team1) add(m.team1.id, m.score1, m.score2, m.winnerId === m.team1.id, !!m.isDraw);
                if (m.team2) add(m.team2.id, m.score2, m.score1, m.winnerId === m.team2.id, !!m.isDraw);
            }
          });
          
          const sorted = (Object.values(stats) as Array<{team: Team, pts: number, gf: number, ga: number}>).sort((a, b) => {
              if (b.pts !== a.pts) return b.pts - a.pts;
              const gdA = a.gf - a.ga; const gdB = b.gf - b.ga;
              if (gdB !== gdA) return gdB - gdA;
              return b.gf - a.gf;
          });
          
          const advCount = activeTournament.settings.advancingPerGroup || 2;
          for (let i = 0; i < advCount && i < sorted.length; i++) {
              advancingTeams.push(sorted[i].team);
          }
      });
      }

      let initialBracket: Match[][] = [];
      let initialLosersBracket: Match[][] = [];
      let initialGrandFinal: Match[] = [];

      if (activeTournament.settings.eliminationType === 'double') {
          const res = generateDoubleElimination(advancingTeams);
          initialBracket = res.winnersBracket;
          initialLosersBracket = res.losersBracket;
          initialGrandFinal = res.grandFinal;
      } else {
          initialBracket = generateSingleEliminationBracket(advancingTeams);
      }

      const updated = {
          ...activeTournament,
          activeStage: 2 as const,
          bracketRounds: initialBracket,
          losersBracketRounds: initialLosersBracket.length > 0 ? initialLosersBracket : undefined,
          grandFinal: initialGrandFinal.length > 0 ? initialGrandFinal : undefined
      };
      handleUpdateActive(updated);
  };

  if (activeTournament) {
      if (isEditingSettings) {
          return (
              <div className="w-full max-w-4xl mx-auto relative">
                  {isConfirmingSave && (
                      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                          <div className="bg-[#12121a] p-8 rounded-2xl border border-red-500/30 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                              <h3 className="text-2xl font-black text-white mb-4">Внимание!</h3>
                              <p className="text-white/70 mb-8">
                                  Вы изменили состав команд или формат турнира. Это приведет к <strong>полному сбросу текущего прогресса матчей</strong>. Вы уверены, что хотите продолжить?
                              </p>
                              <div className="flex gap-4">
                                  <button 
                                      onClick={() => setIsConfirmingSave(null)}
                                      className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors"
                                  >
                                      Отмена
                                  </button>
                                  <button 
                                      onClick={() => proceedWithSave(isConfirmingSave.name, isConfirmingSave.settings, isConfirmingSave.teams, true, isConfirmingSave.logoUrl, isConfirmingSave.prizePool)}
                                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors"
                                  >
                                      Продолжить
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
                  <button onClick={() => setIsEditingSettings(false)} className="flex items-center gap-2 text-white/50 hover:text-white mb-6">
                      <ArrowLeft className="w-4 h-4" /> Назад к турниру
                  </button>
                  <h2 className="text-3xl font-black mb-8 text-[#ff8f00]">Настройки турнира</h2>
                  <div className="mb-4 text-white/70 bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                      <p className="font-bold text-red-400">Внимание:</p>
                      <p className="text-sm">Изменение названия команд или очков применится сразу. Добавление/Удаление команд или изменение формата турнира сбросит текущий прогресс.</p>
                  </div>
                  <TournamentSettingsForm user={user} 
                      initialName={activeTournament.name}
                      initialLogoUrl={activeTournament.logoUrl}
                      initialPrizePool={activeTournament.prizePool || '$100,000'}
                      initialSettings={activeTournament.settings}
                      initialTeams={activeTournament.teams}
                      onSave={handleEditSave}
                      submitLabel="Сохранить изменения"
                  />
              </div>
          );
      }

      const handleExport = async () => {
          if (!stageRef.current) return;
          setIsExporting(true);
          try {
              // Wait a bit for the UI to update and re-render plain text instead of selects
              await new Promise(resolve => setTimeout(resolve, 300));
              const themeConfig = BG_THEMES[bgTheme as keyof typeof BG_THEMES] || BG_THEMES.cyber_grid;
              const defaultBgColor = themeConfig ? (themeConfig.className.replace('bg-[', '').replace(']', '') || '#050508') : '#050508';
              const { toPng } = await import('html-to-image');
              
              const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

              const el = stageRef.current;
              const origBg = el.style.background;
              const origBgImage = el.style.backgroundImage;
              const origBgColor = el.style.backgroundColor;

              if (bgImage) {
                  el.style.backgroundImage = `url("${bgImage}")`;
                  el.style.backgroundSize = 'cover';
                  el.style.backgroundPosition = 'center';
              } else if (themeConfig && themeConfig.style) {
                  el.style.backgroundColor = defaultBgColor;
                  if (themeConfig.style.backgroundImage) {
                      el.style.backgroundImage = themeConfig.style.backgroundImage;
                  }
              }

              let dataUrl: string;
              try {
                  dataUrl = await toPng(el, { 
                      quality: 0.95, 
                      pixelRatio: 2,
                      backgroundColor: defaultBgColor,
                      skipFonts: true,
                      fontEmbedCSS: '',
                      imagePlaceholder: transparentPlaceholder,
                      cacheBust: true
                  });
              } catch (retryErr) {
                  // Fallback without cacheBust or high pixelRatio in case of CORS/Event errors
                  dataUrl = await toPng(el, { 
                      quality: 0.9, 
                      pixelRatio: 1.5,
                      backgroundColor: defaultBgColor,
                      skipFonts: true,
                      fontEmbedCSS: '',
                      imagePlaceholder: transparentPlaceholder
                  });
              } finally {
                  el.style.background = origBg;
                  el.style.backgroundImage = origBgImage;
                  el.style.backgroundColor = origBgColor;
              }

              const link = document.createElement('a');
              link.download = `${activeTournament.name}-bracket.png`;
              link.href = dataUrl;
              link.click();
          } catch (err: any) {
              console.error('Failed to export image', err?.message || err);
              alert('Ошибка при сохранении изображения: ' + (err?.message || 'Не удалось обработать некоторые изображения или шрифты'));
          } finally {
              setIsExporting(false);
          }
      };

      const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files && e.target.files[0] && activeTournament) {
              const file = e.target.files[0];
              const formData = new FormData();
              formData.append('file', file);
              
              fetch('/api/upload?type=background', { method: 'POST', body: formData })
                .then(r => r.json())
                .then(d => {
                   if (d.url) {
                      const newT = { ...activeTournament, settings: { ...activeTournament.settings, bgImage: d.url, bgTheme: 'custom' } };
                      handleUpdateActive(newT);
                   }
                })
                .catch(() => {
                   const reader = new FileReader();
                   reader.onload = (evt) => {
                      if (evt.target?.result) {
                         const url = evt.target.result as string;
                         const newT = { ...activeTournament, settings: { ...activeTournament.settings, bgImage: url, bgTheme: 'custom' } };
                         handleUpdateActive(newT);
                      }
                   };
                   reader.readAsDataURL(file);
                });
          }
      };

      const handleThemeSelect = (themeId: string) => {
          if (activeTournament) {
              const newSettings = { ...activeTournament.settings, bgTheme: themeId, bgImage: undefined };
              handleUpdateActive({ ...activeTournament, settings: newSettings });
          }
      };

      const activeTheme = BG_THEMES[bgTheme as keyof typeof BG_THEMES] || BG_THEMES.cyber_grid;

      const hasStarted = (() => {
        if (!activeTournament) return false;
        // Check groups
        if (activeTournament.groups && activeTournament.groups.length > 0) {
          if (activeTournament.groups.some(g => g.matches.some(m => m.winnerId))) return true;
        }
        // Check swiss
        if (activeTournament.swissRounds && activeTournament.swissRounds.length > 0) {
          if (activeTournament.swissRounds.some(r => r.some(m => m.winnerId))) return true;
        }
        // Check playoffs
        if (activeTournament.bracketRounds && activeTournament.bracketRounds.length > 0) {
          if (activeTournament.bracketRounds.some(r => r.some(m => m.winnerId))) return true;
        }
        if (activeTournament.losersBracketRounds && activeTournament.losersBracketRounds.length > 0) {
          if (activeTournament.losersBracketRounds.some(r => r.some(m => m.winnerId))) return true;
        }
        return false;
      })();

      return (
          <div className="w-full">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <button onClick={() => setActiveTournament(null)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Назад к турнирам
                  </button>
                  <div className="flex items-center gap-3 flex-wrap">
                      <button 
                        onClick={() => setShowTop20(true)} 
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center gap-2 cursor-pointer"
                      >
                        📊 ТОП-20 Игроков
                      </button>

                      {!hasStarted && (
                          <button 
                              onClick={() => {
                                  setSeedingTeams([...activeTournament.teams]);
                                  setIsSeedingOpen(true);
                              }} 
                              className="flex items-center gap-2 bg-[#ff8f00] hover:bg-[#ff8f00]/95 text-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(255,143,0,0.3)] cursor-pointer"
                          >
                              🎲 Ручной Посев
                          </button>
                      )}
                      
                      {activeTournament.status === 'ongoing' && (
                          <button 
                            onClick={() => {
                                const t = {...activeTournament, status: 'completed'};
                                saveTournament(userId, t);
                                setActiveTournament(t);
                                setTournaments(loadTournaments(userId));
                                setShowTop20(true);
                            }} 
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer"
                          >
                            Завершить турнир
                          </button>
                      )}

                      {activeTournament.status === 'setup' && (
                          <button 
                            onClick={() => {
                                const t = {...activeTournament, status: 'ongoing'};
                                saveTournament(userId, t);
                                setActiveTournament(t);
                                setTournaments(loadTournaments(userId));
                            }} 
                            className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer"
                          >
                            Начать турнир
                          </button>
                      )}

                      <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 bg-[#ff8f00]/20 hover:bg-[#ff8f00]/30 border border-[#ff8f00]/50 px-4 py-2 rounded-xl text-[#ff8f00] font-black tracking-wide text-xs uppercase transition-colors disabled:opacity-50">
                          <Download className="w-4 h-4" /> {isExporting ? 'Экспорт...' : 'Скачать сетку (PNG)'}
                      </button>
                      <label className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-white font-bold transition-colors cursor-pointer border border-white/10">
                          <input 
                              type="checkbox" 
                              checked={isSwapMode} 
                              onChange={(e) => setIsSwapMode(e.target.checked)} 
                              className="rounded border-white/20 bg-black/50 text-[#ff8f00] focus:ring-[#ff8f00]"
                          />
                          <span className="text-xs uppercase tracking-wider">Изменение команд</span>
                      </label>
                      <button onClick={() => setIsEditingSettings(true)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-white font-bold transition-colors">
                          <Settings className="w-4 h-4" /> Настройки
                      </button>
                  </div>
              </div>
              <div className="flex justify-end mb-6">
                  <button
                      onClick={() => setShowCustomizationModal(true)}
                      className="bg-[#161726] border border-[#ff8f00]/50 text-[#ff8f00] font-black uppercase tracking-wider text-sm py-3 px-6 rounded-xl hover:bg-[#ff8f00]/20 transition-all flex items-center gap-3 shadow-[0_0_15px_rgba(255,143,0,0.15)] hover:shadow-[0_0_25px_rgba(255,143,0,0.3)] cursor-pointer"
                  >
                      <span className="text-xl">🎨</span> Настроить кастомизацию сетки
                  </button>
              </div>

              {/* Customization Modal in Manager */}
              {showCustomizationModal && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-6xl my-auto flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] max-h-[90vh]">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                        <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                          <span className="text-2xl">🎨</span> Кастомизация Сетки и Карточек
                        </h2>
                        <button onClick={() => setShowCustomizationModal(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10">
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                      
                      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                        {/* Left Side: Settings */}
                        <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-white/5 flex flex-col gap-8 custom-scrollbar">
                            
                            {/* Background Upload and Preset */}
                            <div className="flex flex-col gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                <h3 className="text-[#ff8f00] font-black uppercase tracking-widest text-xs flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Изображение Фона
                                </h3>
                                
                                <label className="flex items-center justify-center gap-2 px-4 py-4 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 border border-[#ff8f00]/30 rounded-xl text-sm font-black uppercase text-[#ff8f00] cursor-pointer transition-all shadow-[0_0_15px_rgba(255,143,0,0.1)] w-full text-center">
                                    <ImageIcon className="w-5 h-5" />
                                    <span>Загрузить свой фон</span>
                                    <input 
                                         type="file" 
                                         accept="image/*" 
                                         onChange={handleBgUpload} 
                                         className="hidden" 
                                    />
                                </label>

                                {bgImage && (
                                    <button
                                        type="button"
                                        onClick={() => handleThemeSelect('cyber_grid')}
                                        className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-all text-center uppercase tracking-wider flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Удалить свой фон
                                    </button>
                                )}

                                <div className="mt-2">
                                    <label className="block text-white/50 text-xs font-bold mb-2">Или выберите пресет:</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(BG_THEMES).map(([key, theme]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => handleThemeSelect(key)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                                    bgTheme === key && !bgImage
                                                        ? 'bg-[#ff8f00] text-black border-[#ff8f00] shadow-[0_0_10px_rgba(255,143,0,0.3)]'
                                                        : 'bg-black/40 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                {theme.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Background Dimming & Blur Settings */}
                            <div className="flex flex-col gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                <h3 className="text-[#ff8f00] font-black uppercase tracking-widest text-xs">Фон Турнира</h3>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-white text-xs font-bold">🌓 Затемнение фона (Тёмный фильтр):</label>
                                        <span className="text-xs font-mono text-[#ff8f00] font-extrabold bg-[#ff8f00]/10 px-2 py-0.5 rounded border border-[#ff8f00]/20">
                                            {activeTournament.settings.bgOpacity !== undefined ? activeTournament.settings.bgOpacity : 50}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={activeTournament.settings.bgOpacity !== undefined ? activeTournament.settings.bgOpacity : 50}
                                        onChange={async (e) => {
                                            const val = parseInt(e.target.value);
                                            handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, bgOpacity: val }});
                                        }}
                                        className="w-full accent-[#ff8f00] cursor-pointer"
                                    />
                                </div>
                    
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-white text-xs font-bold">🌫️ Блюр фона (Размытие):</label>
                                        <span className="text-xs font-mono text-[#ff8f00] font-extrabold bg-[#ff8f00]/10 px-2 py-0.5 rounded border border-[#ff8f00]/20">
                                            {activeTournament.settings.bgBlur !== undefined ? activeTournament.settings.bgBlur : 10}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="30"
                                        step="2"
                                        value={activeTournament.settings.bgBlur !== undefined ? activeTournament.settings.bgBlur : 0}
                                        onChange={async (e) => {
                                            const val = parseInt(e.target.value);
                                            handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, bgBlur: val }});
                                        }}
                                        className="w-full accent-[#ff8f00] cursor-pointer"
                                    />
                                </div>
                            </div>
                    
                            {/* Match Box Style */}
                            <div className="flex flex-col gap-3">
                                <label className="block text-white/70 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[#ff8f00]" /> Дизайн Карточек Матча
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'cyber', name: '🚀 Киберпанк' },
                                        { id: 'neon', name: '🔮 Яркий Неон' },
                                        { id: 'glass', name: '🧊 Матовое стекло' },
                                        { id: 'gold', name: '👑 Золото' },
                                        { id: 'dark', name: '🌑 Классик' },
                                        { id: 'brutalist', name: '⚡ Брутализм' },
                                        { id: 'retro', name: '📟 Ретро 8-бит' },
                                        { id: 'minimalist', name: '⚪ Минимализм' },
                                    ].map((styleItem) => (
                                        <button
                                            key={styleItem.id}
                                            type="button"
                                            onClick={() => handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, boxStyle: styleItem.id as any }})}
                                            className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                                                (activeTournament.settings.boxStyle || 'dark') === styleItem.id
                                                    ? 'bg-[#ff8f00]/20 border-[#ff8f00] text-white shadow-[0_0_15px_rgba(255,143,0,0.25)]'
                                                    : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <span>{styleItem.name}</span>
                                            {(activeTournament.settings.boxStyle || 'dark') === styleItem.id && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#ff8f00] shadow-[0_0_8px_#ff8f00]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                  
                            {/* Card Accent Color Palette */}
                            <div className="flex flex-col gap-3">
                                <label className="block text-white/70 text-xs font-black uppercase tracking-widest">
                                    🎨 Основной цвет элементов
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: '#ff8f00', name: 'Оранжевый', class: 'bg-[#ff8f00]' },
                                        { id: '#00f0ff', name: 'Неон Голубой', class: 'bg-[#00f0ff]' },
                                        { id: '#10b981', name: 'Изумруд', class: 'bg-[#10b981]' },
                                        { id: '#a855f7', name: 'Ультрафиолет', class: 'bg-[#a855f7]' },
                                        { id: '#ef4444', name: 'Алый Красный', class: 'bg-[#ef4444]' },
                                        { id: '#eab308', name: 'Золото', class: 'bg-[#eab308]' },
                                        { id: '#ec4899', name: 'Розовый', class: 'bg-[#ec4899]' },
                                    ].map((colorItem) => (
                                        <button
                                            key={colorItem.id}
                                            type="button"
                                            onClick={() => handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, cardThemeColor: colorItem.id }})}
                                            className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                                (activeTournament.settings.cardThemeColor || '#ff8f00') === colorItem.id
                                                    ? 'bg-white/15 border-white text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                                                    : 'bg-black/40 border-white/10 text-white/50 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <span className={`w-3.5 h-3.5 rounded-full ${colorItem.class} shadow-sm border border-black/50`} />
                                            <span>{colorItem.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                  
                            {/* Bracket Scale Setting */}
                            <div className="flex flex-col gap-3">
                                <label className="block text-white/70 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <ZoomIn className="w-4 h-4 text-[#ff8f00]" /> Масштаб Сетки
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                                    {[
                                        { label: '50%', val: 50 },
                                        { label: '75%', val: 75 },
                                        { label: '90%', val: 90 },
                                        { label: '100%', val: 100 },
                                        { label: '110%', val: 110 },
                                        { label: '125%', val: 125 },
                                        { label: '150%', val: 150 },
                                    ].map((preset) => (
                                        <button
                                            key={preset.val}
                                            type="button"
                                            onClick={() => handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, bracketScale: preset.val }})}
                                            className={`py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                                (activeTournament.settings.bracketScale || 100) === preset.val
                                                    ? 'bg-[#ff8f00] text-black border-[#ff8f00]'
                                                    : 'bg-black/40 text-white/50 border-white/5 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Side: Preview */}
                        <div className="w-full md:w-1/2 p-6 overflow-y-auto flex flex-col items-center justify-center bg-[#0d0e15] border-t md:border-t-0 border-l-0 md:border-l border-white/5 relative">
                           <div className="absolute inset-0 z-0 bg-black">
                               {bgImage ? (
                                  <div 
                                       className="absolute inset-0 z-0 bg-cover bg-center transition-all" 
                                       style={{ 
                                           backgroundImage: `url(${bgImage})`,
                                          filter: activeTournament.settings.bgBlur ? `blur(${activeTournament.settings.bgBlur}px)` : undefined
                                      }} 
                                   />
                              ) : (
                                  <div 
                                       className={`absolute inset-0 z-0 transition-all ${activeTheme.className}`}
                                      style={{
                                          ...activeTheme.style,
                                          filter: activeTournament.settings.bgBlur ? `blur(${activeTournament.settings.bgBlur}px)` : undefined
                                      }}
                                  />
                              )}
                              <div 
                                   className="absolute inset-0 z-0 bg-black pointer-events-none transition-opacity duration-200" 
                                   style={{ 
                                       opacity: (activeTournament.settings.bgOpacity !== undefined ? activeTournament.settings.bgOpacity : 50) / 100
                                  }} 
                              />
                           </div>

                           <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/40 font-black uppercase text-[10px] tracking-widest bg-black/40 px-4 py-1.5 rounded-full border border-white/5 z-10 backdrop-blur-md">
                               Превью Карточки Матча
                           </div>
                           
                           <div className="w-full max-w-sm flex items-center justify-center transition-transform duration-300 z-10" style={{ transform: `scale(${(activeTournament.settings.bracketScale || 100) / 100})`, transformOrigin: 'center center' }}>
                             <div className="w-full relative pointer-events-none">
                               <MatchCard 
                                  match={{
                                    id: 'mock-match',
                                    team1: { id: 'team1', name: 'Natus Vincere', logoUrl: 'https://img-cdn.hltv.org/teamlogo/9b5o0_R21E8qH8x8K4q_c_.svg?ixlib=java-2.1.0&s=9fcf2b0a6da9b552377b2f0a8d62da3e' },
                                    team2: { id: 'team2', name: 'FaZe Clan', logoUrl: 'https://img-cdn.hltv.org/teamlogo/gO-Fp-X6H2p-0o79eH99tB.svg?ixlib=java-2.1.0&s=e6fc339178cbcd253c0ddf3be23c21d8' },
                                    score1: 2,
                                    score2: 1,
                                    winnerId: 'team1',
                                    isFinished: true
                                  }} 
                                  bracketType="winners"
                                  rIdx={0}
                                  mIdx={0}
                                  onUpdateScore={() => {}}
                                  onAdvanceWinner={() => {}}
                                  boxStyle={activeTournament.settings.boxStyle}
                                  cardThemeColor={activeTournament.settings.cardThemeColor}
                                  btnStyle={activeTournament.settings.btnStyle}
                                  bracketMode={activeTournament.settings.bracketMode}
                               />
                             </div>
                           </div>
                        </div>
                      </div>
                      
                      <div className="p-5 border-t border-white/5 flex justify-end bg-black/40 shrink-0 z-10">
                         <button
                            type="button"
                            onClick={() => setShowCustomizationModal(false)}
                            className="bg-[#ff8f00] text-black font-black uppercase tracking-wider py-3 px-8 rounded-xl hover:bg-[#ffa733] transition-colors flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,143,0,0.4)]"
                         >
                            <Check className="w-5 h-5" /> Готово
                         </button>
                      </div>
                    </div>
                  </div>
              )}

              <div 
                  ref={stageRef}
                  data-exporting={isExporting}
                  className="w-full relative p-8 rounded-2xl overflow-hidden min-h-[500px] border border-white/5 transition-all"
                  style={{
                      zoom: `${activeTournament.settings.bracketScale || 100}%`
                  }}
              >
                  {/* Background Layer (Custom Image or Theme) */}
                  {bgImage ? (
                      <div 
                          className="absolute inset-0 z-0 bg-cover bg-center transition-all" 
                          style={{ 
                              backgroundImage: `url(${bgImage})`,
                              filter: activeTournament.settings.bgBlur ? `blur(${activeTournament.settings.bgBlur}px)` : undefined
                          }} 
                      />
                  ) : (
                      <div 
                          className={`absolute inset-0 z-0 transition-all ${activeTheme.className}`}
                          style={{
                              ...activeTheme.style,
                              filter: activeTournament.settings.bgBlur ? `blur(${activeTournament.settings.bgBlur}px)` : undefined
                          }}
                      />
                  )}

                  {/* Dark overlay to make content readable over custom background or preset theme */}
                  <div 
                      className="absolute inset-0 z-0 bg-black pointer-events-none transition-opacity duration-200" 
                      style={{ 
                          opacity: (activeTournament.settings.bgOpacity !== undefined ? activeTournament.settings.bgOpacity : 50) / 100
                      }} 
                  />

                  {/* Aesthetic Vector Watermark behind bracket */}
                  {!bgImage && activeTheme.watermark && (
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.015] select-none pointer-events-none z-0">
                          <span className="font-black text-[12vw] uppercase tracking-[1.5em] text-white leading-none rotate-[-12deg] whitespace-nowrap pl-[1.5em]">
                              {activeTheme.watermark}
                          </span>
                      </div>
                  )}
                  
                  {/* Content */}
                  <div className="relative z-10">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-black/40 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
                          <div className="flex items-center gap-4">
                              {activeTournament.logoUrl ? (
                                  <img 
                                      src={activeTournament.logoUrl} 
                                      alt={activeTournament.name} 
                                      className="w-14 h-14 object-contain rounded-xl border border-white/10 bg-black/60 p-1 shadow-lg"
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
                              ) : (
                                  <div className="w-14 h-14 rounded-xl bg-[#18192a] border border-white/10 flex items-center justify-center text-[#ff8f00] font-black text-2xl shadow-lg">
                                      ?
                                  </div>
                              )}
                              <div>
                                  <div className="flex items-center gap-3">
                                      <h2 className="text-3xl font-black text-white tracking-tight">{activeTournament.name}</h2>
                                      {(activeTournament.completed || activeTournament.status === 'completed') && (
                                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs px-2.5 py-1 rounded-lg font-black uppercase tracking-wider flex items-center gap-1">
                                              🏁 Завершен (История)
                                          </span>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-4 text-xs font-bold text-white/60 mt-1">
                                      <span className="text-[#ff8f00] font-black">💰 Призовой фонд: {activeTournament.prizePool || '$100,000'}</span>
                                      <span>•</span>
                                      <span>Формат: {activeTournament.settings?.stage1Type === 'gsl_groups' ? 'GSL Группы (2 Этапа)' : activeTournament.settings?.stage1Type === 'swiss' ? 'Швейцарская система' : activeTournament.settings?.stage1Type === 'groups' ? 'Групповой этап' : 'Плей-офф'}</span>
                                      {activeTournament.winnerName && (
                                          <>
                                              <span>•</span>
                                              <span className="text-amber-400 font-black flex items-center gap-1">
                                                  👑 Чемпион: {activeTournament.winnerName}
                                              </span>
                                          </>
                                      )}
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-2">
                              {!isExporting && (
                                  <button
                                      onClick={toggleTournamentCompleted}
                                      className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                          activeTournament.completed || activeTournament.status === 'completed'
                                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                      }`}
                                  >
                                      {activeTournament.completed || activeTournament.status === 'completed' ? (
                                          <>🏁 В Истории (Завершен)</>
                                      ) : (
                                          <>🏆 Завершить и отправить в Историю</>
                                      )}
                                  </button>
                              )}
                          </div>
                      </div>
                      
                      {activeTournament.activeStage === 1 && activeTournament.settings.stage1Type === 'gsl_groups' && (
                          <GslGroupStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} onAdvanceToBracket={handleAdvanceToBracket} isExporting={isExporting} />
                      )}
                      {activeTournament.activeStage === 1 && (activeTournament.settings.stage1Type === 'groups' || (!activeTournament.settings.stage1Type && activeTournament.settings.mode === 'two_stage')) && (
                          <GroupStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} onAdvanceToBracket={handleAdvanceToBracket} />
                      )}
                      {activeTournament.activeStage === 1 && (activeTournament.settings.stage1Type === 'swiss' || (!activeTournament.settings.stage1Type && activeTournament.settings.mode === 'swiss')) && (
                          <SwissStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} onAdvanceToBracket={handleAdvanceToBracket} isExporting={isExporting} isSwapMode={isSwapMode} />
                      )}
                      {activeTournament.status === 'in_progress' && isTournamentFinished() && !isExporting && (
                          <div className="mt-12 flex justify-center animate-fade-in-up">
                              <button
                                  onClick={() => {
                                      let wName = '';
                                      if (activeTournament.tieredBracketRounds && activeTournament.tieredBracketRounds.length > 0) {
                                          const lastRound = activeTournament.tieredBracketRounds[activeTournament.tieredBracketRounds.length - 1];
                                          if (lastRound && lastRound.length > 0 && lastRound[0].winnerId) {
                                              wName = lastRound[0].winnerId === lastRound[0].team1?.id ? (lastRound[0].team1?.name || '') : (lastRound[0].team2 ? lastRound[0].team2.name : '');
                                          }
                                      } else if (activeTournament.settings.eliminationType === 'double') {
                                          if (activeTournament.grandFinal && activeTournament.grandFinal.length > 0) {
                                              const gf = activeTournament.grandFinal;
                                              if (gf[1] && gf[1].winnerId) {
                                                  wName = gf[1].winnerId === gf[1].team1?.id ? gf[1].team1.name : (gf[1].team2 ? gf[1].team2.name : '');
                                              } else if (gf[0].winnerId) {
                                                  wName = gf[0].winnerId === gf[0].team1?.id ? gf[0].team1.name : (gf[0].team2 ? gf[0].team2.name : '');
                                              }
                                          }
                                      } else {
                                          if (activeTournament.bracketRounds && activeTournament.bracketRounds.length > 0) {
                                              const lastRound = activeTournament.bracketRounds[activeTournament.bracketRounds.length - 1];
                                              if (lastRound && lastRound.length > 0 && lastRound[0].winnerId) {
                                                  wName = lastRound[0].winnerId === lastRound[0].team1?.id ? lastRound[0].team1.name : (lastRound[0].team2 ? lastRound[0].team2.name : '');
                                              }
                                          }
                                      }
                                      const t = { ...activeTournament, status: 'completed', winnerName: wName };
                                      saveTournament(userId, t);
                                      setTournaments(loadTournaments(userId));
                                      setActiveTournament(t);
                                      setShowTop20(true);
                                  }}
                                  className="px-12 py-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl font-black text-2xl uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:scale-105 transition-all hover:shadow-[0_0_60px_rgba(239,68,68,0.6)] flex flex-col items-center gap-2"
                              >
                                  <span>Завершить турнир</span>
                                  <span className="text-sm font-bold text-white/70">Подвести итоги и Топ-20</span>
                              </button>
                          </div>
                      )}

                      {activeTournament.activeStage === 2 && activeTournament.tieredBracketRounds && (
                          <TieredPlayoffStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} isExporting={isExporting} />
                      )}
        
                      {((activeTournament.activeStage === 2 && !activeTournament.tieredBracketRounds) || activeTournament.settings.stage1Type === 'playoff' || (!activeTournament.settings.stage1Type && activeTournament.settings.mode === 'single_stage')) && (
                          <SingleEliminationStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} isExporting={isExporting} isSwapMode={isSwapMode} />
                      )}
                  </div>
              </div>

              {/* Seeding Modal */}
              {isSeedingOpen && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                      <div className="bg-[#0b0b0f] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                          <div className="p-6 border-b border-white/5 flex items-center justify-between">
                              <div>
                                  <h3 className="font-black text-xl text-white flex items-center gap-2">
                                      🎲 Ручной посев команд
                                  </h3>
                                  <p className="text-xs text-white/40 mt-1">
                                      Настройте порядок команд для формирования сетки/групп.
                                  </p>
                              </div>
                              <button 
                                  onClick={() => setIsSeedingOpen(false)}
                                  className="p-2 hover:bg-white/5 text-white/50 hover:text-white rounded-xl transition-all cursor-pointer"
                              >
                                  <X className="w-5 h-5" />
                              </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
                               <div className="flex justify-between items-center mb-2">
                                   <span className="text-xs font-bold text-[#ff8f00] uppercase tracking-wider">
                                       Список команд (всего {seedingTeams.length})
                                   </span>
                                   <div className="flex items-center gap-2">
                                       <button
                                           onClick={pairFirstWithLastSeedingTeams}
                                           className="px-3 py-1 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 border border-[#ff8f00]/20 rounded-lg text-xs font-bold text-[#ff8f00] transition-all cursor-pointer"
                                           title="Распределить: 1-й против последнего, 2-й против предпоследнего и т.д."
                                       >
                                           👥 1-й против последнего
                                       </button>
                                       <button
                                           onClick={shuffleSeedingTeams}
                                           className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-all cursor-pointer"
                                       >
                                           🔀 Перемешать случайно
                                       </button>
                                   </div>
                               </div>

                              {seedingTeams.map((team, idx) => (
                                  <div 
                                      key={team.id}
                                      className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                                  >
                                      <div className="flex items-center gap-3">
                                          <span className="font-mono text-xs text-white/30 w-5">
                                              #{idx + 1}
                                          </span>
                                          <TeamLogo teamName={team.name} sizeClassName="w-6 h-6 shrink-0" />
                                          <span className="text-sm font-bold text-white truncate">
                                              {team.name}
                                          </span>
                                      </div>

                                      <div className="flex items-center gap-1">
                                          <button
                                              onClick={() => moveTeamUp(idx)}
                                              disabled={idx === 0}
                                              className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                              title="Вверх"
                                          >
                                              <ChevronUp className="w-4 h-4" />
                                          </button>
                                          <button
                                              onClick={() => moveTeamDown(idx)}
                                              disabled={idx === seedingTeams.length - 1}
                                              className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                              title="Вниз"
                                          >
                                              <ChevronDown className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                              ))}

                              {activeTournament?.settings?.stage1Type !== 'groups' && seedingTeams.length >= 2 && (() => {
                                  const matchCount = Math.floor(seedingTeams.length / 2);
                                  const pairs = [];
                                  for (let i = 0; i < matchCount; i++) {
                                      pairs.push({
                                          idx1: i * 2,
                                          idx2: i * 2 + 1,
                                          team1: seedingTeams[i * 2],
                                          team2: seedingTeams[i * 2 + 1]
                                      });
                                  }
                                  const hasBye = seedingTeams.length % 2 !== 0;
                                  const byeTeam = hasBye ? seedingTeams[seedingTeams.length - 1] : null;

                                  return (
                                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-3 mt-4">
                                          <div>
                                              <h4 className="text-xs font-black text-[#ff8f00] uppercase tracking-wider">
                                                  🤝 Соперники в матчах 1-го раунда
                                              </h4>
                                              <p className="text-[10px] text-white/40 mt-0.5">
                                                  Вы можете напрямую выбрать соперников для каждого матча:
                                              </p>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                              {pairs.map((pair, pIdx) => (
                                                  <div key={pIdx} className="bg-white/[0.01] border border-white/5 p-2.5 rounded-xl flex flex-col gap-1.5">
                                                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Матч {pIdx + 1}</span>
                                                      <div className="flex items-center gap-2">
                                                          <div className="flex-1 min-w-0">
                                                              <select
                                                                  value={pair.team1.id}
                                                                  onChange={async (e) => {
                                                                      const targetId = e.target.value;
                                                                      const targetIdx = seedingTeams.findIndex(t => t.id === targetId);
                                                                      if (targetIdx !== -1) {
                                                                          swapSeedingTeams(pair.idx1, targetIdx);
                                                                      }
                                                                  }}
                                                                  className="w-full bg-black border border-white/10 px-1.5 py-1 rounded text-xs font-bold text-white outline-none focus:border-[#ff8f00]/50"
                                                              >
                                                                  {seedingTeams.map(t => (
                                                                      <option key={t.id} value={t.id}>{t.name}</option>
                                                                  ))}
                                                              </select>
                                                          </div>
                                                          <span className="text-[9px] font-black text-[#ff8f00]/60">VS</span>
                                                          <div className="flex-1 min-w-0">
                                                              <select
                                                                  value={pair.team2.id}
                                                                  onChange={async (e) => {
                                                                      const targetId = e.target.value;
                                                                      const targetIdx = seedingTeams.findIndex(t => t.id === targetId);
                                                                      if (targetIdx !== -1) {
                                                                          swapSeedingTeams(pair.idx2, targetIdx);
                                                                      }
                                                                  }}
                                                                  className="w-full bg-black border border-white/10 px-1.5 py-1 rounded text-xs font-bold text-white outline-none focus:border-[#ff8f00]/50"
                                                              >
                                                                  {seedingTeams.map(t => (
                                                                      <option key={t.id} value={t.id}>{t.name}</option>
                                                                  ))}
                                                              </select>
                                                          </div>
                                                      </div>
                                                  </div>
                                              ))}

                                              {hasBye && byeTeam && (
                                                  <div className="bg-[#ff8f00]/5 border border-[#ff8f00]/10 p-2.5 rounded-xl flex flex-col gap-1.5 sm:col-span-2">
                                                      <span className="text-[9px] font-black text-[#ff8f00]/60 uppercase tracking-widest">Пропускает 1-й раунд (BYE)</span>
                                                      <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                                          <span className="text-xs font-bold text-white">{byeTeam.name}</span>
                                                          <select
                                                              value={byeTeam.id}
                                                              onChange={async (e) => {
                                                                  const targetId = e.target.value;
                                                                  const targetIdx = seedingTeams.findIndex(t => t.id === targetId);
                                                                  if (targetIdx !== -1) {
                                                                      swapSeedingTeams(seedingTeams.length - 1, targetIdx);
                                                                  }
                                                              }}
                                                              className="bg-black border border-white/10 px-1.5 py-1 rounded text-xs font-bold text-white outline-none focus:border-[#ff8f00]/50"
                                                          >
                                                              {seedingTeams.map(t => (
                                                                  <option key={t.id} value={t.id}>{t.name}</option>
                                                              ))}
                                                          </select>
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })()}
                          </div>

                          <div className="p-6 border-t border-white/5 bg-black/20 flex gap-3 justify-end">
                              <button
                                  onClick={() => setIsSeedingOpen(false)}
                                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-xl transition-all border border-white/5 cursor-pointer"
                              >
                                  Отмена
                              </button>
                              <button
                                  onClick={() => {
                                      handleRegenerateTournament(seedingTeams);
                                      setIsSeedingOpen(false);
                                  }}
                                  className="px-5 py-2 bg-[#ff8f00] hover:bg-[#ffa733] text-black font-black text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(255,143,0,0.2)] cursor-pointer"
                              >
                                  Сохранить и применить
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {showTop20 && activeTournament && (
                  <Top20Modal
                      user={user}
                      tournamentId={activeTournament.id}
                      onClose={() => setShowTop20(false)}
                  />
              )}

              {showFinalists && activeTournament && (
                  <FinalistsModal
                      user={user}
                      tournamentId={activeTournament.id}
                      onClose={() => setShowFinalists(false)}
                  />
              )}

              {showMvpModal && activeTournament && (
                  <MvpModal
                      user={user}
                      tournamentId={activeTournament.id}
                      onClose={() => setShowMvpModal(false)}
                  />
              )}
          </div>
      );
  }

  if (isCreating) {
      return (
          <div className="w-full max-w-4xl mx-auto">
              <button onClick={() => setIsCreating(false)} className="flex items-center gap-2 text-white/50 hover:text-white mb-6">
                  <ArrowLeft className="w-4 h-4" /> Отмена
              </button>
              <h2 className="text-3xl font-black mb-8">Создать турнир</h2>
              {creationError && (
                  <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-xl mb-6 text-center font-bold animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                      {creationError}
                  </div>
              )}
              <TournamentSettingsForm user={user} onSave={handleCreate} submitLabel="Создать и Начать" />
          </div>
      );
  }

  const filteredTournaments = tournaments.filter(t => 
    activeTabList === 'completed' ? (t.completed || (t as any).status === 'completed') : (!t.completed && (t as any).status !== 'completed')
  );

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3 text-white">
              <Trophy className="text-[#ff8f00] w-8 h-8" /> Турнирный Хаб
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Текущие чемпионаты и исторический архив завершенных турниров
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setActiveTabList('active')}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTabList === 'active' 
                  ? 'bg-[#ff8f00] text-black shadow-[0_0_15px_rgba(255,143,0,0.3)]' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              🏆 Активные ({tournaments.filter(t => !t.completed && (t as any).status !== 'completed').length})
            </button>
            <button 
              onClick={() => setActiveTabList('completed')}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTabList === 'completed' 
                  ? 'bg-[#ff8f00] text-black shadow-[0_0_15px_rgba(255,143,0,0.3)]' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              📜 История ({tournaments.filter(t => t.completed || (t as any).status === 'completed').length})
            </button>
          </div>

          <button 
            onClick={() => setIsCreating(true)} 
            className="bg-[#ff8f00] text-black px-5 py-2.5 rounded-xl font-black uppercase tracking-wider flex items-center gap-2 hover:bg-[#ffa733] transition-colors shadow-[0_0_15px_rgba(255,143,0,0.3)] cursor-pointer text-xs"
          >
              <Plus className="w-4 h-4" /> Создать турнир
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTournaments.map(t => {
              const rawTBg = t.settings?.bgImage;
              const cardBgImg = (rawTBg && rawTBg !== 'null' && rawTBg !== 'undefined' && String(rawTBg).trim() !== '') ? rawTBg : null;
              const cardThemeKey = t.settings?.bgTheme || 'cyber_grid';
              const cardTheme = BG_THEMES[cardThemeKey as keyof typeof BG_THEMES] || BG_THEMES.cyber_grid;

              return (
              <div 
                key={t.id} 
                onClick={() => setActiveTournament(t)} 
                className="bg-[#12121a] p-6 rounded-2xl border border-white/5 shadow-xl hover:border-[#ff8f00]/50 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                  {/* Background Layer Preview */}
                  {cardBgImg ? (
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none" 
                        style={{ backgroundImage: `url(${cardBgImg})` }} 
                      />
                  ) : (
                      <div 
                        className={`absolute inset-0 opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none ${cardTheme.className}`} 
                        style={cardTheme.style} 
                      />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/80 to-transparent pointer-events-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff8f00]/5 rounded-full blur-2xl group-hover:bg-[#ff8f00]/15 transition-all pointer-events-none" />

                  <div>
                    <div className="flex justify-between items-start mb-4 gap-3">
                        <div className="flex items-center gap-3">
                          {t.logoUrl ? (
                            <img 
                              src={t.logoUrl} 
                              alt={t.name} 
                              className="w-12 h-12 object-contain rounded-xl border border-white/10 bg-black/60 p-1 shadow-md"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#18192a] border border-white/10 flex items-center justify-center text-[#ff8f00] font-black text-xl shadow-md flex-shrink-0">
                                ?
                            </div>
                          )}
                          <div>
                            <h3 className="font-black text-xl text-white group-hover:text-[#ff8f00] transition-colors line-clamp-1">{t.name || 'Без названия'}</h3>
                            <span className="text-[#ff8f00] text-xs font-black">💰 Призовой: {t.prizePool || '$100,000'}</span>
                          </div>
                        </div>

                        <button 
                          onClick={(e) => handleDelete(e, t.id)} 
                          className="text-white/20 hover:text-red-500 transition-colors z-10 relative p-1"
                          title="Удалить турнир"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    {(t.completed || (t as any).status === 'completed' || t.winnerName) && (
                      <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center gap-2">
                        <span className="text-amber-400 text-lg">👑</span>
                        <div>
                          <div className="text-[10px] font-black text-amber-400/80 uppercase tracking-wider">Победитель</div>
                          <div className="text-sm font-black text-white">{t.winnerName || 'Определяется'}</div>
                        </div>
                      </div>
                    )}

                    <div className="text-white/50 text-xs flex flex-col gap-1.5">
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Формат:</span>
                          <span className="text-white font-bold">{t.settings?.stage1Type === 'swiss' ? 'Швейцарская система' : t.settings?.stage1Type === 'groups' ? 'Групповой этап' : 'Плей-офф'}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Команд:</span>
                          <span className="text-white font-bold">{t.teams?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Статус:</span>
                          <span className={`font-black ${t.completed || (t as any).status === 'completed' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {t.completed || (t as any).status === 'completed' ? '🏁 Завершен (В истории)' : '🔴 Активен'}
                          </span>
                        </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#ff8f00] group-hover:translate-x-1 transition-transform">
                    <span>Открыть интерактивную сетку →</span>
                  </div>
              </div>
            );
          })}

          {filteredTournaments.length === 0 && (
              <div className="col-span-full py-16 text-center text-white/40 border-2 border-dashed border-white/10 rounded-2xl bg-[#12121a]/50">
                  <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="font-bold text-lg text-white/60 mb-1">
                    {activeTabList === 'completed' ? 'В истории пока нет завершенных турниров' : 'У вас нет активных турниров'}
                  </p>
                  <p className="text-xs text-white/40 max-w-md mx-auto">
                    {activeTabList === 'completed' 
                      ? 'Завершите активный турнир, чтобы он сохранился в истории результатов и наград.' 
                      : 'Создайте свой первый турнир прямо сейчас!'}
                  </p>
              </div>
          )}
      </div>
    </div>
  );
}
