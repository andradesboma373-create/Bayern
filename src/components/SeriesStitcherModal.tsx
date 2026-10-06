import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Upload, Trophy, Trash2, Check, AlertCircle, 
  Layers, Download, Loader2, Sparkles, RefreshCw, FileText, ChevronRight, Edit2, ShieldAlert
} from 'lucide-react';
import { downloadElementAsImage } from '../lib/exportImage';
import TeamLogo from './TeamLogo';
import PlayerAvatar from './PlayerAvatar';
import { getCanonicalRoomId } from './setka_tourn/storage';

export interface SeriesMapData {
  id: string;
  mapNumber: number;
  mapName: string;
  imagePreview?: string;
  team1Name: string;
  team2Name: string;
  score1: number;
  score2: number;
  team1Players: Array<{
    nickname: string;
    kills: number;
    assists: number;
    deaths: number;
    damage: number;
    rating: number;
  }>;
  team2Players: Array<{
    nickname: string;
    kills: number;
    assists: number;
    deaths: number;
    damage: number;
    rating: number;
  }>;
  validationStatus: 'valid' | 'rejected' | 'pending';
  validationError?: string;
}

interface Props {
  user?: any;
  onClose: () => void;
  onSavedToTop?: (matchData: any) => void;
}

export default function SeriesStitcherModal({ user, onClose, onSavedToTop }: Props) {
  const [format, setFormat] = useState<'BO3' | 'BO5'>('BO3');
  const [maps, setMaps] = useState<SeriesMapData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSlotUploading, setActiveSlotUploading] = useState<number | null>(null);
  const [editingMapData, setEditingMapData] = useState<SeriesMapData | null>(null);
  const [selectedResultTab, setSelectedResultTab] = useState<'overall' | number>('overall');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const stitchedResultRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetUploadSlot = useRef<number>(1);

  const maxMaps = format === 'BO3' ? 3 : 5;
  const winsRequired = format === 'BO3' ? 2 : 3;

  // Global Paste listener (Ctrl+V) for instant screenshot pasting
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const takenSlots = new Set(maps.map(m => m.mapNumber));
            let targetSlot = 1;
            for (let s = 1; s <= maxMaps; s++) {
              if (!takenSlots.has(s)) {
                targetSlot = s;
                break;
              }
            }
            handleUploadMapSlot(targetSlot, file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [maps, maxMaps]);

  // Calculate series score from valid maps
  const { seriesScore1, seriesScore2, isSeriesFinished } = useMemo(() => {
    let s1 = 0;
    let s2 = 0;
    maps.forEach(m => {
      if (m.validationStatus === 'valid') {
        if (m.score1 > m.score2) s1++;
        else if (m.score2 > m.score1) s2++;
      }
    });
    const finished = s1 >= winsRequired || s2 >= winsRequired;
    return { seriesScore1: s1, seriesScore2: s2, isSeriesFinished: finished };
  }, [maps, winsRequired]);

  // Combined stats across all valid maps
  const aggregatedSeriesData = useMemo(() => {
    const validMaps = maps.filter(m => m.validationStatus === 'valid');
    if (validMaps.length === 0) return null;

    const firstMap = validMaps[0];
    const team1Name = firstMap.team1Name;
    const team2Name = firstMap.team2Name;

    const team1StatsMap = new Map<string, { kills: number; deaths: number; assists: number; damage: number; ratingSum: number; mapsCount: number }>();
    const team2StatsMap = new Map<string, { kills: number; deaths: number; assists: number; damage: number; ratingSum: number; mapsCount: number }>();

    validMaps.forEach(m => {
      // Determine if team order aligns with first map
      const sameOrder = m.team1Name.toLowerCase().trim() === team1Name.toLowerCase().trim();
      const currentT1Players = sameOrder ? m.team1Players : m.team2Players;
      const currentT2Players = sameOrder ? m.team2Players : m.team1Players;

      currentT1Players.forEach(p => {
        const key = p.nickname.trim();
        const cur = team1StatsMap.get(key) || { kills: 0, deaths: 0, assists: 0, damage: 0, ratingSum: 0, mapsCount: 0 };
        cur.kills += p.kills || 0;
        cur.deaths += p.deaths || 0;
        cur.assists += p.assists || 0;
        cur.damage += p.damage || 0;
        cur.ratingSum += p.rating || 1.0;
        cur.mapsCount += 1;
        team1StatsMap.set(key, cur);
      });

      currentT2Players.forEach(p => {
        const key = p.nickname.trim();
        const cur = team2StatsMap.get(key) || { kills: 0, deaths: 0, assists: 0, damage: 0, ratingSum: 0, mapsCount: 0 };
        cur.kills += p.kills || 0;
        cur.deaths += p.deaths || 0;
        cur.assists += p.assists || 0;
        cur.damage += p.damage || 0;
        cur.ratingSum += p.rating || 1.0;
        cur.mapsCount += 1;
        team2StatsMap.set(key, cur);
      });
    });

    const formatPlayerList = (statsMap: Map<string, any>, team: string) => {
      const list: any[] = [];
      statsMap.forEach((v, nickname) => {
        const kd = v.deaths > 0 ? (v.kills / v.deaths).toFixed(2) : (v.kills).toFixed(2);
        const adr = v.mapsCount > 0 ? Math.round(v.damage / v.mapsCount) : 0;
        const avgRating = v.mapsCount > 0 ? (v.ratingSum / v.mapsCount).toFixed(2) : '1.00';
        list.push({
          nickname,
          team,
          kills: v.kills,
          deaths: v.deaths,
          assists: v.assists,
          kd: parseFloat(kd),
          adr,
          hltvRating: parseFloat(avgRating),
          rating: parseFloat(avgRating),
          diff: v.kills - v.deaths
        });
      });
      list.sort((a, b) => b.hltvRating - a.hltvRating || b.diff - a.diff || b.kills - a.kills);
      return list;
    };

    const team1Aggregated = formatPlayerList(team1StatsMap, team1Name);
    const team2Aggregated = formatPlayerList(team2StatsMap, team2Name);

    // Find MVP of the series
    const winningTeamList = seriesScore1 > seriesScore2 ? team1Aggregated : (seriesScore2 > seriesScore1 ? team2Aggregated : [...team1Aggregated, ...team2Aggregated]);
    const mvpCandidate = winningTeamList.length > 0 ? winningTeamList[0] : null;

    return {
      team1Name,
      team2Name,
      team1Aggregated,
      team2Aggregated,
      mvp: mvpCandidate,
      validMaps
    };
  }, [maps, seriesScore1, seriesScore2]);

  // Validation function: Compare Map with base Map 1 (with alias tolerance & nickname normalization)
  const validateMapAgainstBase = (newMap: SeriesMapData, existingMaps: SeriesMapData[]): { isValid: boolean; error?: string } => {
    const validBase = existingMaps.find(m => m.validationStatus === 'valid' && m.id !== newMap.id);
    if (!validBase) {
      // First map is valid by default
      return { isValid: true };
    }

    const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
    const cleanNick = (s: string) => norm(String(s || '').replace(/^\[.*?\]\s*/, '').replace(/^[A-Za-z0-9_-]+\.\s*/, ''));

    const areTeamsMatching = (tA: string, tB: string) => {
      const a = norm(tA);
      const b = norm(tB);
      if (!a || !b) return true;
      if (a === b) return true;
      if ((a.length >= 3 && b.includes(a)) || (b.length >= 3 && a.includes(b))) return true;

      const aliases: Record<string, string[]> = {
        'navi': ['natusvincere', 'нави', 'натусвинсере'],
        'faze': ['fazeclan', 'фейз', 'фейзклан'],
        'spirit': ['teamspirit', 'спирит'],
        'vitality': ['teamvitality', 'виталити'],
        'vp': ['virtuspro', 'виртуспро'],
        'g2': ['g2esports', 'джи2'],
        'mouz': ['mousesports', 'мауз'],
        'cloud9': ['c9', 'клауд9'],
        'liquid': ['teamliquid', 'ликвид'],
        'astralis': ['астралис']
      };

      for (const [canonical, syns] of Object.entries(aliases)) {
        const isA = a === canonical || syns.includes(a);
        const isB = b === canonical || syns.includes(b);
        if (isA && isB) return true;
      }
      return false;
    };

    const straightMatch = areTeamsMatching(validBase.team1Name, newMap.team1Name) && areTeamsMatching(validBase.team2Name, newMap.team2Name);
    const swappedMatch = areTeamsMatching(validBase.team1Name, newMap.team2Name) && areTeamsMatching(validBase.team2Name, newMap.team1Name);

    if (!straightMatch && !swappedMatch) {
      return {
        isValid: false,
        error: `ОТКАЗ: Разные команды! На Карте 1 играли «${validBase.team1Name}» vs «${validBase.team2Name}», а на этой карте обнаружены «${newMap.team1Name}» vs «${newMap.team2Name}». Все карты серии должны быть между одними и теми же командами.`
      };
    }

    // Check Players for each team
    const baseT1Players = new Set(
      (straightMatch ? validBase.team1Players : validBase.team2Players).map(p => cleanNick(p.nickname))
    );
    const baseT2Players = new Set(
      (straightMatch ? validBase.team2Players : validBase.team1Players).map(p => cleanNick(p.nickname))
    );

    const newT1PlayerNames = newMap.team1Players.map(p => cleanNick(p.nickname));
    const newT2PlayerNames = newMap.team2Players.map(p => cleanNick(p.nickname));

    const missingInT1 = newT1PlayerNames.filter(name => name.length > 1 && !baseT1Players.has(name));
    const missingInT2 = newT2PlayerNames.filter(name => name.length > 1 && !baseT2Players.has(name));

    // Tolerance: Allow up to 1 substitute or OCR typo per team
    if (missingInT1.length > 2 || missingInT2.length > 2) {
      const diffList = [...missingInT1, ...missingInT2].slice(0, 4).join(', ');
      return {
        isValid: false,
        error: `ОТКАЗ: Разные игроки! Составы игроков не совпадают с Картой 1. Несовпадающие никнеймы: [${diffList}]. В серии должны участвовать те же составы игроков.`
      };
    }

    return { isValid: true };
  };

  // Process uploaded screenshot
  const handleUploadMapSlot = async (slotNumber: number, file: File) => {
    setActiveSlotUploading(slotNumber);
    setIsProcessing(true);

    try {
      const previewUrl = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append('media', file);

      let extractedData: any = null;
      try {
        const res = await fetch('/api/gemini/extract-stats', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          extractedData = await res.json();
        } else if (res.status === 429) {
          throw new Error('Лимит запросов к ИИ. Подождите несколько секунд или используйте ручной ввод.');
        } else {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error || 'Не удалось распознать скриншот');
        }
      } catch (apiErr: any) {
        console.warn('AI Extraction failed:', apiErr);
        // Prompt user and open editor
        alert(`⚠️ ИИ не смог распознать игроков на этом скриншоте (${apiErr.message}). Сейчас откроется окно ручного ввода и проверки данных карты.`);
        setEditingMapData({
          id: 's_map_' + Date.now() + '_' + slotNumber,
          mapNumber: slotNumber,
          mapName: `Карта ${slotNumber}`,
          imagePreview: previewUrl,
          team1Name: maps[0]?.team1Name || 'Команда 1',
          team2Name: maps[0]?.team2Name || 'Команда 2',
          score1: 13,
          score2: 10,
          team1Players: [
            { nickname: 'Player 1', kills: 20, deaths: 14, assists: 4, damage: 85, rating: 1.25 },
            { nickname: 'Player 2', kills: 18, deaths: 15, assists: 3, damage: 78, rating: 1.15 },
            { nickname: 'Player 3', kills: 16, deaths: 16, assists: 5, damage: 72, rating: 1.05 },
            { nickname: 'Player 4', kills: 14, deaths: 17, assists: 4, damage: 68, rating: 0.95 },
            { nickname: 'Player 5', kills: 11, deaths: 18, assists: 7, damage: 60, rating: 0.85 }
          ],
          team2Players: [
            { nickname: 'Rival 1', kills: 22, deaths: 16, assists: 3, damage: 88, rating: 1.28 },
            { nickname: 'Rival 2', kills: 17, deaths: 17, assists: 4, damage: 75, rating: 1.08 },
            { nickname: 'Rival 3', kills: 15, deaths: 17, assists: 5, damage: 70, rating: 0.98 },
            { nickname: 'Rival 4', kills: 12, deaths: 18, assists: 6, damage: 64, rating: 0.88 },
            { nickname: 'Rival 5', kills: 8, deaths: 19, assists: 2, damage: 50, rating: 0.72 }
          ],
          validationStatus: 'valid'
        });
        return;
      }

      const team1Name = extractedData.team1Name || (maps[0]?.team1Name) || 'Команда 1';
      const team2Name = extractedData.team2Name || (maps[0]?.team2Name) || 'Команда 2';
      const score1 = Number(extractedData.score1) || 13;
      const score2 = Number(extractedData.score2) || 10;
      const mapName = extractedData.mapName || `Карта ${slotNumber}`;

      // Separate players by team intelligently
      const allPlayers = Array.isArray(extractedData.players) ? extractedData.players : [];
      const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
      const t1Norm = norm(team1Name);
      const t2Norm = norm(team2Name);

      let t1p: any[] = [];
      let t2p: any[] = [];

      allPlayers.forEach((p: any) => {
        const pTeam = norm(p.team);
        if (pTeam === t1Norm || (t1Norm.length > 2 && pTeam.includes(t1Norm)) || (pTeam.length > 2 && t1Norm.includes(pTeam)) || pTeam === 'ct' || pTeam === 'counterterrorists') {
          t1p.push(p);
        } else if (pTeam === t2Norm || (t2Norm.length > 2 && pTeam.includes(t2Norm)) || (pTeam.length > 2 && t2Norm.includes(pTeam)) || pTeam === 't' || pTeam === 'terrorists') {
          t2p.push(p);
        } else {
          if (t1p.length <= t2p.length) t1p.push(p);
          else t2p.push(p);
        }
      });

      if (t1p.length === 0 || t2p.length === 0) {
        t1p = allPlayers.slice(0, Math.ceil(allPlayers.length / 2));
        t2p = allPlayers.slice(Math.ceil(allPlayers.length / 2));
      }

      const mapCandidate: SeriesMapData = {
        id: 's_map_' + Date.now() + '_' + slotNumber,
        mapNumber: slotNumber,
        mapName,
        imagePreview: previewUrl,
        team1Name,
        team2Name,
        score1,
        score2,
        team1Players: t1p.map((p: any) => ({
          nickname: p.nickname || p.name || 'Player',
          kills: Number(p.kills) || 0,
          deaths: Number(p.deaths) || 0,
          assists: Number(p.assists) || 0,
          damage: Number(p.damage) || 0,
          rating: Number(p.rating) || 1.0
        })),
        team2Players: t2p.map((p: any) => ({
          nickname: p.nickname || p.name || 'Player',
          kills: Number(p.kills) || 0,
          deaths: Number(p.deaths) || 0,
          assists: Number(p.assists) || 0,
          damage: Number(p.damage) || 0,
          rating: Number(p.rating) || 1.0
        })),
        validationStatus: 'pending'
      };

      // Perform validation against existing maps
      const validation = validateMapAgainstBase(mapCandidate, maps);
      mapCandidate.validationStatus = validation.isValid ? 'valid' : 'rejected';
      mapCandidate.validationError = validation.error;

      // Update state
      setMaps(prev => {
        const filtered = prev.filter(m => m.mapNumber !== slotNumber);
        const nextList = [...filtered, mapCandidate].sort((a, b) => a.mapNumber - b.mapNumber);
        return nextList;
      });

      setSaveNotice(`✓ Карта ${slotNumber} распознана: ${team1Name} (${score1}) vs ${team2Name} (${score2})!`);
      setTimeout(() => setSaveNotice(null), 3500);

    } catch (err: any) {
      alert(`Ошибка обработки скриншота: ${err.message || 'Не удалось распознать'}`);
    } finally {
      setIsProcessing(false);
      setActiveSlotUploading(null);
    }
  };

  // Save changes from Edit Modal
  const handleSaveMapEdit = () => {
    if (!editingMapData) return;
    const validation = validateMapAgainstBase(editingMapData, maps);
    const updated = {
      ...editingMapData,
      validationStatus: validation.isValid ? 'valid' as const : 'rejected' as const,
      validationError: validation.error
    };
    setMaps(prev => {
      const filtered = prev.filter(m => m.mapNumber !== updated.mapNumber);
      return [...filtered, updated].sort((a, b) => a.mapNumber - b.mapNumber);
    });
    setEditingMapData(null);
    setSaveNotice(`✓ Карта ${updated.mapNumber} сохранена!`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  // Force mark valid (Override mismatch)
  const handleForceValid = () => {
    if (!editingMapData) return;
    const updated = {
      ...editingMapData,
      validationStatus: 'valid' as const,
      validationError: undefined
    };
    setMaps(prev => {
      const filtered = prev.filter(m => m.mapNumber !== updated.mapNumber);
      return [...filtered, updated].sort((a, b) => a.mapNumber - b.mapNumber);
    });
    setEditingMapData(null);
    setSaveNotice(`✓ Карта ${updated.mapNumber} принудительно подтверждена!`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleSlotClick = (slotNumber: number) => {
    targetUploadSlot.current = slotNumber;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadMapSlot(targetUploadSlot.current, file);
    }
  };

  const removeMap = (mapNumber: number) => {
    setMaps(prev => prev.filter(m => m.mapNumber !== mapNumber));
  };

  // Download high-resolution PNG screenshot of the stitched BO3/BO5 match
  const handleDownloadScreenshot = async () => {
    if (!stitchedResultRef.current) return;
    setIsDownloading(true);
    try {
      const fileName = `${aggregatedSeriesData?.team1Name || 'Team1'}_vs_${aggregatedSeriesData?.team2Name || 'Team2'}_${format}_Series.png`;
      await downloadElementAsImage(stitchedResultRef.current, fileName);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  // Download complete JSON of the series
  const handleDownloadJson = () => {
    if (!aggregatedSeriesData) return;
    const exportObject = {
      format,
      date: new Date().toISOString(),
      team1Name: aggregatedSeriesData.team1Name,
      team2Name: aggregatedSeriesData.team2Name,
      seriesScore1,
      seriesScore2,
      winner: seriesScore1 > seriesScore2 ? aggregatedSeriesData.team1Name : aggregatedSeriesData.team2Name,
      mvp: aggregatedSeriesData.mvp,
      maps: maps.map(m => ({
        mapNumber: m.mapNumber,
        mapName: m.mapName,
        score1: m.score1,
        score2: m.score2,
        team1Players: m.team1Players,
        team2Players: m.team2Players
      })),
      overallTeam1Stats: aggregatedSeriesData.team1Aggregated,
      overallTeam2Stats: aggregatedSeriesData.team2Aggregated
    };

    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${aggregatedSeriesData.team1Name}_vs_${aggregatedSeriesData.team2Name}_${format}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save stitched match directly to Top Skleyki
  const handleSaveToTopSkleyki = () => {
    if (!aggregatedSeriesData) return;

    try {
      const allPlayersCombined = [
        ...aggregatedSeriesData.team1Aggregated,
        ...aggregatedSeriesData.team2Aggregated
      ];

      const stitchedMatch = {
        id: 'stitched_' + Date.now(),
        fileName: `Склейка ${format} (${maps.map(m => m.mapName).join(', ')})`,
        team1Name: aggregatedSeriesData.team1Name,
        team2Name: aggregatedSeriesData.team2Name,
        score1: seriesScore1,
        score2: seriesScore2,
        format,
        date: new Date().toLocaleDateString('ru-RU'),
        players: allPlayersCombined,
        mvp: aggregatedSeriesData.mvp,
        maps: maps.map(m => ({
          mapName: m.mapName,
          score1: m.score1,
          score2: m.score2,
          team1Players: m.team1Players,
          team2Players: m.team2Players
        }))
      };

      // Update in localStorage
      const existingMatchesRaw = localStorage.getItem('skleyka_matches') || '[]';
      const existingMatches = JSON.parse(existingMatchesRaw);
      existingMatches.unshift(stitchedMatch);
      localStorage.setItem('skleyka_matches', JSON.stringify(existingMatches));

      // Also update in all tops
      const existingTopsRaw = localStorage.getItem('skleyka_all_tops');
      if (existingTopsRaw) {
        const allTops = JSON.parse(existingTopsRaw);
        const activeTopId = localStorage.getItem('skleyka_active_top_id');
        if (Array.isArray(allTops) && allTops.length > 0) {
          const targetIndex = allTops.findIndex(t => t.id === activeTopId);
          const idxToUpdate = targetIndex >= 0 ? targetIndex : 0;
          allTops[idxToUpdate].matches = [stitchedMatch, ...(allTops[idxToUpdate].matches || [])];
          localStorage.setItem('skleyka_all_tops', JSON.stringify(allTops));
        }
      }

      setSaveNotice('✓ Матч успешно сохранён в «Топ Склейки»!');
      setTimeout(() => setSaveNotice(null), 3000);

      if (onSavedToTop) onSavedToTop(stitchedMatch);
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 text-white font-sans">
      
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Floating Save Notice */}
      {saveNotice && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-black font-black text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{saveNotice}</span>
        </div>
      )}

      <div className="bg-[#0c0d14] border border-white/10 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-wrap justify-between items-center bg-[#13141f] gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  Склейка матчей ({format})
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  По картам
                </span>
              </div>
              <p className="text-white/40 text-xs font-semibold mt-0.5">
                Загружайте фото карт по одной → проверка совпадения команд и игроков → общий скриншот серии
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Format toggle: BO3 / BO5 */}
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => setFormat('BO3')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${format === 'BO3' ? 'bg-purple-600 text-white shadow' : 'text-white/50 hover:text-white'}`}
              >
                BO3 (до 2 карт)
              </button>
              <button
                onClick={() => setFormat('BO5')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${format === 'BO5' ? 'bg-purple-600 text-white shadow' : 'text-white/50 hover:text-white'}`}
              >
                BO5 (до 3 карт)
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split into Upload Slots + Stitched Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
          
          {/* Section: Upload Map Slots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-white/70 uppercase tracking-widest flex items-center gap-2">
                <span>Загрузка карт по одной</span>
                <span className="text-white/30 font-normal">({maps.filter(m => m.validationStatus === 'valid').length} из {maxMaps} загружено)</span>
              </h3>
              {maps.length > 0 && (
                <button
                  onClick={() => setMaps([])}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition-colors"
                >
                  Очистить все карты
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {Array.from({ length: maxMaps }).map((_, idx) => {
                const slotNum = idx + 1;
                const mapData = maps.find(m => m.mapNumber === slotNum);
                const isUploadingThis = activeSlotUploading === slotNum;

                return (
                    <div 
                      key={slotNum}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleUploadMapSlot(slotNum, file);
                      }}
                      className={`border rounded-2xl p-4 flex flex-col justify-between transition-all relative overflow-hidden min-h-[180px] ${
                        mapData 
                          ? (mapData.validationStatus === 'valid'
                              ? 'bg-[#151624] border-purple-500/40 shadow-lg shadow-purple-950/20'
                              : 'bg-red-950/20 border-red-500/40')
                          : 'bg-black/30 border-white/10 hover:border-purple-500/40 border-dashed'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-white/60">
                          Карта {slotNum}
                        </span>
                        {mapData && (
                          <div className="flex items-center gap-1.5">
                            {mapData.validationStatus === 'valid' ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                ✓ ПРИНЯТО
                              </span>
                            ) : (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                ОТКАЗ
                              </span>
                            )}
                            <button
                              onClick={() => removeMap(slotNum)}
                              className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-red-400 cursor-pointer"
                              title="Удалить эту карту"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Slot Content */}
                      {isUploadingThis ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
                          <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-2" />
                          <span className="text-[11px] font-bold text-white">Анализ скриншота...</span>
                          <span className="text-[9px] text-white/40">ИИ распознает команды и игроков</span>
                        </div>
                      ) : mapData ? (
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-black text-white truncate flex items-center justify-between">
                              <span>{mapData.mapName}</span>
                              <button
                                onClick={() => setEditingMapData(JSON.parse(JSON.stringify(mapData)))}
                                className="text-amber-400 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                title="Редактировать данные карты"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Изменить</span>
                              </button>
                            </div>
                            <div className="text-[11px] text-white/70 mt-1 flex items-center justify-between">
                              <span className="truncate max-w-[70px] font-bold">{mapData.team1Name}</span>
                              <span className="font-mono font-black text-purple-300 bg-purple-500/10 px-1.5 rounded">
                                {mapData.score1}:{mapData.score2}
                              </span>
                              <span className="truncate max-w-[70px] font-bold">{mapData.team2Name}</span>
                            </div>
                            
                            {/* Rejection reason banner */}
                            {mapData.validationStatus === 'rejected' && mapData.validationError && (
                              <div className="mt-2 p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-[10px] text-red-300 leading-tight">
                                <div className="font-bold flex items-center gap-1 text-red-400 mb-0.5">
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>Несоответствие!</span>
                                </div>
                                <div className="line-clamp-2">{mapData.validationError}</div>
                                <button
                                  onClick={() => setEditingMapData(JSON.parse(JSON.stringify(mapData)))}
                                  className="mt-1 text-yellow-400 hover:underline font-bold text-[9px] block"
                                >
                                  Исправить вручную →
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                            <span className="text-white/40">
                              Игроков: {(mapData.team1Players?.length || 0) + (mapData.team2Players?.length || 0)}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSlotClick(slotNum)}
                                className="text-purple-400 hover:text-purple-300 font-bold hover:underline cursor-pointer"
                              >
                                Заменить
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleSlotClick(slotNum)}
                          className="flex-1 flex flex-col items-center justify-center p-3 text-center cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-purple-500/20 text-white/40 group-hover:text-purple-400 flex items-center justify-center transition-all mb-2">
                            <Upload className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black text-white/70 group-hover:text-white transition-colors">
                            Загрузить фото
                          </span>
                          <span className="text-[9px] text-white/30 mt-0.5">
                            Перетащите PNG или Ctrl+V
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMapData({
                                id: 's_map_' + Date.now() + '_' + slotNum,
                                mapNumber: slotNum,
                                mapName: `Карта ${slotNum}`,
                                team1Name: maps[0]?.team1Name || 'Команда 1',
                                team2Name: maps[0]?.team2Name || 'Команда 2',
                                score1: 13,
                                score2: 10,
                                team1Players: [
                                  { nickname: 'Player 1', kills: 20, deaths: 14, assists: 4, damage: 85, rating: 1.25 },
                                  { nickname: 'Player 2', kills: 18, deaths: 15, assists: 3, damage: 78, rating: 1.15 },
                                  { nickname: 'Player 3', kills: 16, deaths: 16, assists: 5, damage: 72, rating: 1.05 },
                                  { nickname: 'Player 4', kills: 14, deaths: 17, assists: 4, damage: 68, rating: 0.95 },
                                  { nickname: 'Player 5', kills: 11, deaths: 18, assists: 7, damage: 60, rating: 0.85 }
                                ],
                                team2Players: [
                                  { nickname: 'Rival 1', kills: 22, deaths: 16, assists: 3, damage: 88, rating: 1.28 },
                                  { nickname: 'Rival 2', kills: 17, deaths: 17, assists: 4, damage: 75, rating: 1.08 },
                                  { nickname: 'Rival 3', kills: 15, deaths: 17, assists: 5, damage: 70, rating: 0.98 },
                                  { nickname: 'Rival 4', kills: 12, deaths: 18, assists: 6, damage: 64, rating: 0.88 },
                                  { nickname: 'Rival 5', kills: 8, deaths: 19, assists: 2, damage: 50, rating: 0.72 }
                                ],
                                validationStatus: 'valid'
                              });
                            }}
                            className="mt-2 text-[10px] text-white/40 hover:text-purple-300 font-bold underline cursor-pointer"
                          >
                            или ввести вручную
                          </button>
                        </div>
                      )}
                    </div>
                );
              })}
            </div>
          </div>

          {/* Validation Notice if any rejected maps exist */}
          {maps.some(m => m.validationStatus === 'rejected') && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-red-300 uppercase tracking-wider">
                  Внимание: Обнаружен отказ по одной из карт!
                </h4>
                <p className="text-[11px] text-red-200/80 mt-0.5 leading-relaxed">
                  Карты с пометкой <strong>«ОТКАЗ»</strong> исключены из серии. Замените скриншот на карту с теми же командами и игроками, чтобы объединить матч в полноценную серию.
                </p>
              </div>
            </div>
          )}

          {/* Stitched Series Result Preview */}
          {aggregatedSeriesData ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    🏆 Итоговый скриншот серии ({format})
                  </h3>
                  {isSeriesFinished && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">
                      Серия завершена
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadScreenshot}
                    disabled={isDownloading}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'Сохранение...' : 'СКАЧАТЬ ФОТО (PNG)'}</span>
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>JSON</span>
                  </button>

                  <button
                    onClick={handleSaveToTopSkleyki}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 fill-black" />
                    <span>В ТОП СКЛЕЙКИ</span>
                  </button>
                </div>
              </div>

              {/* The Official Match Result Container for Screenshot Export */}
              <div 
                ref={stitchedResultRef}
                className="bg-[#0b0c13] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
              >
                {/* Background ambient glow */}
                <div className="absolute top-0 left-0 w-80 h-80 bg-purple-500/10 blur-[90px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 blur-[90px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2"></div>

                {/* Team Logos & Series Score Header */}
                <div className="bg-gradient-to-b from-[#141524] to-[#11121d] border border-white/10 rounded-2xl p-6 sm:p-8 text-center relative z-10 shadow-xl mb-6">
                  
                  <div className="flex items-center justify-center gap-6 sm:gap-10 mb-4">
                    <TeamLogo game="cs2" teamName={aggregatedSeriesData.team1Name} sizeClassName="w-16 h-16 sm:w-20 sm:h-20 text-3xl" />
                    
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/40 mb-1">
                        ГРАНД-СЕРИЯ • {format}
                      </span>
                      <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wider">
                        {aggregatedSeriesData.team1Name} <span className="text-white/30 text-xl font-normal">vs</span> {aggregatedSeriesData.team2Name}
                      </h2>
                    </div>

                    <TeamLogo game="cs2" teamName={aggregatedSeriesData.team2Name} sizeClassName="w-16 h-16 sm:w-20 sm:h-20 text-3xl" />
                  </div>

                  {/* Big Series Score */}
                  <div className="text-6xl sm:text-7xl font-black tracking-widest mb-3 drop-shadow-2xl">
                    <span className={seriesScore1 > seriesScore2 ? 'text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'text-white/60'}>
                      {seriesScore1}
                    </span>
                    <span className="mx-6 sm:mx-8 text-white/20 text-4xl sm:text-5xl">:</span>
                    <span className={seriesScore2 > seriesScore1 ? 'text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.5)]' : 'text-white/60'}>
                      {seriesScore2}
                    </span>
                  </div>

                  {/* MVP Badge */}
                  {aggregatedSeriesData.mvp && (
                    <div className="inline-flex items-center gap-2.5 bg-yellow-500/15 border border-yellow-500/40 rounded-full px-6 py-2 shadow-lg shadow-yellow-500/10">
                      <span className="text-yellow-400 text-sm">⭐</span>
                      <span className="text-white font-bold text-xs uppercase tracking-wider">
                        MVP СЕРИИ: <strong>{aggregatedSeriesData.mvp.nickname}</strong> ({aggregatedSeriesData.mvp.team})
                      </span>
                      <span className="text-yellow-400 font-black text-xs font-mono">
                        {aggregatedSeriesData.mvp.hltvRating}
                      </span>
                    </div>
                  )}

                  {/* Maps breakdown pills */}
                  <div className="mt-5 flex flex-wrap justify-center items-center gap-2.5">
                    {aggregatedSeriesData.validMaps.map((m, idx) => (
                      <div 
                        key={idx}
                        className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-xs"
                      >
                        <span className="text-white/40 font-mono text-[10px]">Карта {m.mapNumber}:</span>
                        <span className="font-bold text-white uppercase">{m.mapName}</span>
                        <span className="font-mono font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          {m.score1}:{m.score2}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-tabs: Overall Series Stats vs Individual Maps */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <button
                    onClick={() => setSelectedResultTab('overall')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                      selectedResultTab === 'overall'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    Общая статистика серии
                  </button>

                  {aggregatedSeriesData.validMaps.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedResultTab(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                        selectedResultTab === idx
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      Карта {m.mapNumber}: {m.mapName}
                    </button>
                  ))}
                </div>

                {/* Tables Grid */}
                {selectedResultTab === 'overall' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team 1 Scoreboard */}
                    <div className="bg-[#12131f] border border-purple-500/30 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                          <TeamLogo game="cs2" teamName={aggregatedSeriesData.team1Name} sizeClassName="w-7 h-7 text-xs" />
                          <h4 className="font-black text-sm text-purple-300 uppercase tracking-wider">
                            {aggregatedSeriesData.team1Name}
                          </h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-white/50">
                          Всего карт: {aggregatedSeriesData.validMaps.length}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-white/40 border-b border-white/5 pb-2 uppercase text-[10px] font-black">
                              <th className="py-2">Игрок</th>
                              <th className="py-2 text-center">K - D</th>
                              <th className="py-2 text-center">+/-</th>
                              <th className="py-2 text-center">ADR</th>
                              <th className="py-2 text-center">K/D</th>
                              <th className="py-2 text-right">Рейтинг</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {aggregatedSeriesData.team1Aggregated.map((p, pIdx) => (
                              <tr key={pIdx} className="hover:bg-white/5 transition-colors">
                                <td className="py-2.5 flex items-center gap-2 font-bold text-white">
                                  <PlayerAvatar playerName={p.nickname} sizeClassName="w-6 h-6 rounded-full" />
                                  <span className="truncate max-w-[110px]">{p.nickname}</span>
                                </td>
                                <td className="py-2.5 text-center font-mono font-bold text-white/80">
                                  {p.kills} - {p.deaths}
                                </td>
                                <td className={`py-2.5 text-center font-mono font-black ${p.diff > 0 ? 'text-emerald-400' : p.diff < 0 ? 'text-red-400' : 'text-white/40'}`}>
                                  {p.diff > 0 ? `+${p.diff}` : p.diff}
                                </td>
                                <td className="py-2.5 text-center font-mono text-white/60">
                                  {p.adr}
                                </td>
                                <td className="py-2.5 text-center font-mono font-bold text-white/80">
                                  {p.kd}
                                </td>
                                <td className="py-2.5 text-right font-mono font-black text-purple-300">
                                  {p.hltvRating}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Team 2 Scoreboard */}
                    <div className="bg-[#12131f] border border-blue-500/30 rounded-2xl p-5 shadow-xl">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                          <TeamLogo game="cs2" teamName={aggregatedSeriesData.team2Name} sizeClassName="w-7 h-7 text-xs" />
                          <h4 className="font-black text-sm text-blue-300 uppercase tracking-wider">
                            {aggregatedSeriesData.team2Name}
                          </h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-white/50">
                          Всего карт: {aggregatedSeriesData.validMaps.length}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-white/40 border-b border-white/5 pb-2 uppercase text-[10px] font-black">
                              <th className="py-2">Игрок</th>
                              <th className="py-2 text-center">K - D</th>
                              <th className="py-2 text-center">+/-</th>
                              <th className="py-2 text-center">ADR</th>
                              <th className="py-2 text-center">K/D</th>
                              <th className="py-2 text-right">Рейтинг</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {aggregatedSeriesData.team2Aggregated.map((p, pIdx) => (
                              <tr key={pIdx} className="hover:bg-white/5 transition-colors">
                                <td className="py-2.5 flex items-center gap-2 font-bold text-white">
                                  <PlayerAvatar playerName={p.nickname} sizeClassName="w-6 h-6 rounded-full" />
                                  <span className="truncate max-w-[110px]">{p.nickname}</span>
                                </td>
                                <td className="py-2.5 text-center font-mono font-bold text-white/80">
                                  {p.kills} - {p.deaths}
                                </td>
                                <td className={`py-2.5 text-center font-mono font-black ${p.diff > 0 ? 'text-emerald-400' : p.diff < 0 ? 'text-red-400' : 'text-white/40'}`}>
                                  {p.diff > 0 ? `+${p.diff}` : p.diff}
                                </td>
                                <td className="py-2.5 text-center font-mono text-white/60">
                                  {p.adr}
                                </td>
                                <td className="py-2.5 text-center font-mono font-bold text-white/80">
                                  {p.kd}
                                </td>
                                <td className="py-2.5 text-right font-mono font-black text-blue-300">
                                  {p.hltvRating}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Individual Map View
                  (() => {
                    const activeMap = aggregatedSeriesData.validMaps[selectedResultTab as number];
                    if (!activeMap) return null;
                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Map Team 1 */}
                        <div className="bg-[#12131f] border border-white/10 rounded-2xl p-5">
                          <h4 className="font-black text-sm text-purple-300 uppercase tracking-wider mb-3">
                            {activeMap.team1Name} ({activeMap.score1})
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-white/40 border-b border-white/5 uppercase text-[10px]">
                                  <th className="py-2">Игрок</th>
                                  <th className="py-2 text-center">K - D</th>
                                  <th className="py-2 text-right">Рейтинг</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {activeMap.team1Players.map((p, pIdx) => (
                                  <tr key={pIdx}>
                                    <td className="py-2 font-bold text-white">{p.nickname}</td>
                                    <td className="py-2 text-center font-mono">{p.kills} - {p.deaths}</td>
                                    <td className="py-2 text-right font-mono font-bold text-purple-300">{p.rating}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Map Team 2 */}
                        <div className="bg-[#12131f] border border-white/10 rounded-2xl p-5">
                          <h4 className="font-black text-sm text-blue-300 uppercase tracking-wider mb-3">
                            {activeMap.team2Name} ({activeMap.score2})
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-white/40 border-b border-white/5 uppercase text-[10px]">
                                  <th className="py-2">Игрок</th>
                                  <th className="py-2 text-center">K - D</th>
                                  <th className="py-2 text-right">Рейтинг</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {activeMap.team2Players.map((p, pIdx) => (
                                  <tr key={pIdx}>
                                    <td className="py-2 font-bold text-white">{p.nickname}</td>
                                    <td className="py-2 text-center font-mono">{p.kills} - {p.deaths}</td>
                                    <td className="py-2 text-right font-mono font-bold text-blue-300">{p.rating}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          ) : (
            <div className="bg-black/30 border border-white/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-2xl mb-4">
                🧩
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">
                Загрузите скриншоты карт для склейки
              </h3>
              <p className="text-white/40 text-xs max-w-md mx-auto leading-relaxed">
                Нажмите на карточку «Карта 1» выше и выберите скриншот первой карты. Затем закиньте вторую и третью карту. Система автоматически объединит их в итоговую серию {format}!
              </p>
            </div>
          )}

        </div>

        {/* Dedicated Map Edit Modal */}
        {editingMapData && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-5">
            <div className="bg-[#12131f] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-white/5 flex justify-between items-center bg-[#161726]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                      Редактирование: Карта {editingMapData.mapNumber}
                    </h3>
                    <p className="text-[11px] text-white/40">
                      Проверьте или скорректируйте распознанные команды, счет и игроков
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingMapData(null)}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                
                {/* General Info: Map Name, Teams & Scores */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-black/40 p-4 rounded-xl border border-white/5">
                  <div>
                    <label className="text-[10px] font-black uppercase text-white/40 block mb-1">Название карты</label>
                    <input
                      type="text"
                      value={editingMapData.mapName}
                      onChange={e => setEditingMapData({ ...editingMapData, mapName: e.target.value })}
                      className="w-full bg-[#1c1d2e] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-purple-500"
                      placeholder="Mirage, Inferno, Dust II..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-purple-400 block mb-1">Команда 1 и Счет</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingMapData.team1Name}
                        onChange={e => setEditingMapData({ ...editingMapData, team1Name: e.target.value })}
                        className="flex-1 bg-[#1c1d2e] border border-purple-500/30 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-purple-500"
                        placeholder="Название команды 1"
                      />
                      <input
                        type="number"
                        value={editingMapData.score1}
                        onChange={e => setEditingMapData({ ...editingMapData, score1: parseInt(e.target.value) || 0 })}
                        className="w-16 bg-[#1c1d2e] border border-purple-500/30 rounded-lg px-2 py-2 text-xs font-black text-center text-purple-300 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-blue-400 block mb-1">Команда 2 и Счет</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingMapData.team2Name}
                        onChange={e => setEditingMapData({ ...editingMapData, team2Name: e.target.value })}
                        className="flex-1 bg-[#1c1d2e] border border-blue-500/30 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                        placeholder="Название команды 2"
                      />
                      <input
                        type="number"
                        value={editingMapData.score2}
                        onChange={e => setEditingMapData({ ...editingMapData, score2: parseInt(e.target.value) || 0 })}
                        className="w-16 bg-[#1c1d2e] border border-blue-500/30 rounded-lg px-2 py-2 text-xs font-black text-center text-blue-300 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Team 1 Players Table */}
                <div className="bg-[#151624] border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase text-purple-300">
                      Игроки команды «{editingMapData.team1Name}» ({editingMapData.team1Players.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newP = { nickname: `Player ${editingMapData.team1Players.length + 1}`, kills: 15, deaths: 15, assists: 3, damage: 75, rating: 1.0 };
                        setEditingMapData({ ...editingMapData, team1Players: [...editingMapData.team1Players, newP] });
                      }}
                      className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      + Добавить игрока
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-white/40 border-b border-white/5 uppercase text-[9px] font-black">
                          <th className="pb-2">Никнейм</th>
                          <th className="pb-2 text-center w-16">Убийства</th>
                          <th className="pb-2 text-center w-16">Смерти</th>
                          <th className="pb-2 text-center w-16">Ассисты</th>
                          <th className="pb-2 text-center w-20">ADR</th>
                          <th className="pb-2 text-center w-20">Рейтинг</th>
                          <th className="pb-2 text-right w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {editingMapData.team1Players.map((p, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 pr-2">
                              <input
                                type="text"
                                value={p.nickname}
                                onChange={e => {
                                  const updated = [...editingMapData.team1Players];
                                  updated[idx].nickname = e.target.value;
                                  setEditingMapData({ ...editingMapData, team1Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs font-bold text-white outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                value={p.kills}
                                onChange={e => {
                                  const updated = [...editingMapData.team1Players];
                                  updated[idx].kills = parseInt(e.target.value) || 0;
                                  setEditingMapData({ ...editingMapData, team1Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono font-bold text-white outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                value={p.deaths}
                                onChange={e => {
                                  const updated = [...editingMapData.team1Players];
                                  updated[idx].deaths = parseInt(e.target.value) || 0;
                                  setEditingMapData({ ...editingMapData, team1Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono font-bold text-white outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                value={p.assists}
                                onChange={e => {
                                  const updated = [...editingMapData.team1Players];
                                  updated[idx].assists = parseInt(e.target.value) || 0;
                                  setEditingMapData({ ...editingMapData, team1Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono text-white/70 outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                value={p.damage}
                                onChange={e => {
                                  const updated = [...editingMapData.team1Players];
                                  updated[idx].damage = parseInt(e.target.value) || 0;
                                  setEditingMapData({ ...editingMapData, team1Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono text-white/70 outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                step="0.01"
                                value={p.rating}
                                onChange={e => {
                                  const updated = [...editingMapData.team1Players];
                                  updated[idx].rating = parseFloat(e.target.value) || 1.0;
                                  setEditingMapData({ ...editingMapData, team1Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono font-black text-purple-300 outline-none"
                              />
                            </td>
                            <td className="py-1.5 text-right pl-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = editingMapData.team1Players.filter((_, i) => i !== idx);
                                  setEditingMapData({ ...editingMapData, team1Players: updated });
                                }}
                                className="p-1 text-white/30 hover:text-red-400 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Team 2 Players Table */}
                <div className="bg-[#151624] border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase text-blue-300">
                      Игроки команды «{editingMapData.team2Name}» ({editingMapData.team2Players.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newP = { nickname: `Rival ${editingMapData.team2Players.length + 1}`, kills: 15, deaths: 15, assists: 3, damage: 75, rating: 1.0 };
                        setEditingMapData({ ...editingMapData, team2Players: [...editingMapData.team2Players, newP] });
                      }}
                      className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      + Добавить игрока
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-white/40 border-b border-white/5 uppercase text-[9px] font-black">
                          <th className="pb-2">Никнейм</th>
                          <th className="pb-2 text-center w-16">Убийства</th>
                          <th className="pb-2 text-center w-16">Смерти</th>
                          <th className="pb-2 text-center w-16">Ассисты</th>
                          <th className="pb-2 text-center w-20">ADR</th>
                          <th className="pb-2 text-center w-20">Рейтинг</th>
                          <th className="pb-2 text-right w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {editingMapData.team2Players.map((p, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 pr-2">
                              <input
                                type="text"
                                value={p.nickname}
                                onChange={e => {
                                  const updated = [...editingMapData.team2Players];
                                  updated[idx].nickname = e.target.value;
                                  setEditingMapData({ ...editingMapData, team2Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs font-bold text-white outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                value={p.kills}
                                onChange={e => {
                                  const updated = [...editingMapData.team2Players];
                                  updated[idx].kills = parseInt(e.target.value) || 0;
                                  setEditingMapData({ ...editingMapData, team2Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono font-bold text-white outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                value={p.deaths}
                                onChange={e => {
                                  const updated = [...editingMapData.team2Players];
                                  updated[idx].deaths = parseInt(e.target.value) || 0;
                                  setEditingMapData({ ...editingMapData, team2Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono font-bold text-white outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                value={p.assists}
                                onChange={e => {
                                  const updated = [...editingMapData.team2Players];
                                  updated[idx].assists = parseInt(e.target.value) || 0;
                                  setEditingMapData({ ...editingMapData, team2Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono text-white/70 outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                value={p.damage}
                                onChange={e => {
                                  const updated = [...editingMapData.team2Players];
                                  updated[idx].damage = parseInt(e.target.value) || 0;
                                  setEditingMapData({ ...editingMapData, team2Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono text-white/70 outline-none"
                              />
                            </td>
                            <td className="py-1.5 px-1">
                              <input
                                type="number"
                                step="0.01"
                                value={p.rating}
                                onChange={e => {
                                  const updated = [...editingMapData.team2Players];
                                  updated[idx].rating = parseFloat(e.target.value) || 1.0;
                                  setEditingMapData({ ...editingMapData, team2Players: updated });
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-1 text-center font-mono font-black text-blue-300 outline-none"
                              />
                            </td>
                            <td className="py-1.5 text-right pl-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = editingMapData.team2Players.filter((_, i) => i !== idx);
                                  setEditingMapData({ ...editingMapData, team2Players: updated });
                                }}
                                className="p-1 text-white/30 hover:text-red-400 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-[#161726] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleForceValid}
                  className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-xl border border-yellow-500/20 transition-all cursor-pointer"
                  title="Игнорировать возможные расхождения и принять карту"
                >
                  ✓ Принудительно подтвердить (игнорировать различия)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMapData(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMapEdit}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl transition-all shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Сохранить изменения
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
