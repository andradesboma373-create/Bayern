import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Bookmark, Play, Layers, Plus, Check, Trash2, ArrowLeft, Settings, Download, Image as ImageIcon, X, ChevronUp, ChevronDown, ZoomIn, ZoomOut, RotateCcw, Sliders, Palette, Sparkles, Award, Undo2, Users, ArrowLeftRight, Layout, Database, Save, Search, Shuffle, Calendar, Filter, Clock, User, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { Tournament, TournamentSettings, Team, Match, Group, TournamentStageConfig } from './types';
import { loadTournaments, saveTournament, deleteTournament, getTournamentBgImage, setTournamentBgImage, setTournamentLogoUrl, syncTournamentsWithServer, normalizeTournament } from './storage';
import SingleEliminationStage from './SingleEliminationStage';
import GroupStage from './GroupStage';
import SwissStage from './SwissStage';
import GslGroupStage from './GslGroupStage';
import TieredPlayoffStage from './TieredPlayoffStage';
import QualifierStage from './QualifierStage';
import TournamentSettingsForm from './TournamentSettingsForm';
import MatchCard from './MatchCard';
import { generateDoubleElimination, cascadeAdvancements, advanceDoubleElimMatch, BYE_TEAM, getBalancedSeeding } from './doubleEliminationLogic';
import { generateNextSwissRound } from './swissLogic';
import { generateGslGroups, generateTieredPlayoffBracket, generateTieredPlayoffFromStandings, getGslGroupStandings, updateGslMatch, advanceTieredPlayoffMatch } from './gslLogic';
import TeamLogo from '../TeamLogo';
import { concentrateOnTournament, preloadImage, isImagePreloaded } from '../../lib/tournamentPreloader';
import { downloadElementAsImage } from '../../lib/exportImage';
import Top20Modal from './Top20Modal';
import LeadersModal from './LeadersModal';
import FinalistsModal from './FinalistsModal';
import MvpModal from './MvpModal';
import { TournamentStyleModal } from './TournamentStyleModal';
import { TournamentFinalView } from './TournamentFinalView';
import { DownloadBracketModal } from './DownloadBracketModal';
import { getAutoMatchedVectorLogo } from '../../lib/logoMatcher';
import { optimizeImageForUpload } from '../../lib/imageOptimizer';
import { safeLocalStorageSet, shuffleArray } from '../../lib/utils';
import { getCanonicalRoomId } from './storage';
import { useGameUniverse } from '../../lib/gameUniverse';
import So2MediaLibraryModal from '../So2MediaLibraryModal';
import { syncAndBackfillTournamentMatches, recordTournamentMatchResult } from '../../lib/tournamentMatchRecorder';
import { refreshMapPools } from '../../lib/simulation';
import { generateStageData, advanceTeamsToStage, getStageAdvancingTeams } from './stageGenerator';

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
    watermark: 'ESPORTS ARENA'
  },
  esports_arena: {
    id: 'esports_arena',
    name: '🏟️ Кибер-Арена',
    className: 'bg-[#070913]',
    style: {
      backgroundImage: `
        radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.16) 0%, transparent 70%),
        radial-gradient(ellipse at 50% 100%, rgba(139, 92, 246, 0.12) 0%, transparent 60%),
        radial-gradient(circle at 20% 40%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 80% 40%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
        linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 100% 100%, 48px 48px, 48px 48px',
    },
    overlay: null,
    watermark: 'CHAMPIONSHIP'
  },
  carbon_gold: {
    id: 'carbon_gold',
    name: '🔱 Золотой Подиум',
    className: 'bg-[#08080a]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 50% 50%, rgba(255, 184, 0, 0.08) 0%, transparent 60%),
        radial-gradient(circle at 10% 10%, rgba(255, 184, 0, 0.04) 0%, transparent 35%),
        radial-gradient(circle at 90% 90%, rgba(255, 184, 0, 0.04) 0%, transparent 35%),
        radial-gradient(rgba(255, 184, 0, 0.12) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 24px 24px',
    },
    overlay: null,
    watermark: 'GRAND FINAL'
  },
  cosmic_arena: {
    id: 'cosmic_arena',
    name: '🌌 Космос',
    className: 'bg-[#030206]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 15% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 55%),
        radial-gradient(circle at 85% 75%, rgba(236, 72, 153, 0.12) 0%, transparent 55%),
        radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.06) 0%, transparent 50%),
        linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 50px 50px, 50px 50px',
    },
    overlay: null,
    watermark: 'PLAYOFFS'
  },
  neon_pulse: {
    id: 'neon_pulse',
    name: '⚡ Неоновый Пульс',
    className: 'bg-[#040810]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 50% 20%, rgba(6, 182, 212, 0.14) 0%, transparent 60%),
        radial-gradient(circle at 80% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 50%),
        linear-gradient(to right, rgba(6, 182, 212, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(6, 182, 212, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px',
    },
    overlay: null,
    watermark: 'CYBER ARENA'
  },
  crimson_stage: {
    id: 'crimson_stage',
    name: '🔥 Багровая Сцена',
    className: 'bg-[#080304]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 50% 15%, rgba(239, 68, 68, 0.15) 0%, transparent 65%),
        radial-gradient(circle at 15% 85%, rgba(185, 28, 28, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 85% 85%, rgba(249, 115, 22, 0.06) 0%, transparent 50%),
        linear-gradient(to right, rgba(239, 68, 68, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(239, 68, 68, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 36px 36px, 36px 36px',
    },
    overlay: null,
    watermark: 'MAJOR'
  },
  dark_minimalist: {
    id: 'dark_minimalist',
    name: '🖤 Темный Минимал',
    className: 'bg-[#040406]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 50% 50%, #0d0e14 0%, #040406 100%)
      `,
      backgroundSize: '100% 100%',
    },
    overlay: null,
    watermark: ''
  },
  titanium_stealth: {
    id: 'titanium_stealth',
    name: '🛡️ Титановый Стелс',
    className: 'bg-[#06080c]',
    style: {
      backgroundImage: `
        radial-gradient(circle at 50% 40%, rgba(148, 163, 184, 0.08) 0%, transparent 60%),
        radial-gradient(circle at 10% 90%, rgba(100, 116, 139, 0.05) 0%, transparent 40%),
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px',
    },
    overlay: null,
    watermark: 'TITANIUM'
  }
};

export function getCleanTournamentTheme(themeKey?: string) {
  if (!themeKey) return BG_THEMES.cyber_grid;
  if (themeKey in BG_THEMES) {
    return BG_THEMES[themeKey as keyof typeof BG_THEMES];
  }
  return BG_THEMES.cyber_grid;
}

export default function TournamentManager({ user, tournamentId, onBack }: { user: any, tournamentId?: string, onBack?: () => void }) {
  const userId = user?.uid || 'guest';
  const navigate = useNavigate();
  const [activeGame, setActiveGame, gameInfo] = useGameUniverse();
  const [showSo2Folder, setShowSo2Folder] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Initialize activeTournament if tournamentId prop is provided
  useEffect(() => {
    if (tournamentId && tournaments.length > 0) {
      const found = tournaments.find(t => t.id === tournamentId);
      if (found) {
        setActiveTournament(found);
      } else {
        // Fallback: If not found in primary list, try to load isolated item
        const roomId = getCanonicalRoomId(userId);
        const raw = localStorage.getItem(`tournament_item_${roomId}_${tournamentId}`);
        if (raw) {
          try {
             setActiveTournament(normalizeTournament(JSON.parse(raw)));
          } catch(e) {}
        }
      }
    }
  }, [tournamentId, tournaments, userId]);
  const [templateForCreation, setTemplateForCreation] = useState<Tournament | null>(null);
  const [creationError, setCreationError] = useState('');
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [activeTabList, setActiveTabList] = useState<'active' | 'completed' | 'templates'>('active');
  const [isConfirmingSave, setIsConfirmingSave] = useState<{ name: string; settings: TournamentSettings; teams: Team[]; logoUrl?: string; prizePool?: string } | null>(null);
  
  const stageRef = useRef<HTMLDivElement>(null);
  const isolatedBg = activeTournament ? getTournamentBgImage(activeTournament.id) : null;
  const rawBg = isolatedBg || activeTournament?.settings?.bgImage;
  // Ensure tournament background is NEVER a map background
  const isMapBg = rawBg && (String(rawBg).includes('/maps/') || String(rawBg).startsWith('/maps/'));
  const bgImage = (!isMapBg && rawBg && rawBg !== 'null' && rawBg !== 'undefined' && String(rawBg).trim() !== '') ? rawBg : null;
  const defaultTheme = 'cyber_grid';
  let rawTheme = activeTournament?.settings?.bgTheme;
  if (!rawTheme || rawTheme.startsWith('cs2_') || rawTheme.startsWith('so2_')) {
    rawTheme = 'cyber_grid';
  }
  const bgTheme = rawTheme || (bgImage ? 'custom' : defaultTheme);
  const [isBgLoaded, setIsBgLoaded] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [mapsUpdateTrigger, setMapsUpdateTrigger] = useState(0);
  const [showTop20, setShowTop20] = useState(false);
  const [showLeaders, setShowLeaders] = useState(false);
  const [showFinalists, setShowFinalists] = useState(false);
  const [showFinalMatchView, setShowFinalMatchView] = useState(false);
  const [showMvpModal, setShowMvpModal] = useState(false);
  const [showRosters, setShowRosters] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [isSeedingOpen, setIsSeedingOpen] = useState(false);
  const [seedingTeams, setSeedingTeams] = useState<Team[]>([]);
  const [historyStack, setHistoryStack] = useState<Tournament[]>([]);
  const [isSavingBracket, setIsSavingBracket] = useState(false);
  const [saveBracketSuccess, setSaveBracketSuccess] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [exportOptimize, setExportOptimize] = useState(true);
  const [exportLoadingType, setExportLoadingType] = useState<string | null>(null);
  const [exportProgressText, setExportProgressText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuickGrid, setIsQuickGrid] = useState(false);

  const handleDownloadPdf = async (optimized: boolean = true) => {
    if (!stageRef.current || !activeTournament) return;
    setExportLoadingType('pdf');
    setExportProgressText(optimized ? 'Оптимизация разметки и сжатие...' : 'Рендеринг сетки в Ultra-HD качестве...');
    try {
      const { exportElementToDataUrl } = await import('../../lib/exportImage');
      const dataUrl = await exportElementToDataUrl(stageRef.current, { 
        backgroundColor: '#050508',
        quality: optimized ? 0.88 : 1.0,
        pixelRatio: optimized ? 1.5 : 2.0,
        onProgress: (status) => setExportProgressText(status)
      });
      
      if (dataUrl) {
        setExportProgressText('Сборка PDF документа...');
        const { jsPDF } = await import('jspdf');
        const w = Math.max(800, Math.round(stageRef.current.scrollWidth * 0.75));
        const h = Math.max(600, Math.round(stageRef.current.scrollHeight * 0.75));
        const pdf = new jsPDF({
          orientation: w >= h ? 'l' : 'p',
          unit: 'px',
          format: [w, h],
          compress: true
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgFormat = dataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
        pdf.addImage(dataUrl, imgFormat, 0, 0, pdfWidth, pdfHeight, undefined, optimized ? 'FAST' : 'SLOW');
        
        const cleanName = (activeTournament.name || 'tournament').replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${cleanName}_bracket.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

        setSaveToastMessage("PDF с сеткой успешно скачан!");
        setTimeout(() => setSaveToastMessage(null), 3000);
      }
      setShowDownloadModal(false);
    } catch (err: any) {
      console.error("PDF Export error:", err);
      setSaveToastMessage("Ошибка создания PDF: " + (err?.message || 'Попробуйте PNG'));
      setTimeout(() => setSaveToastMessage(null), 4000);
    } finally {
      setExportLoadingType(null);
      setExportProgressText('');
    }
  };

  const handleDownloadPng = async (optimized: boolean = true) => {
    if (!stageRef.current || !activeTournament) return;
    setExportLoadingType('png');
    setExportProgressText('Подготовка изображения...');
    try {
      const { downloadElementAsImage } = await import('../../lib/exportImage');
      const filename = `${(activeTournament.name || 'tournament').replace(/\s+/g, '_')}_bracket.png`;
      await downloadElementAsImage(stageRef.current, filename, {
        backgroundColor: '#050508',
        quality: optimized ? 0.9 : 1.0,
        pixelRatio: optimized ? 1.5 : 2.0,
        onProgress: (status) => setExportProgressText(status)
      });
      setSaveToastMessage("Изображение сетки успешно скачано!");
      setTimeout(() => setSaveToastMessage(null), 3000);
      setShowDownloadModal(false);
    } catch (err: any) {
      console.error("PNG Export error:", err);
      setSaveToastMessage("Ошибка при скачивании PNG: " + (err?.message || 'Попробуйте обновить страницу'));
      setTimeout(() => setSaveToastMessage(null), 4000);
    } finally {
      setExportLoadingType(null);
      setExportProgressText('');
    }
  };

  const handleDownloadJson = () => {
    if (!activeTournament) return;
    const dataStr = JSON.stringify(activeTournament, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(activeTournament.name || 'tournament').replace(/\s+/g, '_')}_data.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveToastMessage("JSON данные турнира скачаны!");
    setTimeout(() => setSaveToastMessage(null), 3000);
    setShowDownloadModal(false);
  };

  const handleDownloadAll = async () => {
    setExportLoadingType('all');
    try {
      await handleDownloadPng(exportOptimize);
      await handleDownloadPdf(exportOptimize);
      handleDownloadJson();
    } finally {
      setExportLoadingType(null);
    }
  };

  const handleManualSaveBracket = () => {
    if (!activeTournament) return;
    setIsSavingBracket(true);
    try {
      handleUpdateActive(activeTournament);
      setSaveBracketSuccess(true);
      setSaveToastMessage("Сетка турнира успешно сохранена в базу данных!");
      setTimeout(() => {
        setSaveBracketSuccess(false);
        setSaveToastMessage(null);
      }, 3000);
    } catch (e: any) {
      alert("Ошибка при сохранении сетки: " + (e?.message || e));
    } finally {
      setIsSavingBracket(false);
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && activeTournament) {
          const file = e.target.files[0];
          try {
             const dataUrl = await optimizeImageForUpload(file, 'background');
             if (dataUrl) {
                setTournamentBgImage(activeTournament.id, dataUrl);
                const newT = { ...activeTournament, settings: { ...activeTournament.settings, bgImage: dataUrl, bgTheme: 'custom' } };
                handleUpdateActive(newT);
             }
          } catch (err) {
             console.error("Background image optimization failed:", err);
          }
      }
  };

  const handleThemeSelect = (themeId: string) => {
      if (activeTournament) {
          setTournamentBgImage(activeTournament.id, null);
          const newSettings = { ...activeTournament.settings, bgTheme: themeId, bgImage: undefined };
          handleUpdateActive({ ...activeTournament, settings: newSettings });
      }
  };

  const activeTheme = BG_THEMES[bgTheme as keyof typeof BG_THEMES] || BG_THEMES.cyber_grid;

  const hasStarted = (() => {
    if (!activeTournament) return false;
    // Check groups
    if (Array.isArray(activeTournament.groups) && activeTournament.groups.length > 0) {
      if (activeTournament.groups.some(g => Array.isArray(g?.matches) && g.matches.some(m => m.winnerId))) return true;
    }
    // Check swiss
    if (Array.isArray(activeTournament.swissRounds) && activeTournament.swissRounds.length > 0) {
      if (activeTournament.swissRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId))) return true;
    }
    // Check playoffs
    if (Array.isArray(activeTournament.bracketRounds) && activeTournament.bracketRounds.length > 0) {
      if (activeTournament.bracketRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId))) return true;
    }
    if (Array.isArray(activeTournament.losersBracketRounds) && activeTournament.losersBracketRounds.length > 0) {
      if (activeTournament.losersBracketRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId))) return true;
    }
    return false;
  })();

  useEffect(() => {
    setTournaments(loadTournaments(userId, true));
    // Only sync if we don't have local data yet or to merge updates
    syncTournamentsWithServer(userId).then(synced => {
      if (synced && synced.length > 0) {
        setTournaments(prev => {
          // If we have local data, prefer it for now to avoid reversion
          if (prev.length > 0) return prev;
          return synced;
        });
      }
    });

    const handleSync = () => {
      setTournaments(loadTournaments(userId, true));
    };
    window.addEventListener('tournaments-updated', handleSync);
    return () => window.removeEventListener('tournaments-updated', handleSync);
  }, [userId]);

  // Load and inject custom maps from server
  useEffect(() => {
    fetch('/api/maps/list')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        console.log("[Client] Maps list data received:", data);
        if (data && data.cs2 && data.s2) {
          refreshMapPools(data.cs2, data.s2);
          setMapsUpdateTrigger(prev => prev + 1);
        }
      })
      .catch(err => console.warn("Failed to load maps list from server:", err));
  }, []);

  useEffect(() => {
    if (!activeTournament?.id) {
      setHistoryStack([]);
      return;
    }
    try {
      const stored = sessionStorage.getItem(`t_history_${activeTournament.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistoryStack(parsed);
          return;
        }
      }
    } catch (e) {}
    setHistoryStack([]);
  }, [activeTournament?.id]);

  // Full concentration on tournament assets
  useEffect(() => {
    if (activeTournament) {
      concentrateOnTournament(activeTournament, userId);
    }
  }, [activeTournament?.id, userId]);

  // High-performance background image preloading & smooth presentation
  useEffect(() => {
    if (!bgImage) {
      setIsBgLoaded(false);
      return;
    }
    if (isImagePreloaded(bgImage)) {
      setIsBgLoaded(true);
      return;
    }
    let active = true;
    setIsBgLoaded(false);
    preloadImage(bgImage).then((loaded) => {
      if (active && loaded) {
        setIsBgLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [bgImage]);

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
      currentRound.push({ id: `r0-m${mIdx}`, team1: t1, team2: BYE_TEAM, score1: 0, score2: 0, winnerId: t1.id });
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
          const advanceCount = settings.gslAdvanceCount || 3;
          const orderedTeams = settings.seedingType === 'random' 
            ? shuffleArray(teams) 
            : (settings.seedingType === 'skill' ? getBalancedSeeding(teams) : [...teams]);
          initialGslGroups = generateGslGroups(orderedTeams, numGroups, settings.groupAssignments, advanceCount);
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
          
          if (settings.groupAssignments && Object.keys(settings.groupAssignments).length > 0) {
              const teamMap = new Map(teams.map(t => [t.id, t]));
              initialGroups.forEach((grp, idx) => {
                  const assignedIds = settings.groupAssignments![grp.id] || settings.groupAssignments![`gsl-group-${idx}`] || [];
                  assignedIds.forEach(tId => {
                      const tObj = teamMap.get(tId);
                      if (tObj) grp.teams.push(tObj);
                  });
              });
          } else {
              const shuffled = settings.seedingType === 'random' 
                ? shuffleArray(teams) 
                : (settings.seedingType === 'skill' ? getBalancedSeeding(teams) : [...teams]);
              shuffled.forEach((team, idx) => {
                  initialGroups[idx % numGroups].teams.push(team);
              });
          }

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
          const orderedTeams = (settings.seedingType === 'random') 
            ? shuffleArray(teams) 
            : (settings.seedingType === 'skill' ? getBalancedSeeding(teams) : [...teams]);
          const firstRound = generateNextSwissRound(orderedTeams, [], settings.swissWinsToAdvance || 3, settings.swissLossesToEliminate || 3);
          if (firstRound) initialSwissRounds.push(firstRound);
      } else {
          const shuffled = (settings.seedingType === 'random') 
            ? shuffleArray(teams) 
            : (settings.seedingType === 'skill' ? getBalancedSeeding(teams) : [...teams]);
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
    const tourneyGame = settings.game || activeGame;
    const finalSettings = { ...settings, game: tourneyGame };
    const { initialGroups, initialBracket, initialLosersBracket, initialGrandFinal, initialSwissRounds, initialGslGroups } = generateInitialData(finalSettings, teams);

    // Initialize first stage config for Beta/Multi-stage compatibility
    const initialStage: TournamentStageConfig = {
        id: 'stage_1',
        name: settings.mode === 'swiss' ? 'Швейцарская система' : (settings.mode === 'two_stage' ? 'Групповой этап' : 'Основная сетка'),
        type: (settings.stage1Type as any) || (settings.mode === 'swiss' ? 'swiss' : (settings.mode === 'two_stage' ? 'groups' : 'playoff')),
        teams: [...teams],
        groups: initialGroups.length > 0 ? initialGroups : undefined,
        gslGroups: initialGslGroups.length > 0 ? initialGslGroups : undefined,
        bracketRounds: initialBracket.length > 0 ? initialBracket : undefined,
        losersBracketRounds: initialLosersBracket.length > 0 ? initialLosersBracket : undefined,
        grandFinal: initialGrandFinal.length > 0 ? initialGrandFinal : undefined,
        swissRounds: initialSwissRounds.length > 0 ? initialSwissRounds : undefined
    };

    const finalSettingsWithStages = {
        ...finalSettings,
        stages: settings.stages && settings.stages.length > 0 ? settings.stages : [initialStage]
    };

    const t: Tournament = {
      id: Date.now().toString(),
      name,
      logoUrl,
      game: tourneyGame,
      prizePool: prizePool || (tourneyGame === 'so2' ? '1,500,000 ₽' : '$100,000'),
      createdAt: Date.now(),
      settings: finalSettingsWithStages,
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

      // CRITICAL: Ensure all teams from the tournament exist in the room's global teams so they never disappear
      try {
        const roomId = getCanonicalRoomId(userId);
        const storedRaw = localStorage.getItem(`teams_${roomId}`) || localStorage.getItem(`teams_${userId}`);
        let currentRoomTeams: any[] = [];
        try { currentRoomTeams = storedRaw ? JSON.parse(storedRaw) : []; } catch (e) {}

        let addedAny = false;
        if (Array.isArray(currentRoomTeams)) {
          for (const tItem of teams) {
            if (tItem && tItem.name && !currentRoomTeams.some((ct: any) => ct && ct.name && ct.name.toLowerCase() === tItem.name.trim().toLowerCase())) {
              const autoLogo = tItem.logoUrl || getAutoMatchedVectorLogo(tItem.name.trim());
              currentRoomTeams.push({
                id: 't_' + tItem.id,
                name: tItem.name.trim(),
                channelId: roomId,
                userId: roomId,
                logoUrl: autoLogo || '',
                isAcademy: false,
                players: [],
                balance: 0,
                leader: '',
                createdAt: new Date().toISOString()
              });
              addedAny = true;
            }
          }
        }
        if (addedAny) {
          safeLocalStorageSet(`teams_${roomId}`, currentRoomTeams);
          if (roomId !== userId) safeLocalStorageSet(`teams_${userId}`, currentRoomTeams);
          window.dispatchEvent(new Event("db-user-updated"));
          fetch('/api/sync-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: roomId, teams: currentRoomTeams })
          }).catch(() => {});
        }
      } catch (e) {}
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

  const canUndoTournament = (t?: Tournament | null): boolean => {
    if (!t) return false;
    if (t.activeStage === 2 && (t.swissRounds || t.groups)) return true;
    if (Array.isArray(t.swissRounds) && (t.swissRounds.length > 1 || (Array.isArray(t.swissRounds[0]) && t.swissRounds[0].some(m => m.winnerId)))) return true;
    if (Array.isArray(t.tieredBracketRounds) && t.tieredBracketRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId))) return true;
    if (Array.isArray(t.bracketRounds) && t.bracketRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId))) return true;
    if (Array.isArray(t.losersBracketRounds) && t.losersBracketRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId))) return true;
    if (Array.isArray(t.grandFinal) && t.grandFinal.some(m => m.winnerId)) return true;
    if (Array.isArray(t.groups) && t.groups.some(g => Array.isArray(g?.matches) && g.matches.some(m => m.winnerId))) return true;
    return false;
  };

  const handleUndoTournamentRounds = (steps: number = 1) => {
    if (!activeTournament) return;

    let updated: Tournament = JSON.parse(JSON.stringify(activeTournament));
    let didChange = false;

    const isStage2 = updated.activeStage === 2;
    const hasSwissStage1 = Boolean(updated.swissRounds && updated.swissRounds.length > 0);
    const hasGroupsStage1 = Boolean(updated.groups && updated.groups.length > 0);

    const hasPlayedTieredMatch = Boolean(Array.isArray(updated.tieredBracketRounds) && updated.tieredBracketRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId)));
    const hasPlayedSingleMatch = Boolean(Array.isArray(updated.bracketRounds) && updated.bracketRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId)));
    const hasPlayedDoubleMatch = Boolean(
      (Array.isArray(updated.bracketRounds) && updated.bracketRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId))) ||
      (Array.isArray(updated.losersBracketRounds) && updated.losersBracketRounds.some(r => Array.isArray(r) && r.some(m => m.winnerId))) ||
      (Array.isArray(updated.grandFinal) && updated.grandFinal.some(m => m.winnerId))
    );

    const isDouble = updated.settings?.eliminationType === 'double';

    // 1. Stage 2 -> Stage 1 transition rollback (if no playoff matches played yet)
    if (isStage2 && (hasSwissStage1 || hasGroupsStage1) && !hasPlayedTieredMatch && !hasPlayedSingleMatch && !hasPlayedDoubleMatch) {
      updated.activeStage = 1;
      didChange = true;
    }
    // 2. Double Elimination Bracket rollback
    else if (isDouble && (hasPlayedDoubleMatch || updated.grandFinal?.length)) {
      let wBracket = updated.bracketRounds ? JSON.parse(JSON.stringify(updated.bracketRounds)) : [];
      let lBracket = updated.losersBracketRounds ? JSON.parse(JSON.stringify(updated.losersBracketRounds)) : [];
      let gFinal = updated.grandFinal ? JSON.parse(JSON.stringify(updated.grandFinal)) : [];

      if (Array.isArray(gFinal) && gFinal.some((m: any) => m.winnerId)) {
        gFinal = gFinal.map((m: any) => ({
          ...m,
          winnerId: null,
          score1: undefined,
          score2: undefined,
          maps: undefined,
          team1Stats: undefined,
          team2Stats: undefined,
          completed: false
        }));
        didChange = true;
      } else {
        for (let i = lBracket.length - 1; i >= 0; i--) {
          if (Array.isArray(lBracket[i]) && lBracket[i].some((m: any) => m.winnerId)) {
            lBracket[i] = lBracket[i].map((m: any) => ({
              ...m,
              winnerId: null,
              score1: undefined,
              score2: undefined,
              maps: undefined,
              team1Stats: undefined,
              team2Stats: undefined,
              completed: false
            }));
            didChange = true;
            break;
          }
        }
        if (!didChange) {
          for (let i = wBracket.length - 1; i >= 0; i--) {
            if (Array.isArray(wBracket[i]) && wBracket[i].some((m: any) => m.winnerId)) {
              wBracket[i] = wBracket[i].map((m: any) => ({
                ...m,
                winnerId: null,
                score1: undefined,
                score2: undefined,
                maps: undefined,
                team1Stats: undefined,
                team2Stats: undefined,
                completed: false
              }));
              didChange = true;
              break;
            }
          }
        }
      }

      if (didChange) {
        const cascaded = cascadeAdvancements(wBracket, lBracket, gFinal);
        updated.bracketRounds = cascaded.winnersBracket;
        updated.losersBracketRounds = cascaded.losersBracket;
        updated.grandFinal = cascaded.grandFinal;
      }
    }
    // 3. Tiered Playoff Bracket rollback
    else if (updated.tieredBracketRounds && updated.tieredBracketRounds.length > 0 && hasPlayedTieredMatch) {
      const rounds = updated.tieredBracketRounds.map(r => r.map(m => ({ ...m })));
      let targetRoundIdx = -1;
      for (let i = rounds.length - 1; i >= 0; i--) {
        if (Array.isArray(rounds[i]) && rounds[i].some(m => m.winnerId)) {
          targetRoundIdx = i;
          break;
        }
      }

      if (targetRoundIdx !== -1) {
        rounds[targetRoundIdx] = rounds[targetRoundIdx].map(m => ({
          ...m,
          winnerId: null,
          score1: undefined,
          score2: undefined,
          maps: undefined,
          team1Stats: undefined,
          team2Stats: undefined,
          completed: false
        }));

        for (let nextR = targetRoundIdx + 1; nextR < rounds.length; nextR++) {
          rounds[nextR] = rounds[nextR].map(m => ({
            ...m,
            team1: undefined,
            team2: undefined,
            winnerId: null,
            score1: undefined,
            score2: undefined,
            maps: undefined,
            team1Stats: undefined,
            team2Stats: undefined,
            completed: false
          }));
        }
        updated.tieredBracketRounds = rounds;
        didChange = true;
      }
    }
    // 4. Single Elimination Bracket rollback
    else if (updated.bracketRounds && updated.bracketRounds.length > 0 && hasPlayedSingleMatch) {
      const rounds = updated.bracketRounds.map(r => r.map(m => ({ ...m })));
      let targetRoundIdx = -1;
      for (let i = rounds.length - 1; i >= 0; i--) {
        if (Array.isArray(rounds[i]) && rounds[i].some(m => m.winnerId)) {
          targetRoundIdx = i;
          break;
        }
      }

      if (targetRoundIdx !== -1) {
        rounds[targetRoundIdx] = rounds[targetRoundIdx].map(m => ({
          ...m,
          winnerId: null,
          score1: undefined,
          score2: undefined,
          maps: undefined,
          team1Stats: undefined,
          team2Stats: undefined,
          completed: false
        }));

        for (let nextR = targetRoundIdx + 1; nextR < rounds.length; nextR++) {
          rounds[nextR] = rounds[nextR].map(m => ({
            ...m,
            team1: undefined,
            team2: undefined,
            winnerId: null,
            score1: undefined,
            score2: undefined,
            maps: undefined,
            team1Stats: undefined,
            team2Stats: undefined,
            completed: false
          }));
        }
        updated.bracketRounds = rounds;
        didChange = true;
      }
    }
    // 5. Swiss Stage rollback
    else if (updated.swissRounds && updated.swissRounds.length > 0) {
      const currentRIdx = updated.swissRounds.length - 1;
      const currentRound = updated.swissRounds[currentRIdx];
      const hasAnyPlayedMatches = Array.isArray(currentRound) && currentRound.some(m => m.winnerId && m.team1?.id !== 'BYE' && m.team2?.id !== 'BYE');

      if (hasAnyPlayedMatches) {
        // Reset played matches in current round
        updated.swissRounds[currentRIdx] = currentRound.map(m => {
          const isBye = m.team1?.id === 'BYE' || m.team2?.id === 'BYE';
          return {
            ...m,
            winnerId: isBye ? (m.team1?.id === 'BYE' ? m.team2?.id : m.team1?.id) : null,
            score1: undefined,
            score2: undefined,
            maps: undefined,
            team1Stats: undefined,
            team2Stats: undefined,
            completed: false
          };
        });
        didChange = true;
      } else if (updated.swissRounds.length > 1) {
        // Round is unplayed: remove this round and step back to previous round
        const toRemove = Math.min(steps, updated.swissRounds.length - 1);
        updated.swissRounds = updated.swissRounds.slice(0, updated.swissRounds.length - toRemove);
        didChange = true;
      } else {
        // Round 1
        updated.swissRounds = [updated.swissRounds[0].map(m => {
          const isBye = m.team1?.id === 'BYE' || m.team2?.id === 'BYE';
          return {
            ...m,
            winnerId: isBye ? (m.team1?.id === 'BYE' ? m.team2?.id : m.team1?.id) : null,
            score1: undefined,
            score2: undefined,
            maps: undefined,
            team1Stats: undefined,
            team2Stats: undefined,
            completed: false
          };
        })];
        didChange = true;
      }
    }
    // 6. Groups rollback
    else if (updated.groups && updated.groups.length > 0) {
      const groups = updated.groups.map(g => ({
        ...g,
        matches: g.matches?.map(m => ({ ...m }))
      }));
      for (const g of groups) {
        if (g.matches) {
          for (let i = g.matches.length - 1; i >= 0; i--) {
            const gm = g.matches[i] as any;
            if (gm.winnerId) {
              gm.winnerId = null;
              gm.score1 = undefined;
              gm.score2 = undefined;
              gm.maps = undefined;
              gm.team1Stats = undefined;
              gm.team2Stats = undefined;
              gm.completed = false;
              didChange = true;
              break;
            }
          }
        }
      }
      if (didChange) {
        updated.groups = groups;
      }
    }

    if (didChange) {
      updated.status = 'in_progress';
      updated.completed = false;
      updated.winnerName = undefined;
      setHistoryStack([]);
      try {
        if (activeTournament?.id) {
          sessionStorage.removeItem(`t_history_${activeTournament.id}`);
        }
      } catch (e) {}

      saveTournament(userId, updated);
      setActiveTournament(updated);
      setTournaments(loadTournaments(userId));
    }
  };

  const handleToggleMatchImportance = (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number) => {
    if (!activeTournament) return;
    const updated = JSON.parse(JSON.stringify(activeTournament)) as Tournament;
    
    let match: Match | undefined;
    if (type === 'winners') {
        match = (updated.bracketRounds?.[rIdx]?.[mIdx]) || (updated.tieredBracketRounds?.[rIdx]?.[mIdx]);
    } else if (type === 'losers') {
        match = updated.losersBracketRounds?.[rIdx]?.[mIdx];
    } else if (type === 'gf') {
        match = updated.grandFinal?.[mIdx];
    }

    if (match) {
        // Cycle importance: none -> semi -> final -> none
        const current = match.importance || 'none';
        if (current === 'none') match.importance = 'semi';
        else if (current === 'semi') match.importance = 'final';
        else match.importance = 'none';
        
        handleUpdateActive(updated);
    }
  };

  const handleUpdateActive = (updated: Tournament) => {
      const isStageSwitch = activeTournament && updated.activeStage !== activeTournament.activeStage;
      
      let toSave = { ...updated };

      // CRITICAL BUG FIX: If we are switching stages, we MUST first sync the OLD stage 
      // and THEN load the NEW stage data into root fields.
      if (isStageSwitch && activeTournament.settings?.stages) {
          const oldStageIdx = (activeTournament.activeStage || 1) - 1;
          const newStageIdx = (updated.activeStage || 1) - 1;
          const stages = [...(toSave.settings?.stages || [])];

          // 1. Sync CURRENT (old) root data back to its stage before switching
          if (stages[oldStageIdx]) {
              stages[oldStageIdx] = {
                  ...stages[oldStageIdx],
                  bracketRounds: activeTournament.bracketRounds,
                  losersBracketRounds: activeTournament.losersBracketRounds,
                  grandFinal: activeTournament.grandFinal,
                  groups: activeTournament.groups,
                  gslGroups: activeTournament.gslGroups,
                  swissRounds: activeTournament.swissRounds,
                  qualifiersBrackets: activeTournament.qualifiersBrackets,
                  tieredBracketRounds: activeTournament.tieredBracketRounds,
                  teams: activeTournament.teams
              };
          }

          // 2. Load TARGET (new) stage data into the ROOT fields so components render the new stage
          const nextStage = stages[newStageIdx];
          if (nextStage) {
              toSave.bracketRounds = nextStage.bracketRounds;
              toSave.losersBracketRounds = nextStage.losersBracketRounds;
              toSave.grandFinal = nextStage.grandFinal;
              toSave.groups = nextStage.groups;
              toSave.gslGroups = nextStage.gslGroups;
              toSave.swissRounds = nextStage.swissRounds;
              toSave.qualifiersBrackets = nextStage.qualifiersBrackets;
              toSave.tieredBracketRounds = nextStage.tieredBracketRounds;
              toSave.teams = nextStage.teams || toSave.teams;
          }
          
          if (toSave.settings) {
              toSave.settings.stages = stages;
          }
      }

      if (activeTournament) {
        setHistoryStack(prev => {
          try {
            const serializedCurrent = JSON.stringify(activeTournament);
            if (prev.length > 0 && JSON.stringify(prev[prev.length - 1]) === serializedCurrent) {
              return prev;
            }
            const next = [...prev.slice(-15), JSON.parse(serializedCurrent)];
            try {
              sessionStorage.setItem(`t_history_${activeTournament.id}`, JSON.stringify(next));
            } catch (e) {}
            return next;
          } catch (e) {
            return prev;
          }
        });
      }

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

      // Ensure active stage in settings.stages is strictly synchronized with root brackets (standard non-switching update)
      if (!isStageSwitch && toSave.settings && Array.isArray(toSave.settings.stages) && toSave.settings.stages.length > 0) {
        const curStageIdx = Math.min(Math.max(0, (toSave.activeStage || 1) - 1), toSave.settings.stages.length - 1);
        if (toSave.settings.stages[curStageIdx]) {
          toSave.settings.stages[curStageIdx] = {
            ...toSave.settings.stages[curStageIdx],
            bracketRounds: toSave.bracketRounds,
            losersBracketRounds: toSave.losersBracketRounds,
            grandFinal: toSave.grandFinal,
            groups: toSave.groups,
            gslGroups: toSave.gslGroups,
            swissRounds: toSave.swissRounds,
            qualifiersBrackets: toSave.qualifiersBrackets,
            tieredBracketRounds: toSave.tieredBracketRounds,
            teams: toSave.teams
          };
        }
      }

      try {
          saveTournament(userId, toSave);
          setActiveTournament(toSave);
          // Optimization: Update the specific tournament in the local list without a full reload from storage
          // to prevent race conditions or loading old data if storage isn't fully flushed yet.
          setTournaments(prev => {
              if (!Array.isArray(prev)) return [toSave];
              const exists = prev.some(t => t.id === toSave.id);
              if (exists) {
                  return prev.map(t => t.id === toSave.id ? toSave : t);
              }
              return [toSave, ...prev];
          });
      } catch (e) {
          console.warn("Could not save to localStorage due to size limit. Attempting to bypass local cache...");
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

  const handleRebuildBracket = (randomize: boolean = false) => {
    if (!activeTournament) return;
    
    // Check if tournament has stages configured
    if (activeTournament.settings?.stages && activeTournament.settings.stages.length > 0) {
      const currentStageIdx = Math.max(0, (activeTournament.activeStage || 1) - 1);
      const configuredStages = [...activeTournament.settings.stages];
      const curStage = configuredStages[currentStageIdx];
      if (curStage) {
        let stageTeams = Array.isArray(curStage.teams) && curStage.teams.length > 0 
          ? [...curStage.teams] 
          : [...activeTournament.teams];
        if (randomize) {
          stageTeams = shuffleArray(stageTeams);
        }
        const built = generateStageData(curStage.type, stageTeams, {
          eliminationType: (curStage as any).eliminationType || activeTournament.settings?.eliminationType,
          numberOfGroups: activeTournament.settings?.numberOfGroups,
          matchesPerPairing: activeTournament.settings?.matchesPerPairing,
          gslAdvanceCount: activeTournament.settings?.gslAdvanceCount,
          swissWinsToAdvance: activeTournament.settings?.swissWinsToAdvance,
          swissLossesToEliminate: activeTournament.settings?.swissLossesToEliminate,
          numQuals: curStage.numQuals,
          advancePerQual: curStage.advancePerQual
        });
        configuredStages[currentStageIdx] = {
          ...curStage,
          teams: stageTeams,
          ...built
        };
        const updatedTourn: Tournament = {
          ...activeTournament,
          settings: {
            ...activeTournament.settings,
            stages: configuredStages
          }
        };
        if (currentStageIdx === 0) {
          updatedTourn.teams = stageTeams;
          updatedTourn.bracketRounds = built.bracketRounds;
          updatedTourn.losersBracketRounds = built.losersBracketRounds;
          updatedTourn.grandFinal = built.grandFinal;
          updatedTourn.groups = built.groups;
          updatedTourn.gslGroups = built.gslGroups;
          updatedTourn.swissRounds = built.swissRounds;
          updatedTourn.qualifiersBrackets = built.qualifiersBrackets;
        }
        handleUpdateActive(updatedTourn);
        setSaveToastMessage(randomize ? "Сетка перемешана случайным образом" : "Сетка успешно пересобрана");
        setTimeout(() => setSaveToastMessage(''), 3000);
        return;
      }
    }

    let teams = [...activeTournament.teams];
    if (randomize) {
      teams = shuffleArray(teams);
    }
    
    const updatedSettings = {
      ...activeTournament.settings,
      seedingType: randomize ? 'random' : activeTournament.settings.seedingType
    };

    const { initialGroups, initialBracket, initialLosersBracket, initialGrandFinal, initialSwissRounds, initialGslGroups } = generateInitialData(updatedSettings, teams);

    const updated: Tournament = {
      ...activeTournament,
      settings: updatedSettings,
      teams: teams,
      groups: initialGroups.length > 0 ? initialGroups : undefined,
      gslGroups: initialGslGroups.length > 0 ? initialGslGroups : undefined,
      bracketRounds: initialBracket.length > 0 ? initialBracket : undefined,
      losersBracketRounds: initialLosersBracket.length > 0 ? initialLosersBracket : undefined,
      grandFinal: initialGrandFinal.length > 0 ? initialGrandFinal : undefined,
      swissRounds: initialSwissRounds.length > 0 ? initialSwissRounds : undefined,
    };

    handleUpdateActive(updated);
    setSaveToastMessage(randomize ? "Сетка перемешана случайным образом" : "Сетка успешно пересобрана");
    setTimeout(() => setSaveToastMessage(''), 3000);
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

  const handleEditSave = (name: string, newSettings: TournamentSettings, newTeams: Team[], logoUrl?: string, prizePool?: string, isTeamsOrFormatModified?: boolean) => {
      if (!activeTournament) return;
      
      // If user only changed general info (name, logo, prize pool, background) and didn't touch teams or format, NEVER warn!
      if (isTeamsOrFormatModified === false) {
          proceedWithSave(name, newSettings, newTeams, false, logoUrl, prizePool);
          return;
      }

      const formatChanged = activeTournament.settings.mode !== newSettings.mode || 
                            (activeTournament.settings.numberOfGroups || 2) !== (newSettings.numberOfGroups || 2) || 
                            (activeTournament.settings.matchesPerPairing || 1) !== (newSettings.matchesPerPairing || 1) ||
                            (activeTournament.settings.eliminationType || 'single') !== (newSettings.eliminationType || 'single') ||
                            (activeTournament.settings.swissWinsToAdvance || 3) !== (newSettings.swissWinsToAdvance || 3) ||
                            (activeTournament.settings.swissLossesToEliminate || 3) !== (newSettings.swissLossesToEliminate || 3);
      
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

      if (!formatChanged && !teamsChanged && !orderChanged) {
          proceedWithSave(name, newSettings, newTeams, false, logoUrl, prizePool);
          return;
      }

      const hasPlayedMatches = (() => {
          const isMatchPlayed = (m: Match | undefined) => m && (m.score1 > 0 || m.score2 > 0 || (m.winnerId && m.team1 && m.team2 && m.team1.id !== 'BYE' && m.team2.id !== 'BYE'));
          
          if (activeTournament.groups) {
              for (const g of activeTournament.groups) {
                  for (const m of g.matches) {
                      if (isMatchPlayed(m)) return true;
                  }
              }
          }
          if (activeTournament.gslGroups) {
              for (const g of activeTournament.gslGroups) {
                  for (const m of g.upperBracket.flat()) if (isMatchPlayed(m)) return true;
                  for (const m of g.lowerBracket.flat()) if (isMatchPlayed(m)) return true;
              }
          }
          if (activeTournament.swissRounds) {
              for (const r of activeTournament.swissRounds) {
                  for (const m of r) if (isMatchPlayed(m)) return true;
              }
          }
          if (activeTournament.bracketRounds) {
              for (const r of activeTournament.bracketRounds) {
                  for (const m of r) if (isMatchPlayed(m)) return true;
              }
          }
          if (activeTournament.losersBracketRounds) {
              for (const r of activeTournament.losersBracketRounds) {
                  for (const m of r) if (isMatchPlayed(m)) return true;
              }
          }
          if (activeTournament.tieredBracketRounds) {
              for (const r of activeTournament.tieredBracketRounds) {
                  for (const m of r) if (isMatchPlayed(m)) return true;
              }
          }
          if (activeTournament.grandFinal) {
              for (const m of activeTournament.grandFinal) {
                  if (isMatchPlayed(m)) return true;
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
          if (updatedTournament.gslGroups) {
              updatedTournament.gslGroups = updatedTournament.gslGroups.map(g => ({
                  ...g,
                  teams: g.teams.map(t => ({ ...t, name: teamNameMap.get(t.id) || t.name })),
                  upperBracket: g.upperBracket.map(r => r.map(m => ({
                      ...m,
                      team1: m.team1 && m.team1.id !== 'BYE' ? { ...m.team1, name: teamNameMap.get(m.team1.id) || m.team1.name } : m.team1,
                      team2: m.team2 && m.team2.id !== 'BYE' ? { ...m.team2, name: teamNameMap.get(m.team2.id) || m.team2.name } : m.team2,
                  }))),
                  lowerBracket: g.lowerBracket.map(r => r.map(m => ({
                      ...m,
                      team1: m.team1 && m.team1.id !== 'BYE' ? { ...m.team1, name: teamNameMap.get(m.team1.id) || m.team1.name } : m.team1,
                      team2: m.team2 && m.team2.id !== 'BYE' ? { ...m.team2, name: teamNameMap.get(m.team2.id) || m.team2.name } : m.team2,
                  })))
              }));
          }
      }

      if (resetProgress) {
          if (Array.isArray(newSettings.stages) && newSettings.stages.length > 0) {
              const regeneratedStages = newSettings.stages.map((stg, sIdx) => {
                  const stageTeams = Array.isArray(stg.teams) ? stg.teams : [];
                  const built = generateStageData(stg.type, stageTeams, {
                      eliminationType: newSettings.eliminationType,
                      numberOfGroups: newSettings.numberOfGroups,
                      matchesPerPairing: newSettings.matchesPerPairing,
                      gslAdvanceCount: newSettings.gslAdvanceCount,
                      swissWinsToAdvance: newSettings.swissWinsToAdvance,
                      swissLossesToEliminate: newSettings.swissLossesToEliminate,
                      numQuals: stg.numQuals,
                      advancePerQual: stg.advancePerQual
                  });
                  return {
                      ...stg,
                      id: stg.id || `stage_${sIdx + 1}`,
                      name: stg.name || `Стадия ${sIdx + 1}`,
                      teams: stageTeams,
                      bracketRounds: built.bracketRounds,
                      losersBracketRounds: built.losersBracketRounds,
                      grandFinal: built.grandFinal,
                      groups: built.groups,
                      gslGroups: built.gslGroups,
                      swissRounds: built.swissRounds,
                      qualifiersBrackets: built.qualifiersBrackets
                  };
              });
              updatedTournament.settings.stages = regeneratedStages;
              const stage1 = regeneratedStages[0];
              if (stage1) {
                  updatedTournament.teams = stage1.teams || newTeams;
                  updatedTournament.bracketRounds = stage1.bracketRounds;
                  updatedTournament.losersBracketRounds = stage1.losersBracketRounds;
                  updatedTournament.grandFinal = stage1.grandFinal;
                  updatedTournament.groups = stage1.groups;
                  updatedTournament.gslGroups = stage1.gslGroups;
                  updatedTournament.swissRounds = stage1.swissRounds;
                  updatedTournament.qualifiersBrackets = stage1.qualifiersBrackets;
              }
          } else {
              const { initialGroups, initialBracket, initialLosersBracket, initialGrandFinal, initialSwissRounds, initialGslGroups } = generateInitialData(newSettings, newTeams);
              updatedTournament.groups = initialGroups.length > 0 ? initialGroups : undefined;
              updatedTournament.gslGroups = initialGslGroups.length > 0 ? initialGslGroups : undefined;
              updatedTournament.swissRounds = initialSwissRounds.length > 0 ? initialSwissRounds : undefined;
              updatedTournament.bracketRounds = initialBracket.length > 0 ? initialBracket : undefined;
              updatedTournament.losersBracketRounds = initialLosersBracket.length > 0 ? initialLosersBracket : undefined;
              updatedTournament.grandFinal = initialGrandFinal.length > 0 ? initialGrandFinal : undefined;
          }
          updatedTournament.activeStage = 1;
          updatedTournament.tieredBracketRounds = undefined;
      } else if (Array.isArray(newSettings.stages) && newSettings.stages.length > 0) {
          // If not resetting progress, preserve or initialize empty stages
          const updatedStages = newSettings.stages.map((stg, sIdx) => {
              const stageTeams = Array.isArray(stg.teams) ? stg.teams : [];
              const hasMatches = (stg.bracketRounds && stg.bracketRounds.length > 0) ||
                                 (stg.groups && stg.groups.length > 0) ||
                                 (stg.gslGroups && stg.gslGroups.length > 0) ||
                                 (stg.swissRounds && stg.swissRounds.length > 0);
              if (!hasMatches && stageTeams.length >= 2) {
                  const built = generateStageData(stg.type, stageTeams, {
                      eliminationType: newSettings.eliminationType,
                      numberOfGroups: newSettings.numberOfGroups,
                      matchesPerPairing: newSettings.matchesPerPairing,
                      gslAdvanceCount: newSettings.gslAdvanceCount,
                      swissWinsToAdvance: newSettings.swissWinsToAdvance,
                      swissLossesToEliminate: newSettings.swissLossesToEliminate,
                      numQuals: stg.numQuals,
                      advancePerQual: stg.advancePerQual
                  });
                  return {
                      ...stg,
                      id: stg.id || `stage_${sIdx + 1}`,
                      name: stg.name || `Стадия ${sIdx + 1}`,
                      teams: stageTeams,
                      bracketRounds: built.bracketRounds,
                      losersBracketRounds: built.losersBracketRounds,
                      grandFinal: built.grandFinal,
                      groups: built.groups,
                      gslGroups: built.gslGroups,
                      swissRounds: built.swissRounds,
                      qualifiersBrackets: built.qualifiersBrackets
                  };
              }
              return {
                  ...stg,
                  id: stg.id || `stage_${sIdx + 1}`,
                  name: stg.name || `Стадия ${sIdx + 1}`,
                  teams: stageTeams
              };
          });
          updatedTournament.settings.stages = updatedStages;
      }

      handleUpdateActive(updatedTournament);
      setIsEditingSettings(false);
      setIsConfirmingSave(null);
  };

  const handlePlayTournamentMatch = (team1: Team, team2: Team, matchInfo?: any) => {
      if (!activeTournament) return;

      const allKnownTeams: Team[] = [
        ...(activeTournament.teams || []),
        ...((activeTournament.settings?.stages || []).flatMap((s: any) => s.teams || []))
      ];

      const resolveFullTeam = (tm: Team): Team => {
        if (!tm) return tm;
        if (tm.players && Array.isArray(tm.players) && tm.players.length > 0) return tm;

        const found = allKnownTeams.find(t => 
          (t.id && tm.id && t.id === tm.id) || 
          (t.name && tm.name && t.name.toLowerCase().trim() === tm.name.toLowerCase().trim())
        );

        if (found && found.players && Array.isArray(found.players) && found.players.length > 0) {
          return { ...tm, ...found, players: found.players };
        }
        return tm;
      };

      const fullTeam1 = resolveFullTeam(team1);
      const fullTeam2 = resolveFullTeam(team2);

      navigate('/', {
          state: {
              team1: fullTeam1,
              team2: fullTeam2,
              game: activeTournament.settings?.game || 'cs2',
              format: (activeTournament.settings?.matchFormat || 'bo3').toUpperCase(),
              selectedTournament: activeTournament.id,
              tournament: activeTournament,
              matchInfo: matchInfo,
              returnPath: tournamentId ? `/tournaments-beta/${activeTournament.id}` : '/tournaments'
          }
      });
  };

  const handleSaveAsTemplate = async (e: React.MouseEvent, sourceTournament: Tournament) => {
      e.stopPropagation();
      const templateId = 'tpl-' + Date.now();
      const templateSettings = { ...sourceTournament.settings };
      // Keep structural properties for settings, clear the match generation logic
      
      const newTemplate: Tournament = {
          id: templateId,
          name: sourceTournament.name + ' (Шаблон)',
          logoUrl: sourceTournament.logoUrl,
          prizePool: sourceTournament.prizePool,
          settings: templateSettings,
          teams: [],
          createdAt: Date.now(),
          status: 'upcoming',
          activeStage: 1,
      };
      
      // We use a custom flag for duck typing
      (newTemplate as any).isTemplate = true;

      const updatedList = [...tournaments, newTemplate];
      setTournaments(updatedList);
      
      try {
          // Attempt to save through normal method
          import('../../firebase').then(({ db, doc, setDoc }) => {
              setDoc(doc(db, "tournaments", templateId), newTemplate).catch(console.error);
          });
      } catch (err) {
          console.error(err);
      }
      
      setActiveTabList('templates');
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
                  const advanceCount = newT.settings?.gslAdvanceCount || 3;
                  const updatedGroup = updateGslMatch(newT.gslGroups[gIdx], bracketType, rIdx, mIdx, score1, score2, advanceCount);
                  const updatedGroups = [...newT.gslGroups];
                  updatedGroups[gIdx] = updatedGroup;
                  newT.gslGroups = updatedGroups;

                  // Record match result to global history
                  const bracket = bracketType === 'upper' ? updatedGroup.upperBracket : updatedGroup.lowerBracket;
                  const recordedMatch = bracket?.[rIdx]?.[mIdx];
                  if (recordedMatch) {
                      recordTournamentMatchResult(userId, newT, recordedMatch, `GSL ${updatedGroup.name || ''}`);
                  }

                  // Auto-advance to Stage 2 if all GSL groups finished
                  const allFinished = newT.gslGroups.every(group => {
                      const standings = getGslGroupStandings(group, advanceCount);
                      return standings.isGroupFinished;
                  });
                  if (allFinished && newT.activeStage === 1) {
                      const stage2Type = newT.settings?.stage2Type || 'tiered';
                      if (stage2Type === 'tiered') {
                          newT.tieredBracketRounds = generateTieredPlayoffBracket(newT.gslGroups, advanceCount);
                          newT.activeStage = 2;
                      }
                  }
              }
          }
      } else if (matchInfo && matchInfo.stage === 'tiered_playoff') {
          const { rIdx, mIdx } = matchInfo;
          if (newT.tieredBracketRounds) {
              const updatedRounds = advanceTieredPlayoffMatch(newT.tieredBracketRounds, rIdx, mIdx, score1, score2);
              newT.tieredBracketRounds = updatedRounds;
              
              // Record match result to global history
              const recordedMatch = updatedRounds[rIdx]?.[mIdx];
              if (recordedMatch) {
                  recordTournamentMatchResult(userId, newT, recordedMatch, 'Playoff');
              }
          }
      } else if (matchInfo && matchInfo.stage === 'group') {
          const newGroups = newT.groups?.map((g: any) => {
              if (g.id !== matchInfo.groupId) return g;
              const newMatches = g.matches.map((m: any) => {
                  if (m.id !== matchInfo.matchId) return m;
                  let wId = null;
                  if (score1 > score2) wId = m.team1?.id;
                  else if (score2 > score1) wId = m.team2?.id;
                  const updatedM = { ...m, score1, score2, winnerId: wId, isFinished: true };
                  
                  // Record match result to global history
                  recordTournamentMatchResult(userId, newT, updatedM, `${matchInfo.stage} ${g.name || ''}`);

                  return updatedM;
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
              
              // Record match result to global history
              recordTournamentMatchResult(userId, newT, m, matchInfo.stage);

              // Check if round is finished and generate next Swiss round if needed
              const currentRound = newRounds[matchInfo.rIdx];
              const isRoundFinished = currentRound.every(rm => rm.isFinished || (rm.team1?.id === 'BYE' || rm.team2?.id === 'BYE'));
              if (isRoundFinished) {
                  const winsToAdvance = newT.settings?.swissWinsToAdvance || 3;
                  const lossesToEliminate = newT.settings?.swissLossesToEliminate || 3;
                  const nextRound = generateNextSwissRound(newT.teams || [], newRounds, winsToAdvance, lossesToEliminate);
                  if (nextRound) {
                      newRounds.push(nextRound);
                  }
              }
              
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
              matchToUpdate.isFinished = true;

              // Record match result to global history
              recordTournamentMatchResult(userId, newT, matchToUpdate, matchInfo.stage);

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
          const advanceCount = activeTournament.settings.gslAdvanceCount || 3;

          if (stage2Type === 'tiered' || (stage2Type === 'single' && (advanceCount === 2 || advanceCount === 3 || advanceCount === 4))) {
              const tieredRounds = generateTieredPlayoffBracket(activeTournament.gslGroups, advanceCount);
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
                  const st = getGslGroupStandings(g, advanceCount);
                  if (st.first) advancingTeams.push(st.first);
                  if (st.second) advancingTeams.push(st.second);
                  if (advanceCount >= 3 && st.third) advancingTeams.push(st.third);
                  if (advanceCount === 4 && st.fourth) advancingTeams.push(st.fourth);
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
          const groupStandingsList: { first: Team | null, second: Team | null, third: Team | null, fourth: Team | null, sorted: Team[] }[] = [];

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
              }).map(s => s.team);
              
              groupStandingsList.push({
                  first: sorted[0] || null,
                  second: sorted[1] || null,
                  third: sorted[2] || null,
                  fourth: sorted[3] || null,
                  sorted
              });
          });

          const advCount = activeTournament.settings.advancingPerGroup || 2;
          const stage2Type = activeTournament.settings.stage2Type || (advCount === 3 ? 'tiered' : 'single');

          // If 3 teams advance per group from 2 groups, generate Tiered Playoff bracket (Quarter-finals -> Semis -> GF)
          if (groupStandingsList.length === 2 && advCount === 3 && stage2Type !== 'double') {
              const gslFormatStandings = groupStandingsList.map(g => ({
                  first: g.first,
                  second: g.second,
                  third: g.third,
                  fourth: g.fourth,
                  eliminated: g.sorted.slice(3),
                  isGroupFinished: true
              }));
              const tieredRounds = generateTieredPlayoffFromStandings(gslFormatStandings, 3);
              const updated = {
                  ...activeTournament,
                  activeStage: 2 as const,
                  tieredBracketRounds: tieredRounds
              };
              handleUpdateActive(updated);
              return;
          }

          // If 2 teams advance from 2 groups in single elimination, cross-seed: 1A vs 2B, 1B vs 2A
          if (groupStandingsList.length === 2 && advCount === 2 && stage2Type !== 'double') {
              const A = groupStandingsList[0];
              const B = groupStandingsList[1];
              const r1: Match[] = [
                  { id: 'm0', round: 1, team1: A.first || null, team2: B.second || null, score1: 0, score2: 0, winnerId: null },
                  { id: 'm1', round: 1, team1: B.first || null, team2: A.second || null, score1: 0, score2: 0, winnerId: null },
              ];
              const r2: Match[] = [
                  { id: 'm2', round: 2, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
              ];
              const updated = {
                  ...activeTournament,
                  activeStage: 2 as const,
                  bracketRounds: [r1, r2]
              };
              handleUpdateActive(updated);
              return;
          }

          groupStandingsList.forEach(g => {
              for (let i = 0; i < advCount && i < g.sorted.length; i++) {
                  advancingTeams.push(g.sorted[i]);
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

  if (tournamentId && !activeTournament) {
      return (
          <div className="flex flex-col items-center justify-center py-48 bg-[#050508] min-h-screen text-white">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-zinc-500 mt-6 font-black uppercase tracking-widest animate-pulse">Загрузка турнира...</p>
          </div>
      );
  }

  if (activeTournament) {
      if (isEditingSettings) {
          return (
              <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-8 animate-in fade-in duration-500 bg-[#050508] min-h-screen">
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
                    <TournamentSettingsForm user={user} 
                        initialName={activeTournament.name}
                        initialLogoUrl={activeTournament.logoUrl}
                        initialPrizePool={activeTournament.prizePool || '$100,000'}
                        initialSettings={
                            activeTournament.settings.stages && activeTournament.settings.stages.length > 0
                                ? activeTournament.settings
                                : {
                                    ...activeTournament.settings,
                                    stages: [{
                                        id: 'stage_1',
                                        name: activeTournament.settings.mode === 'swiss' ? 'Швейцарская система' : (activeTournament.settings.mode === 'two_stage' ? 'Групповой этап' : 'Основная сетка'),
                                        type: (activeTournament.settings.stage1Type as any) || (activeTournament.settings.mode === 'swiss' ? 'swiss' : (activeTournament.settings.mode === 'two_stage' ? 'groups' : 'playoff')),
                                        teams: [...activeTournament.teams],
                                        groups: activeTournament.groups,
                                        gslGroups: activeTournament.gslGroups,
                                        bracketRounds: activeTournament.bracketRounds,
                                        losersBracketRounds: activeTournament.losersBracketRounds,
                                        grandFinal: activeTournament.grandFinal,
                                        swissRounds: activeTournament.swissRounds,
                                        qualifiersBrackets: activeTournament.qualifiersBrackets
                                    }]
                                }
                        }
                        initialTeams={activeTournament.teams}
                        onSave={handleEditSave}
                        submitLabel="Сохранить изменения"
                    />
              </div>
          );
      }

      return (
          <div className="w-full min-h-screen bg-[#050508] text-white relative">
              {/* Sticky Top Header Area */}
              <div className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-xl border-b border-white/5 px-4 py-4 sm:px-8 shadow-2xl">
                  <div className="max-w-none px-4 sm:px-12 mx-auto flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                          <button onClick={() => onBack ? onBack() : setActiveTournament(null)} className="flex items-center gap-2 text-white/70 hover:text-white transition-all font-bold uppercase text-[10px] tracking-widest bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                              <ArrowLeft className="w-4 h-4" /> Назад
                          </button>
                          <div className="hidden md:block h-8 w-[1px] bg-white/10 mx-2" />
                          <h2 className="hidden md:block text-sm font-black text-white uppercase truncate max-w-[200px]">{activeTournament.name}</h2>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-wrap">
                            {/* Quick Zoom Controls */}
                            <div className="flex items-center bg-black/40 rounded-xl border border-white/5 p-1 mr-1">
                               <button 
                                 onClick={() => handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, bracketScale: Math.max(25, (activeTournament.settings.bracketScale || 100) - 25) }})}
                                 className="p-1.5 hover:bg-white/5 text-white/50 rounded-lg transition-colors cursor-pointer"
                                 title="Уменьшить масштаб сетки"
                               >
                                 <ZoomOut className="w-4 h-4" />
                               </button>
                               <span className="text-[10px] font-black text-white/40 px-2 min-w-[45px] text-center">
                                 {activeTournament.settings.bracketScale || 100}%
                               </span>
                               <button 
                                 onClick={() => handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, bracketScale: Math.min(200, (activeTournament.settings.bracketScale || 100) + 25) }})}
                                 className="p-1.5 hover:bg-white/5 text-white/50 rounded-lg transition-colors cursor-pointer"
                                 title="Увеличить масштаб сетки"
                               >
                                 <ZoomIn className="w-4 h-4" />
                               </button>
                            </div>

                            {/* Randomize Bracket Button */}
                            <button 
                              onClick={() => {
                                if (hasStarted && !window.confirm("Турнир уже начат. Перемешать команды и пересобрать сетку заново? Текущие результаты матчей будут сброшены.")) {
                                  return;
                                }
                                handleRebuildBracket(true);
                              }} 
                              className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                              title="Случайно перемешать команды и пересобрать сетку (рандомный посев)"
                            >
                              <Shuffle className="w-4 h-4 text-purple-400" />
                              <span>РАНДОМ</span>
                            </button>

                            {/* Styled Top-20 Button matching website dark & orange aesthetic */}
                            <button 
                              onClick={() => setShowTop20(true)} 
                              className="flex items-center gap-2 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/30 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                              title="Статистика и рейтинг ТОП-20 игроков турнира"
                            >
                              <Trophy className="w-4 h-4 text-[#ff8f00]" />
                              <span>ТОП-20</span>
                            </button>

                            {/* Card Style & Themes Button (Glass, Neon, Cyber, Gold, etc.) */}
                            <button 
                              onClick={() => setShowCustomizationModal(true)} 
                              className="flex items-center gap-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 text-pink-300 border border-pink-500/30 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                              title="Оформление карточек матчей: Стекло, Киберпанк, Неон, Золото и фоны"
                            >
                              <Palette className="w-4 h-4 text-pink-400" />
                              <span>СТИЛЬ КАРТОЧЕК</span>
                            </button>

                            {/* Leaders Button */}
                            <button 
                              onClick={() => setShowLeaders(true)} 
                              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border border-white/5 cursor-pointer"
                              title="Лидеры по опенам и клатчам"
                            >
                              <User className="w-4 h-4 text-blue-400" />
                              <span>ЛИДЕРЫ</span>
                            </button>

                            {/* Rosters Button */}
                            <button 
                              onClick={() => setShowRosters(true)} 
                              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border border-white/5 cursor-pointer"
                              title="Составы команд турнира"
                            >
                              <Users className="w-4 h-4 text-zinc-400" />
                              <span>СОСТАВЫ</span>
                            </button>

                            {/* Download Bracket Button */}
                            <button 
                             onClick={() => setShowDownloadModal(true)} 
                             className="flex items-center gap-2 bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                             title="Скачать сетку турнира (PDF с оптимизацией, PNG Ultra-HD, JSON)"
                            >
                             <Download className="w-4 h-4 text-blue-400" />
                             <span>СКАЧАТЬ СЕТКУ</span>
                            </button>

                            {/* Undo Button */}
                            {canUndoTournament(activeTournament) && (
                                <button 
                                    onClick={() => handleUndoTournamentRounds(1)} 
                                    className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                                    title="Отменить последний результат матча"
                                >
                                    <Undo2 className="w-4 h-4" />
                                    <span>ОТМЕНА</span>
                                </button>
                            )}

                            {/* Swap Match Pairs Mode */}
                            <button 
                              onClick={() => setIsSwapMode(!isSwapMode)} 
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                                isSwapMode 
                                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
                              }`}
                              title="Включить режим изменения пар команд"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                              <span>ИЗМЕНИТЬ ПАРЫ</span>
                            </button>

                            {/* Seeding Button if not started */}
                            {!hasStarted && (
                                <button 
                                    onClick={() => {
                                        setSeedingTeams([...activeTournament.teams]);
                                        setIsSeedingOpen(true);
                                    }} 
                                    className="flex items-center gap-1.5 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/30 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                                    title="Ручной посев участников"
                                >
                                    <span>ПОСЕВ</span>
                                </button>
                            )}

                            {/* Edit Settings Button */}
                            <button 
                              onClick={() => setIsEditingSettings(true)} 
                              className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
                              title="Изменить настройки турнира, состав команд или формат"
                            >
                              <Settings className="w-4 h-4 text-blue-400" />
                              <span>ИЗМЕНИТЬ</span>
                            </button>

                            {/* Tournament Completed Status Button */}
                            <button 
                                onClick={toggleTournamentCompleted}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                                  activeTournament.completed || activeTournament.status === 'completed'
                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5'
                                }`}
                            >
                                {activeTournament.completed || activeTournament.status === 'completed' ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                <span>{activeTournament.completed || activeTournament.status === 'completed' ? 'ЗАВЕРШЕН' : 'ЗАВЕРШИТЬ'}</span>
                            </button>

                            {/* Stage Selector (if multi-stage) */}
                            {activeTournament.settings?.stages && activeTournament.settings.stages.length > 1 && (
                                <div className="flex items-center gap-1 bg-blue-600/10 p-1 rounded-xl border border-blue-500/20">
                                    {activeTournament.settings.stages.map((stg, sIdx) => {
                                        const isCurrent = (activeTournament.activeStage || 1) === (sIdx + 1);
                                        return (
                                            <button
                                                key={sIdx}
                                                onClick={() => handleUpdateActive({ ...activeTournament, activeStage: (sIdx + 1) as any })}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                  isCurrent
                                                    ? 'bg-blue-600 text-white shadow'
                                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                Стадия {sIdx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                      </div>
                  </div>
              </div>

              {/* Save Toast Notification */}
              {saveToastMessage && (
                  <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-2xl shadow-2xl shadow-emerald-500/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
                      <Check className="w-4 h-4" />
                      <span>{saveToastMessage}</span>
                  </div>
              )}

              <div className="w-full max-w-none px-4 sm:px-8 mx-auto animate-in fade-in duration-500">

                  <div 
                      ref={stageRef}
                      id="tournament-bracket-stage"
                      data-export-container="true"
                      data-exporting={isExporting}
                      className="w-full relative p-4 sm:p-8 rounded-3xl overflow-auto min-h-[600px] border border-white/5 transition-all shadow-2xl bg-black/40"
                      style={{
                          zoom: isExporting ? '100%' : `${Math.max(10, activeTournament.settings.bracketScale || 100)}%`
                      }}
                  >
                  {/* Hidden preloader for background image to ensure correct isBgLoaded state */}
                  {bgImage && (
                    <img 
                      src={bgImage} 
                      className="hidden" 
                      onLoad={() => setIsBgLoaded(true)} 
                      onError={() => setIsBgLoaded(true)} // Still show theme/overlay if image fails
                      alt="" 
                    />
                  )}

                  {/* Background Layer (Custom Image or Theme) with Zero Delay & Smooth Transition */}
                  {bgImage ? (
                      <>
                          {/* Crisp base theme layer preventing any blank void while loading */}
                          <div 
                              className={`absolute inset-0 z-0 transition-all ${activeTheme.className} bg-cover bg-center`}
                              style={{
                                  ...activeTheme.style,
                                  filter: activeTournament.settings.bgBlur ? `blur(${activeTournament.settings.bgBlur}px)` : undefined
                              }}
                          />
                          <div 
                              className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-300 ease-out" 
                              style={{ 
                                  backgroundImage: `url(${bgImage})`,
                                  filter: activeTournament.settings.bgBlur ? `blur(${activeTournament.settings.bgBlur}px)` : undefined,
                                  opacity: 1
                              }} 
                          />
                      </>
                  ) : (
                      <div 
                          className={`absolute inset-0 z-0 transition-all ${activeTheme.className} bg-cover bg-center`}
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

                          <div className="flex items-center gap-2 flex-wrap">
                              {!isExporting && activeTournament.activeStage === 2 && (activeTournament.gslGroups || activeTournament.groups || activeTournament.swissRounds) && (
                                  <>
                                      <button
                                          onClick={() => handleUpdateActive({ ...activeTournament, activeStage: 1 })}
                                          className="px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 cursor-pointer shadow-sm"
                                          title="Вернуться к групповому этапу для просмотра или изменения результатов"
                                      >
                                          ⬅ К группам
                                      </button>
                                      <button
                                          onClick={() => {
                                              if (window.confirm("Пересобрать сетку плей-офф по актуальным результатам групп в новом формате?")) {
                                                  handleAdvanceToBracket();
                                              }
                                          }}
                                          className="px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 flex items-center gap-1.5 cursor-pointer shadow-sm"
                                          title="Пересчитать сетку плей-офф по результатам групп"
                                      >
                                          🔄 Пересобрать плей-офф
                                      </button>
                                  </>
                              )}

                              {!isExporting && activeTournament.activeStage === 1 && (activeTournament.tieredBracketRounds || activeTournament.bracketRounds) && (
                                  <button
                                      onClick={() => handleUpdateActive({ ...activeTournament, activeStage: 2 })}
                                      className="px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 flex items-center gap-1.5 cursor-pointer shadow-sm"
                                      title="Перейти к сетке плей-офф"
                                  >
                                      К плей-офф ➡
                                  </button>
                              )}

                              {!isExporting && canUndoTournament(activeTournament) && (
                                  <div className="flex items-center gap-1.5 bg-red-500/10 p-1 rounded-xl border border-red-500/30 shadow-sm">
                                      <button
                                          onClick={() => handleUndoTournamentRounds(1)}
                                          className="px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all hover:bg-red-500/20 text-red-400 flex items-center gap-1.5 cursor-pointer"
                                          title="Вернуть состояние турнира назад на 1 раунд / шаг"
                                      >
                                          <Undo2 className="w-3.5 h-3.5" /> Назад на 1 раунд
                                      </button>
                                      {(historyStack.length >= 2 || (activeTournament.swissRounds && activeTournament.swissRounds.length > 2)) && (
                                          <button
                                              onClick={() => handleUndoTournamentRounds(2)}
                                              className="px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all hover:bg-red-500/30 text-red-300 bg-red-500/20 border border-red-500/30 flex items-center gap-1.5 cursor-pointer shadow-sm"
                                              title="Вернуть состояние турнира назад на 2 раунда / действия"
                                          >
                                              <Undo2 className="w-3.5 h-3.5" /> Назад на 2 раунда
                                          </button>
                                      )}
                                  </div>
                              )}

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
                      
                      {(() => {
                          const configuredStages = (activeTournament.settings?.stages && activeTournament.settings.stages.length > 0)
                              ? activeTournament.settings.stages
                              : null;

                          const effectiveStage = activeTournament.activeStage || 1;

                          // 1. DEDICATED MULTI-STAGE RENDERING (Beta / Multi-Stage tournaments)
                          if (configuredStages && configuredStages.length > 0) {
                              const currentStageIdx = Math.min(Math.max(0, effectiveStage - 1), configuredStages.length - 1);
                              const currentStageConfig = configuredStages[currentStageIdx];
                              const currentStageType = currentStageConfig?.type || 'playoff';
                              const currentTeams = (currentStageConfig?.teams && currentStageConfig.teams.length > 0)
                                  ? currentStageConfig.teams
                                  : (currentStageIdx === 0 ? (activeTournament.teams || []) : (currentStageConfig?.teams || []));

                              // Build stage-scoped tournament view
                              const stageScopedTournament: Tournament = {
                                  ...activeTournament,
                                  teams: currentTeams,
                                  bracketRounds: currentStageConfig?.bracketRounds || (currentStageType === 'playoff' ? activeTournament.bracketRounds : (currentStageIdx === 0 ? activeTournament.bracketRounds : undefined)),
                                  losersBracketRounds: currentStageConfig?.losersBracketRounds || (currentStageType === 'playoff' ? activeTournament.losersBracketRounds : (currentStageIdx === 0 ? activeTournament.losersBracketRounds : undefined)),
                                  grandFinal: currentStageConfig?.grandFinal || (currentStageType === 'playoff' ? activeTournament.grandFinal : (currentStageIdx === 0 ? activeTournament.grandFinal : undefined)),
                                  groups: currentStageConfig?.groups || (currentStageType === 'groups' ? activeTournament.groups : (currentStageIdx === 0 ? activeTournament.groups : undefined)),
                                  gslGroups: currentStageConfig?.gslGroups || (currentStageType === 'gsl_groups' ? activeTournament.gslGroups : (currentStageIdx === 0 ? activeTournament.gslGroups : undefined)),
                                  swissRounds: currentStageConfig?.swissRounds || (currentStageType === 'swiss' ? activeTournament.swissRounds : (currentStageIdx === 0 ? activeTournament.swissRounds : undefined)),
                                  qualifiersBrackets: currentStageConfig?.qualifiersBrackets || (currentStageType === 'qualifier' ? activeTournament.qualifiersBrackets : (currentStageIdx === 0 ? activeTournament.qualifiersBrackets : undefined))
                              };

                              const handleUpdateCurrentStage = (updatedStageTourn: Tournament) => {
                                  const updatedStages = [...configuredStages];
                                  if (updatedStages[currentStageIdx]) {
                                      updatedStages[currentStageIdx] = {
                                          ...updatedStages[currentStageIdx],
                                          bracketRounds: updatedStageTourn.bracketRounds,
                                          losersBracketRounds: updatedStageTourn.losersBracketRounds,
                                          grandFinal: updatedStageTourn.grandFinal,
                                          groups: updatedStageTourn.groups,
                                          gslGroups: updatedStageTourn.gslGroups,
                                          swissRounds: updatedStageTourn.swissRounds,
                                          qualifiersBrackets: updatedStageTourn.qualifiersBrackets,
                                          teams: updatedStageTourn.teams || updatedStages[currentStageIdx].teams
                                      };
                                  }

                                  const nextTourn: Tournament = {
                                      ...updatedStageTourn,
                                      settings: {
                                          ...activeTournament.settings,
                                          stages: updatedStages
                                      }
                                  };

                                  if (updatedStageTourn.bracketRounds) nextTourn.bracketRounds = updatedStageTourn.bracketRounds;
                                  if (updatedStageTourn.losersBracketRounds) nextTourn.losersBracketRounds = updatedStageTourn.losersBracketRounds;
                                  if (updatedStageTourn.grandFinal) nextTourn.grandFinal = updatedStageTourn.grandFinal;
                                  if (updatedStageTourn.groups) nextTourn.groups = updatedStageTourn.groups;
                                  if (updatedStageTourn.gslGroups) nextTourn.gslGroups = updatedStageTourn.gslGroups;
                                  if (updatedStageTourn.swissRounds) nextTourn.swissRounds = updatedStageTourn.swissRounds;
                                  if (updatedStageTourn.qualifiersBrackets) nextTourn.qualifiersBrackets = updatedStageTourn.qualifiersBrackets;
                                  if (updatedStageTourn.teams) nextTourn.teams = updatedStageTourn.teams;

                                  handleUpdateActive(nextTourn);
                              };

                              const hasMatchesInStage = !!(
                                  (stageScopedTournament.bracketRounds && stageScopedTournament.bracketRounds.length > 0) ||
                                  (stageScopedTournament.groups && stageScopedTournament.groups.length > 0) ||
                                  (stageScopedTournament.gslGroups && stageScopedTournament.gslGroups.length > 0) ||
                                  (stageScopedTournament.swissRounds && stageScopedTournament.swissRounds.length > 0) ||
                                  (stageScopedTournament.qualifiersBrackets && stageScopedTournament.qualifiersBrackets.length > 0) ||
                                  currentStageType === 'qualifier'
                              );

                              return (
                                  <>
                                      {/* Stage Selector Tabs */}
                                      {!isExporting && configuredStages.length > 1 && (
                                          <div className="flex flex-wrap items-center gap-2 mb-8 p-1.5 bg-black/40 border border-white/5 rounded-2xl w-fit mx-auto sm:mx-0 shadow-lg">
                                              {configuredStages.map((stg, sIdx) => {
                                                  const isCurrent = effectiveStage === (sIdx + 1);
                                                  const tCount = stg.teams?.length || 0;
                                                  return (
                                                      <button
                                                          key={sIdx}
                                                          type="button"
                                                          onClick={() => handleUpdateActive({ ...activeTournament, activeStage: (sIdx + 1) as any })}
                                                          className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
                                                              isCurrent
                                                                  ? "bg-white text-black shadow-lg scale-100"
                                                                  : "text-white/40 hover:text-white hover:bg-white/5"
                                                          }`}
                                                      >
                                                          <span>{stg.name || `Стадия ${sIdx + 1}`}</span>
                                                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                                                              isCurrent ? "bg-black/10 text-black font-bold" : "bg-white/5 text-white/40"
                                                          }`}>
                                                              {tCount} {sIdx > 0 ? 'ждут' : 'ком.'}
                                                          </span>
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      )}

                                      {/* Mobile Scroll Hint */}
                                      {!isExporting && (
                                          <div className="flex sm:hidden items-center justify-center gap-2 mb-4 text-white/30 font-bold uppercase text-[9px] tracking-widest animate-pulse">
                                              <ArrowLeftRight className="w-3 h-3" /> Листайте вправо, чтобы увидеть всю сетку
                                          </div>
                                      )}

                                      {/* STAGE HEADER BANNER (especially for Stage 2 & Stage 3 waiting states) */}
                                      {!isExporting && (
                                          <div className="mb-8 p-5 sm:p-6 bg-gradient-to-r from-blue-950/40 via-zinc-900/60 to-purple-950/40 border border-white/10 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                                              <div className="space-y-1">
                                                  <div className="flex items-center gap-2">
                                                      <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg">
                                                          Стадия {currentStageIdx + 1} из {configuredStages.length}
                                                      </span>
                                                      <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
                                                          {currentStageType === 'playoff' ? 'Плей-офф (Сетка)' : currentStageType === 'gsl_groups' ? 'GSL Группы' : currentStageType === 'swiss' ? 'Швейцарка' : currentStageType === 'qualifier' ? 'Квалификации' : 'Групповой этап'}
                                                      </span>
                                                  </div>
                                                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                                                      {currentStageConfig?.name || `Стадия ${currentStageIdx + 1}`}
                                                  </h3>
                                                  <p className="text-xs text-white/60">
                                                      {currentStageIdx === 0
                                                          ? `Стартовая стадия турнира • ${currentTeams.length} команд`
                                                          : `Приглашенные команды: ${currentTeams.length} ждут своего этапа${configuredStages[currentStageIdx - 1] ? ' и победителей из Стадии ' + currentStageIdx : ''}`}
                                                  </p>
                                              </div>

                                              {/* Stage Action Buttons */}
                                              <div className="flex flex-wrap items-center gap-2">
                                                  <button 
                                                      onClick={() => setShowRosters(true)} 
                                                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-zinc-700 flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
                                                  >
                                                      <Users className="w-3.5 h-3.5" /> СОСТАВЫ
                                                  </button>

                                                  <button 
                                                      onClick={() => setIsSwapMode(!isSwapMode)} 
                                                      className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 ${
                                                          isSwapMode 
                                                              ? 'bg-orange-600 text-white shadow-orange-500/30' 
                                                              : 'bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20'
                                                      }`}
                                                      title="Включить режим ручного изменения команд в матчах"
                                                  >
                                                      <ArrowLeftRight className="w-3.5 h-3.5" /> ИЗМЕНИТЬ ПАРЫ
                                                  </button>

                                                  {currentStageIdx > 0 && configuredStages[currentStageIdx - 1] && (
                                                      <button
                                                          type="button"
                                                          onClick={() => {
                                                              const adv = getStageAdvancingTeams(configuredStages[currentStageIdx - 1]);
                                                              if (adv.length === 0) {
                                                                  alert(`В Стадии ${currentStageIdx} пока не определены победители матчей.`);
                                                                  return;
                                                              }
                                                              const updated = advanceTeamsToStage(activeTournament, currentStageIdx - 1, currentStageIdx, adv);
                                                              handleUpdateActive(updated);
                                                          }}
                                                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                                                      >
                                                          <Plus className="w-3.5 h-3.5" />
                                                          Принять победителей из Стадии {currentStageIdx}
                                                      </button>
                                                  )}

                                                  {currentStageIdx < configuredStages.length - 1 && (
                                                      <button
                                                          type="button"
                                                          onClick={() => {
                                                              const adv = getStageAdvancingTeams(currentStageConfig!);
                                                              if (adv.length === 0) {
                                                                  alert(`В текущей Стадии ${currentStageIdx + 1} пока не определены прошедшие команды.`);
                                                                  return;
                                                              }
                                                              const updated = advanceTeamsToStage(activeTournament, currentStageIdx, currentStageIdx + 1, adv);
                                                              handleUpdateActive(updated);
                                                          }}
                                                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                                                      >
                                                          <Trophy className="w-3.5 h-3.5" />
                                                          Передать победителей в {configuredStages[currentStageIdx + 1]?.name || `Стадию ${currentStageIdx + 2}`}
                                                      </button>
                                                  )}

                                                  {(!hasMatchesInStage && currentTeams.length >= 2) && (
                                                      <button
                                                          type="button"
                                                          onClick={() => {
                                                              const built = generateStageData(currentStageType, currentTeams, {
                                                                  eliminationType: activeTournament.settings?.eliminationType,
                                                                  numberOfGroups: activeTournament.settings?.numberOfGroups,
                                                                  matchesPerPairing: activeTournament.settings?.matchesPerPairing,
                                                                  gslAdvanceCount: activeTournament.settings?.gslAdvanceCount,
                                                                  swissWinsToAdvance: activeTournament.settings?.swissWinsToAdvance,
                                                                  swissLossesToEliminate: activeTournament.settings?.swissLossesToEliminate,
                                                                  numQuals: currentStageConfig?.numQuals,
                                                                  advancePerQual: currentStageConfig?.advancePerQual
                                                              });
                                                              const updatedStages = [...configuredStages];
                                                              updatedStages[currentStageIdx] = {
                                                                  ...currentStageConfig!,
                                                                  ...built
                                                              };
                                                              const nextTourn = {
                                                                  ...activeTournament,
                                                                  settings: {
                                                                      ...activeTournament.settings,
                                                                      stages: updatedStages
                                                                  }
                                                              };
                                                              handleUpdateActive(nextTourn);
                                                          }}
                                                          className="px-4 py-2.5 bg-[#ff8f00] hover:bg-[#ff8f00]/90 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                                                      >
                                                          <Play className="w-3.5 h-3.5 fill-black" />
                                                          Сгенерировать сетку для Стадии {currentStageIdx + 1}
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      )}

                                      {/* WAITING TEAMS PREVIEW (when in stage 2 or 3 and matches not generated yet) */}
                                      {!hasMatchesInStage && (
                                          <div className="bg-black/30 border border-white/5 rounded-3xl p-8 mb-8 text-center space-y-6">
                                              <div>
                                                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                                                      <Layers className="w-7 h-7" />
                                                  </div>
                                                  <h4 className="text-xl font-black text-white uppercase tracking-tight">
                                                      {currentTeams.length > 0 ? `Команды в ожидании (${currentTeams.length})` : 'Команды еще не добавлены в эту стадию'}
                                                  </h4>
                                                  <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
                                                      {currentTeams.length > 0 
                                                          ? `Команды приглашены напрямую в Стадию ${currentStageIdx + 1} и ждут своего старта или завершения предыдущего этапа.`
                                                          : `Откройте Настройки турнира (вкладка "Команды"), чтобы добавить или перенести участников в эту стадию.`}
                                                  </p>
                                              </div>

                                              {currentTeams.length > 0 && (
                                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-4xl mx-auto">
                                                      {currentTeams.map((tm, tIdx) => (
                                                          <div key={tm.id || tIdx} className="bg-zinc-900/60 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-2 hover:border-blue-500/40 transition-all">
                                                              <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/5 flex items-center justify-center overflow-hidden p-1">
                                                                  {tm.logoUrl ? (
                                                                      <img src={tm.logoUrl} alt="" className="w-full h-full object-contain" />
                                                                  ) : (
                                                                      <Trophy className="w-5 h-5 text-white/20" />
                                                                  )}
                                                              </div>
                                                              <span className="text-xs font-black text-white uppercase truncate w-full text-center">
                                                                  {tm.name}
                                                              </span>
                                                              <span className="text-[9px] font-bold text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded uppercase">
                                                                  Инвайт
                                                              </span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      )}

                                      {/* STAGE BRACKET / MATCHES RENDERING */}
                                      {hasMatchesInStage && (
                                          <>
                                              {currentStageType === 'gsl_groups' && (
                                                  <GslGroupStage onVetoMatch={handlePlayTournamentMatch} tournament={stageScopedTournament} onUpdate={handleUpdateCurrentStage} onAdvanceToBracket={handleAdvanceToBracket} isExporting={isExporting} isSwapMode={isSwapMode} />
                                              )}
                                              {currentStageType === 'groups' && (
                                                  <GroupStage onVetoMatch={handlePlayTournamentMatch} tournament={stageScopedTournament} onUpdate={handleUpdateCurrentStage} onAdvanceToBracket={handleAdvanceToBracket} isExporting={isExporting} isSwapMode={isSwapMode} />
                                              )}
                                              {currentStageType === 'swiss' && (
                                                  <SwissStage onVetoMatch={handlePlayTournamentMatch} tournament={stageScopedTournament} onUpdate={handleUpdateCurrentStage} onAdvanceToBracket={handleAdvanceToBracket} isExporting={isExporting} isSwapMode={isSwapMode} />
                                              )}
                                              {currentStageType === 'qualifier' && (
                                                  <QualifierStage 
                                                      onVetoMatch={handlePlayTournamentMatch} 
                                                      tournament={stageScopedTournament} 
                                                      onUpdate={handleUpdateCurrentStage} 
                                                      isExporting={isExporting} 
                                                      isSwapMode={isSwapMode}
                                                      onAdvanceToNextStage={currentStageIdx < configuredStages.length - 1 ? (advTeams) => {
                                                          const updated = advanceTeamsToStage(activeTournament, currentStageIdx, currentStageIdx + 1, advTeams);
                                                          handleUpdateActive(updated);
                                                      } : undefined}
                                                      nextStageName={configuredStages[currentStageIdx + 1]?.name || `Стадию ${currentStageIdx + 2}`}
                                                  />
                                              )}
                                              {currentStageType === 'playoff' && (
                                                  stageScopedTournament.tieredBracketRounds && stageScopedTournament.tieredBracketRounds.length > 0 ? (
                                                      <TieredPlayoffStage onVetoMatch={handlePlayTournamentMatch} tournament={stageScopedTournament} onUpdate={handleUpdateCurrentStage} isExporting={isExporting} isSwapMode={isSwapMode} onToggleImportance={handleToggleMatchImportance} />
                                                  ) : (
                                                      <SingleEliminationStage onVetoMatch={handlePlayTournamentMatch} tournament={stageScopedTournament} onUpdate={handleUpdateCurrentStage} isExporting={isExporting} isSwapMode={isSwapMode} onToggleImportance={handleToggleMatchImportance} />
                                                  )
                                              )}
                                          </>
                                      )}
                                  </>
                              );
                          }

                          // 2. LEGACY NON-MULTI-STAGE FALLBACK RENDERING
                          const hasGroupStage = !!(
                              (Array.isArray(activeTournament.gslGroups) && activeTournament.gslGroups.length > 0) ||
                              (Array.isArray(activeTournament.groups) && activeTournament.groups.length > 0) ||
                              (Array.isArray(activeTournament.swissRounds) && activeTournament.swissRounds.length > 0) ||
                              activeTournament.settings?.stage1Type === 'gsl_groups' ||
                              activeTournament.settings?.stage1Type === 'groups' ||
                              activeTournament.settings?.stage1Type === 'swiss' ||
                              (activeTournament.settings?.stage1Type as string) === 'qualifier' ||
                              activeTournament.settings?.mode === 'two_stage' ||
                              activeTournament.settings?.mode === 'swiss'
                          );

                          const hasPlayoffStage = !!(
                              (Array.isArray(activeTournament.bracketRounds) && activeTournament.bracketRounds.length > 0) ||
                              (Array.isArray(activeTournament.tieredBracketRounds) && activeTournament.tieredBracketRounds.length > 0) ||
                              (Array.isArray(activeTournament.losersBracketRounds) && activeTournament.losersBracketRounds.length > 0) ||
                              activeTournament.settings?.stage1Type === 'playoff' ||
                              activeTournament.settings?.mode === 'single_stage' ||
                              (activeTournament.settings?.mode as string) === 'playoff'
                          );

                          const isMultiStage = hasGroupStage && (hasPlayoffStage || activeTournament.activeStage === 2 || (activeTournament.teams && activeTournament.teams.length >= 4));
                          const legacyEffectiveStage = activeTournament.activeStage || (hasPlayoffStage && !hasGroupStage ? 2 : 1);

                          const stage1Label = activeTournament.settings?.stage1Type === 'gsl_groups' 
                              ? 'GSL Группы' 
                              : (activeTournament.settings?.stage1Type as string) === 'qualifier'
                                  ? 'Квалификации'
                                  : (activeTournament.settings?.stage1Type === 'swiss' || activeTournament.settings?.mode === 'swiss')
                                      ? 'Швейцарка' 
                                      : 'Групповой этап';

                          return (
                              <>
                                  {/* Prominent Stage Selector Tabs for Multi-Stage tournaments */}
                                  {!isExporting && isMultiStage && (
                                      <div className="flex items-center gap-2 mb-8 p-1.5 bg-black/40 border border-white/5 rounded-xl w-fit mx-auto sm:mx-0">
                                          {[1, 2].map((stageNum) => (
                                              <button
                                                  key={stageNum}
                                                  type="button"
                                                  onClick={() => handleUpdateActive({ ...activeTournament, activeStage: stageNum as any })}
                                                  className={`px-5 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                                                      legacyEffectiveStage === stageNum
                                                          ? "bg-white text-black shadow"
                                                          : "text-white/40 hover:text-white hover:bg-white/5"
                                                  }`}
                                              >
                                                  {stageNum === 1 ? stage1Label : 'Плей-офф'}
                                              </button>
                                          ))}
                                      </div>
                                  )}

                                  {/* Mobile Scroll Hint */}
                                  {!isExporting && (
                                    <div className="flex sm:hidden items-center justify-center gap-2 mb-4 text-white/30 font-bold uppercase text-[9px] tracking-widest animate-pulse">
                                       <ArrowLeftRight className="w-3 h-3" /> Листайте вправо, чтобы увидеть всю сетку
                                    </div>
                                  )}

                                  {/* STAGE 1: GROUPS / GSL / SWISS */}
                                  {legacyEffectiveStage === 1 && hasGroupStage && (
                                      <>
                                          {(activeTournament.settings?.stage1Type === 'gsl_groups' || (!activeTournament.settings?.stage1Type && activeTournament.gslGroups && activeTournament.gslGroups.length > 0)) && (
                                              <GslGroupStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} onAdvanceToBracket={handleAdvanceToBracket} isExporting={isExporting} isSwapMode={isSwapMode} />
                                          )}
                                          {(activeTournament.settings?.stage1Type === 'groups' || (!activeTournament.settings?.stage1Type && ((activeTournament.groups && activeTournament.groups.length > 0) || activeTournament.settings?.mode === 'two_stage'))) && (
                                              <GroupStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} onAdvanceToBracket={handleAdvanceToBracket} isExporting={isExporting} isSwapMode={isSwapMode} />
                                          )}
                                          {(activeTournament.settings?.stage1Type === 'swiss' || (!activeTournament.settings?.stage1Type && ((activeTournament.swissRounds && activeTournament.swissRounds.length > 0) || activeTournament.settings?.mode === 'swiss'))) && (
                                              <SwissStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} onAdvanceToBracket={handleAdvanceToBracket} isExporting={isExporting} isSwapMode={isSwapMode} />
                                          )}
                                          {(activeTournament.settings?.stage1Type as string) === 'qualifier' && (
                                              <QualifierStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} isExporting={isExporting} isSwapMode={isSwapMode} />
                                          )}
                                      </>
                                  )}

                                  {/* STAGE 2 OR SINGLE STAGE PLAYOFF (FAIL-SAFE BRACKET RENDERING) */}
                                  {(legacyEffectiveStage === 2 || !hasGroupStage) && (
                                      activeTournament.tieredBracketRounds && activeTournament.tieredBracketRounds.length > 0 ? (
                                          <TieredPlayoffStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} isExporting={isExporting} isSwapMode={isSwapMode} onToggleImportance={handleToggleMatchImportance} />
                                      ) : (
                                          <SingleEliminationStage onVetoMatch={handlePlayTournamentMatch} tournament={activeTournament} onUpdate={handleUpdateActive} isExporting={isExporting} isSwapMode={isSwapMode} onToggleImportance={handleToggleMatchImportance} />
                                      )
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
                                                  } else if (activeTournament.settings?.eliminationType === 'double') {
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
                                              className="px-12 py-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl font-black text-2xl uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:scale-105 transition-all hover:shadow-[0_0_60px_rgba(239,68,68,0.6)] flex flex-col items-center gap-2 cursor-pointer"
                                          >
                                              <span>Завершить турнир</span>
                                              <span className="text-sm font-bold text-white/70">Подвести итоги и Топ-20</span>
                                          </button>
                                      </div>
                                  )}
                              </>
                          );
                      })()}
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
                                          <TeamLogo teamName={team.name} logoUrl={team.logoUrl} sizeClassName="w-6 h-6 shrink-0" />
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

              {showLeaders && activeTournament && (
                  <LeadersModal
                      user={user}
                      tournamentId={activeTournament.id}
                      onClose={() => setShowLeaders(false)}
                  />
              )}

              {showCustomizationModal && activeTournament && (
                  <TournamentStyleModal
                      isOpen={showCustomizationModal}
                      onClose={() => setShowCustomizationModal(false)}
                      currentBoxStyle={activeTournament.settings?.boxStyle || 'dark'}
                      currentCardColor={activeTournament.settings?.cardThemeColor || '#ff8f00'}
                      currentBgTheme={activeTournament.settings?.bgTheme || 'cyber_grid'}
                      bgThemes={BG_THEMES}
                      onSelectBoxStyle={(styleId) => {
                          const updated = {
                              ...activeTournament,
                              settings: {
                                  ...activeTournament.settings,
                                  boxStyle: styleId as any
                              }
                          };
                          handleUpdateActive(updated);
                      }}
                      onSelectCardColor={(colorHex) => {
                          const updated = {
                              ...activeTournament,
                              settings: {
                                  ...activeTournament.settings,
                                  cardThemeColor: colorHex
                              }
                          };
                          handleUpdateActive(updated);
                      }}
                      onSelectBgTheme={(themeId) => handleThemeSelect(themeId)}
                      onUploadBg={handleBgUpload}
                  />
              )}

              {showDownloadModal && activeTournament && (
                  <DownloadBracketModal
                      isOpen={showDownloadModal}
                      onClose={() => setShowDownloadModal(false)}
                      tournament={activeTournament}
                      stageElement={stageRef.current}
                      onExportStart={() => setIsExporting(true)}
                      onExportEnd={() => setIsExporting(false)}
                      onNotify={(msg) => {
                          setSaveToastMessage(msg);
                          setTimeout(() => setSaveToastMessage(null), 3000);
                      }}
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

              {showRosters && activeTournament && (
                  <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                      <div className="bg-[#0b0b0f] border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
                              <div className="flex items-center gap-5">
                                  <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                      <Users className="w-8 h-8" />
                                  </div>
                                  <div>
                                      <h3 className="font-black text-2xl text-white uppercase tracking-tight">Составы команд</h3>
                                      <p className="text-sm text-white/40 font-medium">Управление участниками и их ростерами в турнире</p>
                                  </div>
                              </div>
                              <button 
                                  onClick={() => setShowRosters(false)}
                                  className="p-3 hover:bg-white/5 text-white/30 hover:text-white rounded-2xl transition-all cursor-pointer"
                              >
                                  <X className="w-8 h-8" />
                              </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(activeTournament.teams || []).map((team, idx) => {
                                      const roster = (activeTournament.settings as any)?.rosters?.find((r: any) => r.id === team.id || r.name === team.name);
                                      const players = roster?.players || team.players || [];
                                      
                                      return (
                                          <div key={team.id || idx} className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all group">
                                              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/5">
                                                  <TeamLogo teamName={team.name} logoUrl={team.logoUrl} sizeClassName="w-12 h-12" />
                                                  <div>
                                                      <h4 className="font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{team.name}</h4>
                                                      <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{players.length} игроков</p>
                                                  </div>
                                              </div>
                                              
                                              <div className="space-y-2">
                                                  {players.length > 0 ? (
                                                      players.map((p: any, pIdx: number) => (
                                                          <div key={pIdx} className="flex items-center justify-between bg-black/40 px-4 py-2 rounded-xl border border-white/5 group/player hover:border-blue-500/30 transition-all">
                                                              <div className="flex items-center gap-3">
                                                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                                  <span className="text-xs font-bold text-white/80 group-hover/player:text-white transition-colors">{p.nickname || p.name}</span>
                                                              </div>
                                                              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{p.role || 'Игрок'}</span>
                                                          </div>
                                                      ))
                                                  ) : (
                                                      <div className="py-4 text-center">
                                                          <p className="text-[10px] font-bold text-white/20 uppercase italic">Состав не указан</p>
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                          <div className="p-8 border-t border-white/5 bg-black/40 flex justify-center">
                              <button 
                                  onClick={() => setShowRosters(false)}
                                  className="px-10 py-3 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl border border-white/10 transition-all cursor-pointer"
                              >
                                  Закрыть
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
  );
}

  if (isCreating) {
      return (
          <div className="w-full max-w-4xl mx-auto">
              <button onClick={() => { setIsCreating(false); setTemplateForCreation(null); setCreationError(''); }} className="flex items-center gap-2 text-white/50 hover:text-white mb-6">
                  <ArrowLeft className="w-4 h-4" /> Отмена
              </button>
              <h2 className="text-3xl font-black mb-8">Создать турнир {templateForCreation ? '(по шаблону)' : ''}</h2>
              {creationError && (
                  <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-xl mb-6 text-center font-bold animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                      {creationError}
                  </div>
              )}
              <TournamentSettingsForm 
                  user={user} 
                  onSave={handleCreate} 
                  submitLabel="Создать и Начать" 
                  initialGame={activeGame}
                  initialName={templateForCreation ? templateForCreation.name : ""}
                  initialLogoUrl={templateForCreation ? templateForCreation.logoUrl : ""}
                  initialPrizePool={templateForCreation ? templateForCreation.prizePool : (activeGame === 'so2' ? '1,500,000 ₽' : '$100,000')}
                  initialSettings={templateForCreation ? templateForCreation.settings : (isQuickGrid ? { mode: 'single_stage', numStages: 1, stages: [{ id: 'stage_1', name: 'Сетка', type: 'playoff', teams: [] }] } as any : undefined)}
              />
          </div>
      );
  }


  const currentUniverseTournaments = Array.isArray(tournaments) ? tournaments.filter(t => {
    const tGame = t.game || t.settings?.game || 'cs2';
    if (activeGame === 'so2') return tGame === 'so2';
    return tGame !== 'so2';
  }) : [];

  const filteredTournaments = currentUniverseTournaments.filter(t => {
    const matchesSearch = (t.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeTabList === 'templates') return (t as any).isTemplate === true;
    if ((t as any).isTemplate === true) return false;
    if (activeTabList === 'completed') return (t.completed || (t as any).status === 'completed');
    return (!t.completed && (t as any).status !== 'completed');
  });

  return (
    <div className="w-full h-full min-h-screen bg-[#050508] text-white">
      <div className="max-w-[1800px] mx-auto px-4 py-8 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="flex items-center flex-wrap gap-4">
              <h2 className="text-4xl font-black flex items-center gap-3 text-white tracking-tight uppercase">
                  <Trophy className={`w-10 h-10 ${activeGame === 'so2' ? 'text-orange-500' : 'text-[#ff8f00]'} drop-shadow-[0_0_15px_rgba(255,143,0,0.3)]`} /> 
                  Турниры
              </h2>
              <div className="flex items-center bg-zinc-900/80 p-1 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
                <button 
                  onClick={() => setActiveGame('cs2')}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
                    activeGame === 'cs2'
                      ? 'bg-[#ff8f00] text-black shadow-[0_0_20px_rgba(255,143,0,0.4)]'
                      : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>CS2</span>
                </button>
                <button 
                  onClick={() => setActiveGame('so2')}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
                    activeGame === 'so2'
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                      : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>SO2</span>
                </button>
              </div>
            </div>
            <p className="text-zinc-500 text-sm mt-3 font-medium max-w-lg">
              {activeGame === 'so2' 
                ? 'Профессиональные лиги и открытые чемпионаты по Standoff 2. Управляйте сетками и следите за результатами.' 
                : 'Главный хаб турниров Counter-Strike 2. Создавайте свои события или выбирайте из существующих шаблонов.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl shadow-2xl overflow-x-auto max-w-full">
              <button 
                onClick={() => setActiveTabList('active')}
                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTabList === 'active' 
                    ? 'bg-zinc-800 text-white border border-white/10 shadow-lg' 
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                🏆 Активные ({currentUniverseTournaments.filter(t => !t.completed && (t as any).status !== 'completed' && !(t as any).isTemplate).length})
              </button>
              <button 
                onClick={() => setActiveTabList('completed')}
                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTabList === 'completed' 
                    ? 'bg-zinc-800 text-white border border-white/10 shadow-lg' 
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                📜 История ({currentUniverseTournaments.filter(t => (t.completed || (t as any).status === 'completed') && !(t as any).isTemplate).length})
              </button>
              <button 
                onClick={() => setActiveTabList('templates')}
                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  activeTabList === 'templates' 
                    ? 'bg-zinc-800 text-white border border-white/10 shadow-lg' 
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                📑 Шаблоны ({currentUniverseTournaments.filter(t => (t as any).isTemplate === true).length})
              </button>
            </div>

            <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setIsQuickGrid(true); setIsCreating(true); }} 
                  className="bg-zinc-800 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-wider flex items-center gap-3 hover:bg-zinc-700 transition-all border border-white/5 cursor-pointer text-xs"
                >
                    <Layout className="w-5 h-5 text-blue-400" /> БЕЗ СТАДИЙ
                </button>

                <button 
                  onClick={() => { setIsQuickGrid(false); setIsCreating(true); }} 
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-wider flex items-center gap-3 hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 transform hover:scale-105 active:scale-95 cursor-pointer text-xs"
                >
                    <Plus className="w-5 h-5" /> Создать турнир
                </button>
            </div>
          </div>
        </div>

        <div className="mb-10 relative group max-w-2xl animate-in fade-in slide-in-from-top-2 duration-600">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text"
            placeholder="Поиск турнира..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/40 border border-white/5 rounded-[1.25rem] pl-14 pr-6 py-4.5 text-white outline-none focus:border-blue-500/30 focus:bg-zinc-900/60 transition-all font-bold placeholder:text-zinc-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {filteredTournaments.map(t => {
                const rawTBg = t.settings?.bgImage || getTournamentBgImage(t.id);
                const isMapCardBg = rawTBg && (String(rawTBg).includes('/maps/') || String(rawTBg).startsWith('/maps/'));
                const cardBgImg = (!isMapCardBg && rawTBg && rawTBg !== 'null' && rawTBg !== 'undefined' && String(rawTBg).trim() !== '') ? rawTBg : null;
                const cardThemeKey = t.settings?.bgTheme || 'cyber_grid';
                const cardTheme = getCleanTournamentTheme(cardThemeKey);

                return (
                <div 
                  key={t.id} 
                  onClick={() => {
                    if (activeTabList === 'templates') {
                      setTemplateForCreation(t);
                      setIsCreating(true);
                    } else {
                      concentrateOnTournament(t, userId);
                      setActiveTournament(t);
                    }
                  }} 
                  className="group bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] p-8 hover:border-blue-500/50 hover:bg-zinc-800 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[280px] shadow-2xl hover:shadow-blue-500/10"
                >
                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] group-hover:bg-blue-500/10 transition-all pointer-events-none" />
                    
                    {cardBgImg && (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none" 
                          style={{ backgroundImage: `url(${cardBgImg})` }} 
                        />
                    )}

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6 gap-4">
                          <div className="flex items-center gap-5">
                            {t.logoUrl ? (
                              <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-white/5 p-2 shadow-2xl group-hover:scale-110 transition-transform overflow-hidden flex items-center justify-center">
                                <img 
                                  src={t.logoUrl} 
                                  alt={t.name} 
                                  className="w-full h-full object-contain"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-700 font-black text-3xl shadow-inner flex-shrink-0 group-hover:scale-110 transition-transform">
                                  <Trophy className="w-10 h-10" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="font-black text-2xl text-white group-hover:text-blue-400 transition-colors line-clamp-1 uppercase tracking-tighter">{t.name || 'Турнир'}</h3>
                              <div className="flex items-center gap-3 mt-2">
                                 <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${activeGame === 'so2' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                    {t.game === 'so2' ? 'Standoff 2' : 'CS2'}
                                 </span>
                                 <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">💰 {t.prizePool || '$100,000'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 relative z-20">
                            {activeTabList === 'templates' ? (
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTemplateForCreation(t);
                                    setIsCreating(true);
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-[#ff8f00] text-zinc-500 hover:text-black rounded-xl transition-all shadow-xl"
                                title="Использовать шаблон"
                              >
                                  <Play className="w-5 h-5 fill-current" />
                              </button>
                            ) : (
                              <button 
                                onClick={(e) => handleSaveAsTemplate(e, t)}
                                className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-emerald-600 text-zinc-500 hover:text-white rounded-xl transition-all shadow-xl"
                                title="В шаблон"
                              >
                                  <Bookmark className="w-5 h-5" />
                              </button>
                            )}
                            <button 
                              onClick={(e) => handleDelete(e, t.id)} 
                              className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-red-600 text-zinc-500 hover:text-white rounded-xl transition-all shadow-xl"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                      </div>

                      {activeTabList !== 'templates' && (t.completed || (t as any).status === 'completed' || t.winnerName) && (
                        <div className="mb-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-4">
                          <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-xl shadow-lg">👑</div>
                          <div>
                            <div className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Победитель</div>
                            <div className="text-lg font-black text-white uppercase tracking-tight truncate max-w-[150px]">{t.winnerName || 'ТБД'}</div>
                          </div>
                        </div>
                      )}

                      {(t.settings?.stages?.length || 1) > 1 && (
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Стадий</span>
                              <span className="text-xs font-bold text-zinc-300">
                                {(t.settings?.stages?.length || 1)} Этапов
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Статус</span>
                              <span className={`text-xs font-black uppercase flex items-center gap-1.5 ${activeTabList === 'templates' ? 'text-zinc-600' : (t.completed || (t as any).status === 'completed' ? 'text-yellow-500' : 'text-emerald-500')}`}>
                                 {activeTabList === 'templates' ? 'Шаблон' : (t.completed || (t as any).status === 'completed' ? 'Завершен' : 'В эфире')}
                                 {!t.completed && (t as any).status !== 'completed' && activeTabList !== 'templates' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                              </span>
                            </div>
                        </div>
                      )}

                      {(t.settings?.stages?.length || 1) <= 1 && (
                        <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Статус</span>
                                <span className={`text-xs font-black uppercase flex items-center gap-1.5 ${activeTabList === 'templates' ? 'text-zinc-600' : (t.completed || (t as any).status === 'completed' ? 'text-yellow-500' : 'text-emerald-500')}`}>
                                  {activeTabList === 'templates' ? 'Шаблон' : (t.completed || (t as any).status === 'completed' ? 'Завершен' : 'Активен')}
                                  {!t.completed && (t as any).status !== 'completed' && activeTabList !== 'templates' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                </span>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Формат</span>
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-tight">
                                  {t.settings?.mode === 'swiss' ? 'Швейцарка' : (t.settings?.eliminationType === 'double' ? 'Double Elim' : 'Single Elim')}
                                </span>
                              </div>
                            </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex items-center justify-between group-hover:translate-x-2 transition-transform">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                        {activeTabList === 'templates' ? 'Начать по шаблону' : 'Открыть турнир'}
                      </span>
                      <ChevronDown className="w-5 h-5 text-zinc-700 -rotate-90 group-hover:text-blue-500 transition-colors" />
                    </div>
                </div>
              );
            })}

            {filteredTournaments.length === 0 && (
                <div className="col-span-full py-32 text-center border-2 border-dashed border-zinc-800 rounded-[3rem] bg-zinc-900/20">
                    <Trophy className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                    <h3 className="font-black text-2xl text-white mb-2 uppercase tracking-tighter">Ничего не найдено</h3>
                    <p className="text-zinc-600 font-medium mb-10">Попробуйте изменить поисковый запрос или фильтры.</p>
                    <button 
                      onClick={() => { setSearchQuery(''); setActiveTabList('active'); }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white font-black px-10 py-4 rounded-2xl transition-all uppercase text-xs tracking-widest border border-white/5"
                    >
                      Сбросить поиск
                    </button>
                </div>
            )}
        </div>
      </div>



      <So2MediaLibraryModal
        isOpen={showSo2Folder}
        onClose={() => setShowSo2Folder(false)}
      />
    </div>
  );
}
