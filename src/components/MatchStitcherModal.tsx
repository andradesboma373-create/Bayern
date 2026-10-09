import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Upload, Trash2, Trophy, User, Calendar, Sparkles, Loader2, 
  ChevronRight, BarChart3, Image as ImageIcon, Download, Database, 
  Plus, FolderOpen, Search, ArrowRight, Shield, Check, Edit2, Copy, AlertCircle,
  Layers, LayoutGrid, FolderPlus, Cloud, Save
} from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import TeamLogo from './TeamLogo';
import { getKdColorClass, compressImage } from '../lib/utils';
import { downloadElementAsImage } from '../lib/exportImage';
import { loadTournaments, getCanonicalRoomId } from './setka_tourn/storage';
import { db, doc, deleteDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc } from '../firebase';

export interface ExtractedMatch {
  id: string;
  team1Name: string;
  team2Name: string;
  score1: number;
  score2: number;
  players: any[];
  fileName?: string;
  date?: string;
  stageId?: string; // New field for stage organization
  priority?: number; // 1 = Regular, 2 = Semi-final, 3 = Final
}

export interface StitcherTop {
  id: string;
  name: string;
  createdAt: number;
  matches: ExtractedMatch[];
  top1?: string | null;
  discipline?: 'cs2' | 's2' | 'all';
  description?: string;
  folderId?: string; // New field for folder organization
}

export interface StitcherFolder {
  id: string;
  name: string;
  userId: string;
  createdAt: number;
  priority?: number;
  isExcluded?: boolean;
}

export interface StitcherStage {
  id: string;
  name: string;
  topId: string; // Belongs to a top
  userId: string;
  createdAt: number;
  priority?: number;
  isExcluded?: boolean;
}

interface DeletionTarget {
  type: 'match' | 'top' | 'clear_all';
  id?: string;
  title: string;
  subtitle: string;
  details?: string;
}

interface Props {
  user?: any;
  onClose: () => void;
}

// Default pre-made tops so user always has rich ready tops to pick from!
const PRESET_TOPS: StitcherTop[] = [
  {
    id: 'preset_tourn_1',
    name: 'Турнир 1 (Демо склейка)',
    createdAt: Date.now() - 3600000 * 24,
    discipline: 'cs2',
    description: 'Готовый топ склейки с 3 грандиозными матчами и 25 игроками',
    top1: 'donk',
    matches: [
      {
        id: 'm_demo_1',
        team1Name: 'Natus Vincere',
        team2Name: 'FaZe Clan',
        score1: 13,
        score2: 11,
        priority: 3,
        fileName: 'navi_vs_faze_final.png',
        players: [
          { nickname: 's1mple', team: 'Natus Vincere', kills: 24, deaths: 14, assists: 5, damage: 2100, rating: 1.38 },
          { nickname: 'b1t', team: 'Natus Vincere', kills: 19, deaths: 15, assists: 4, damage: 1750, rating: 1.15 },
          { nickname: 'jL', team: 'Natus Vincere', kills: 17, deaths: 16, assists: 6, damage: 1600, rating: 1.08 },
          { nickname: 'iM', team: 'Natus Vincere', kills: 16, deaths: 17, assists: 3, damage: 1500, rating: 0.98 },
          { nickname: 'Aleksib', team: 'Natus Vincere', kills: 14, deaths: 17, assists: 8, damage: 1400, rating: 0.92 },
          { nickname: 'broky', team: 'FaZe Clan', kills: 22, deaths: 17, assists: 4, damage: 1950, rating: 1.19 },
          { nickname: 'frozen', team: 'FaZe Clan', kills: 19, deaths: 18, assists: 5, damage: 1700, rating: 1.04 },
          { nickname: 'ropz', team: 'FaZe Clan', kills: 18, deaths: 18, assists: 3, damage: 1650, rating: 1.02 },
          { nickname: 'rain', team: 'FaZe Clan', kills: 16, deaths: 19, assists: 7, damage: 1500, rating: 0.93 },
          { nickname: 'karrigan', team: 'FaZe Clan', kills: 14, deaths: 20, assists: 9, damage: 1300, rating: 0.82 }
        ]
      },
      {
        id: 'm_demo_2',
        team1Name: 'Team Spirit',
        team2Name: 'Team Vitality',
        score1: 13,
        score2: 9,
        priority: 2,
        fileName: 'spirit_vs_vitality.png',
        players: [
          { nickname: 'donk', team: 'Team Spirit', kills: 27, deaths: 12, assists: 6, damage: 2450, rating: 1.62 },
          { nickname: 'sh1ro', team: 'Team Spirit', kills: 19, deaths: 13, assists: 4, damage: 1700, rating: 1.18 },
          { nickname: 'zont1x', team: 'Team Spirit', kills: 16, deaths: 14, assists: 5, damage: 1450, rating: 1.05 },
          { nickname: 'magixx', team: 'Team Spirit', kills: 14, deaths: 15, assists: 7, damage: 1300, rating: 0.95 },
          { nickname: 'chopper', team: 'Team Spirit', kills: 13, deaths: 16, assists: 8, damage: 1200, rating: 0.88 },
          { nickname: 'ZywOo', team: 'Team Vitality', kills: 23, deaths: 15, assists: 5, damage: 2050, rating: 1.29 },
          { nickname: 'Spinx', team: 'Team Vitality', kills: 17, deaths: 17, assists: 4, damage: 1550, rating: 0.99 },
          { nickname: 'flameZ', team: 'Team Vitality', kills: 16, deaths: 18, assists: 6, damage: 1450, rating: 0.94 },
          { nickname: 'mezii', team: 'Team Vitality', kills: 13, deaths: 19, assists: 4, damage: 1200, rating: 0.81 },
          { nickname: 'apEX', team: 'Team Vitality', kills: 11, deaths: 20, assists: 9, damage: 1050, rating: 0.74 }
        ]
      },
      {
        id: 'm_demo_3',
        team1Name: 'G2 Esports',
        team2Name: 'FaZe Clan',
        score1: 16,
        score2: 14,
        fileName: 'g2_vs_faze_ot.png',
        players: [
          { nickname: 'm0NESY', team: 'G2 Esports', kills: 29, deaths: 18, assists: 6, damage: 2600, rating: 1.45 },
          { nickname: 'NiKo', team: 'G2 Esports', kills: 25, deaths: 20, assists: 7, damage: 2250, rating: 1.22 },
          { nickname: 'huNter-', team: 'G2 Esports', kills: 20, deaths: 21, assists: 5, damage: 1800, rating: 1.01 },
          { nickname: 'malbsMd', team: 'G2 Esports', kills: 19, deaths: 22, assists: 4, damage: 1750, rating: 0.97 },
          { nickname: 'Snax', team: 'G2 Esports', kills: 14, deaths: 23, assists: 8, damage: 1300, rating: 0.78 },
          { nickname: 'broky', team: 'FaZe Clan', kills: 23, deaths: 20, assists: 5, damage: 2000, rating: 1.14 },
          { nickname: 'frozen', team: 'FaZe Clan', kills: 21, deaths: 21, assists: 6, damage: 1850, rating: 1.03 },
          { nickname: 'ropz', team: 'FaZe Clan', kills: 20, deaths: 21, assists: 4, damage: 1800, rating: 0.99 },
          { nickname: 'rain', team: 'FaZe Clan', kills: 19, deaths: 23, assists: 5, damage: 1700, rating: 0.91 },
          { nickname: 'karrigan', team: 'FaZe Clan', kills: 16, deaths: 24, assists: 9, damage: 1450, rating: 0.80 }
        ]
      }
    ]
  },
  {
    id: 'preset_standoff2',
    name: 'Standoff 2 Pro Series',
    createdAt: Date.now() - 3600000 * 48,
    discipline: 's2',
    description: 'Готовый турнир мобильной дисциплины Standoff 2',
    top1: 'Necr0',
    matches: [
      {
        id: 's2_demo_1',
        team1Name: 'HorizoN',
        team2Name: 'Saints',
        score1: 10,
        score2: 8,
        fileName: 'horizon_vs_saints.png',
        players: [
          { nickname: 'Necr0', team: 'HorizoN', kills: 18, deaths: 9, assists: 4, damage: 1700, rating: 1.48 },
          { nickname: 'GentlemaN', team: 'HorizoN', kills: 14, deaths: 10, assists: 3, damage: 1350, rating: 1.18 },
          { nickname: 'SkillR', team: 'HorizoN', kills: 12, deaths: 11, assists: 5, damage: 1200, rating: 1.05 },
          { nickname: 'Lunax', team: 'HorizoN', kills: 10, deaths: 12, assists: 2, damage: 1000, rating: 0.91 },
          { nickname: 'sk1ll', team: 'HorizoN', kills: 8, deaths: 12, assists: 4, damage: 850, rating: 0.82 },
          { nickname: 'Fl4wy', team: 'Saints', kills: 15, deaths: 12, assists: 3, damage: 1450, rating: 1.20 },
          { nickname: 'Reason', team: 'Saints', kills: 12, deaths: 13, assists: 4, damage: 1150, rating: 0.98 },
          { nickname: 'Kronos', team: 'Saints', kills: 10, deaths: 13, assists: 2, damage: 950, rating: 0.89 },
          { nickname: 'Rayzen', team: 'Saints', kills: 9, deaths: 14, assists: 3, damage: 880, rating: 0.80 },
          { nickname: 'Tenshi', team: 'Saints', kills: 8, deaths: 14, assists: 5, damage: 800, rating: 0.74 }
        ]
      },
      {
        id: 's2_demo_2',
        team1Name: 'Street8',
        team2Name: 'Absolute',
        score1: 10,
        score2: 6,
        fileName: 'street8_vs_absolute.png',
        players: [
          { nickname: 'Blade', team: 'Street8', kills: 16, deaths: 8, assists: 4, damage: 1550, rating: 1.42 },
          { nickname: 'Spark', team: 'Street8', kills: 13, deaths: 9, assists: 3, damage: 1250, rating: 1.16 },
          { nickname: 'Sensei', team: 'Street8', kills: 11, deaths: 10, assists: 4, damage: 1100, rating: 1.02 },
          { nickname: 'Flash', team: 'Street8', kills: 9, deaths: 10, assists: 2, damage: 900, rating: 0.88 },
          { nickname: 'Striker', team: 'Street8', kills: 7, deaths: 11, assists: 5, damage: 780, rating: 0.78 },
          { nickname: 'Shadow', team: 'Absolute', kills: 12, deaths: 11, assists: 3, damage: 1150, rating: 1.04 },
          { nickname: 'Apex', team: 'Absolute', kills: 10, deaths: 12, assists: 2, damage: 980, rating: 0.90 },
          { nickname: 'Storm', team: 'Absolute', kills: 8, deaths: 13, assists: 4, damage: 850, rating: 0.79 },
          { nickname: 'Frost', team: 'Absolute', kills: 7, deaths: 13, assists: 1, damage: 720, rating: 0.71 },
          { nickname: 'Ghost', team: 'Absolute', kills: 6, deaths: 14, assists: 3, damage: 650, rating: 0.65 }
        ]
      }
    ]
  }
];

export default function MatchStitcherModal({ user, onClose }: Props) {
  // Load Tops collection
  const [tops, setTops] = useState<StitcherTop[]>(() => {
    try {
      const saved = localStorage.getItem('skleyka_all_tops');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error loading skleyka_all_tops:', e);
    }

    // Migrate from single legacy skleyka keys if present
    const legacyName = localStorage.getItem('skleyka_name');
    const legacyMatchesRaw = localStorage.getItem('skleyka_matches');
    const legacyTop1 = localStorage.getItem('skleyka_top1');

    if (legacyMatchesRaw) {
      try {
        const matches = JSON.parse(legacyMatchesRaw);
        if (Array.isArray(matches) && matches.length > 0) {
          const migratedTop: StitcherTop = {
            id: 'top_' + Date.now(),
            name: legacyName || 'Турнир 1',
            createdAt: Date.now(),
            matches,
            top1: legacyTop1 || null,
            discipline: 'all'
          };
          return [migratedTop, ...PRESET_TOPS];
        }
      } catch (e) {}
    }

    // Default to preset tops
    return PRESET_TOPS;
  });

  // Current active top ID
  const [activeTopId, setActiveTopId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem('skleyka_active_top_id');
    return savedActiveId || 'preset_tourn_1';
  });

  // Top selection modal / prompt
  const [showTopSelector, setShowTopSelector] = useState<boolean>(() => {
    return !localStorage.getItem('skleyka_active_top_id');
  });

  // Top selector sub-tab: 'create' | 'choose'
  const [selectorTab, setSelectorTab] = useState<'create' | 'choose'>('choose');
  const [newTopNameInput, setNewTopNameInput] = useState('Турнир 1');
  const [newTopDiscipline, setNewTopDiscipline] = useState<'cs2' | 's2' | 'all'>('cs2');

  // Deletion Confirmation Modal State
  const [deletionTarget, setDeletionTarget] = useState<DeletionTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // Manual Match Add Modal
  const [showAddManualMatch, setShowAddManualMatch] = useState(false);
  const [manualTeam1, setManualTeam1] = useState('Команда 1');
  const [manualTeam2, setManualTeam2] = useState('Команда 2');
  const [manualScore1, setManualScore1] = useState(13);
  const [manualScore2, setManualScore2] = useState(11);
  const [manualPlayersRaw, setManualPlayersRaw] = useState(
    'Игрок1: 22k 14d 5a 1.25\nИгрок2: 18k 15d 3a 1.10\nИгрок3: 16k 16d 4a 1.02\nИгрок4: 14k 17d 6a 0.95\nИгрок5: 11k 18d 8a 0.85\nОппонент1: 21k 16d 4a 1.18\nОппонент2: 19k 17d 3a 1.05\nОппонент3: 17k 18d 5a 0.98\nОппонент4: 15k 19d 6a 0.90\nОппонент5: 12k 20d 7a 0.80'
  );

  // Folder & Stage States
  const [folders, setFolders] = useState<StitcherFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [stages, setStages] = useState<StitcherStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderPriority, setNewFolderPriority] = useState(2);
  const [newFolderExcluded, setNewFolderExcluded] = useState(false);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStagePriority, setNewStagePriority] = useState(2);
  const [newStageExcluded, setNewStageExcluded] = useState(false);
  
  const [movingTopId, setMovingTopId] = useState<string | null>(null);
  const [movingMatchToStageId, setMovingMatchToStageId] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewLimit, setViewLimit] = useState<'all' | 'top20' | 'top10'>('all');
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [editingTopName, setEditingTopName] = useState(false);
  const [tempTopName, setTempTopName] = useState('');

  const skleykaRef = useRef<HTMLDivElement>(null);
  // Track changes for manual save
  const isInitialMount = useRef(true);

  // Active top reference
  const activeTop = useMemo<StitcherTop>(() => {
    const found = tops.find(t => t.id === activeTopId);
    if (found) return found;
    return tops[0] || PRESET_TOPS[0];
  }, [tops, activeTopId]);

  // Sync from server / Firestore on mount
  useEffect(() => {
    const uid = user?.uid || 'guest';
    const roomId = getCanonicalRoomId(uid);
    fetch('/api/db/getDoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `skleyka_meta/${roomId}` })
    })
      .then(r => r.json())
      .then(docData => {
        if (docData && docData.data && Array.isArray(docData.data.allTopsData) && docData.data.allTopsData.length > 0) {
          setTops(docData.data.allTopsData);
        }
      })
      .catch(() => {});
  }, [user]);

  // Sync to localStorage and manual cloud save
  useEffect(() => {
    try {
      localStorage.setItem('skleyka_all_tops', JSON.stringify(tops));
      localStorage.setItem('skleyka_active_top_id', activeTop.id);
      localStorage.setItem('skleyka_name', activeTop.name);
      localStorage.setItem('skleyka_matches', JSON.stringify(activeTop.matches));
      if (activeTop.top1) localStorage.setItem('skleyka_top1', activeTop.top1);
      else localStorage.removeItem('skleyka_top1');

      // Database sync removed - now manual via handleSaveToCloud
      if (isInitialMount.current) {
        isInitialMount.current = false;
      } else {
        setHasUnsavedChanges(true);
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [tops, activeTop]);

  const handleSaveToCloud = async () => {
    setIsSavingCloud(true);
    try {
      const uid = user?.uid || 'guest';
      const roomId = getCanonicalRoomId(uid);
      await setDoc(doc(db, 'skleyka_meta', roomId), {
        allTopsData: tops,
        activeTopId: activeTop.id,
        updatedAt: new Date().toISOString()
      });
      setHasUnsavedChanges(false);
      setDeleteNotice('✓ Сохранено в облако!');
    } catch (e) {
      console.error('Cloud save error:', e);
      setError('Ошибка сохранения');
    } finally {
      setIsSavingCloud(false);
      setTimeout(() => setDeleteNotice(null), 3000);
    }
  };

  // Fetch Folders & Stages
  useEffect(() => {
    const uid = user?.uid || 'guest';
    const roomId = getCanonicalRoomId(uid);
    
    const fetchFoldersAndStages = async () => {
      try {
        const fq = query(collection(db, 'stitcherFolders'), where('userId', '==', roomId));
        const fSnap = await getDocs(fq);
        const fetchedFolders = fSnap.docs.map(d => ({ id: d.id, ...d.data() } as StitcherFolder));
        setFolders(fetchedFolders);

        const sq = query(collection(db, 'stitcherStages'), where('userId', '==', roomId));
        const sSnap = await getDocs(sq);
        const fetchedStages = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as StitcherStage));
        setStages(fetchedStages);
      } catch (e) {
        console.warn('Error fetching folders/stages:', e);
      }
    };

    fetchFoldersAndStages();
  }, [user]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const uid = user?.uid || 'guest';
    const roomId = getCanonicalRoomId(uid);
    const folder: Partial<StitcherFolder> = {
      name: newFolderName.trim(),
      userId: roomId,
      createdAt: Date.now(),
      priority: newFolderPriority,
      isExcluded: newFolderExcluded
    };
    try {
      const res = await addDoc(collection(db, 'stitcherFolders'), folder);
      setFolders(prev => [...prev, { id: res.id, ...folder } as StitcherFolder]);
      setNewFolderName('');
      setNewFolderPriority(2);
      setNewFolderExcluded(false);
      setIsCreatingFolder(false);
    } catch (e) { console.error(e); }
  };

  const handleCreateStage = async () => {
    if (!newStageName.trim() || !activeTop.id) return;
    const uid = user?.uid || 'guest';
    const roomId = getCanonicalRoomId(uid);
    const stage: Partial<StitcherStage> = {
      name: newStageName.trim(),
      topId: activeTop.id,
      userId: roomId,
      createdAt: Date.now(),
      priority: newStagePriority,
      isExcluded: newStageExcluded
    };
    try {
      const res = await addDoc(collection(db, 'stitcherStages'), stage);
      setStages(prev => [...prev, { id: res.id, ...stage } as StitcherStage]);
      setNewStageName('');
      setNewStagePriority(2);
      setNewStageExcluded(false);
      setIsCreatingStage(false);
    } catch (e) { console.error(e); }
  };

  const handleMoveTopToFolder = (topId: string, folderId: string | null) => {
    const updatedTops = tops.map(t => t.id === topId ? { ...t, folderId: folderId || undefined } : t);
    setTops(updatedTops);
    setMovingTopId(null);
  };

  const handleMoveMatchToStage = (matchId: string, stageId: string | null) => {
    updateActiveTop(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === matchId ? { ...m, stageId: stageId || undefined } : m)
    }));
    setMovingMatchToStageId(null);
  };

  const handleSetMatchPriority = (matchId: string, priority: number) => {
    updateActiveTop(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === matchId ? { ...m, priority } : m)
    }));
  };

  // Helper to update active top
  const updateActiveTop = (updater: (prev: StitcherTop) => StitcherTop) => {
    setTops(prevList => {
      const idx = prevList.findIndex(t => t.id === activeTop.id);
      if (idx === -1) return prevList;
      const updated = updater(prevList[idx]);
      const copy = [...prevList];
      copy[idx] = updated;
      return copy;
    });
  };

  // Create new top
  const handleCreateNewTop = () => {
    const name = newTopNameInput.trim() || `Турнир ${tops.length + 1}`;
    const newTop: StitcherTop = {
      id: 'top_' + Date.now(),
      name,
      createdAt: Date.now(),
      discipline: newTopDiscipline,
      matches: [],
      top1: null,
      description: 'Пользовательский турнир',
      folderId: selectedFolderId || undefined
    };
    const updated = [newTop, ...tops];
    setTops(updated);
    setActiveTopId(newTop.id);
    setShowTopSelector(false);
    setNewTopNameInput(`Турнир ${tops.length + 2}`);
  };

  // Select top from list
  const handleSelectTop = (topId: string) => {
    setActiveTopId(topId);
    setShowTopSelector(false);
  };

  // Duplicate / copy top
  const handleDuplicateTop = (top: StitcherTop, e: React.MouseEvent) => {
    e.stopPropagation();
    const cloned: StitcherTop = {
      ...top,
      id: 'top_' + Date.now(),
      name: `${top.name} (Копия)`,
      createdAt: Date.now()
    };
    setTops(prev => [cloned, ...prev]);
    setActiveTopId(cloned.id);
    setShowTopSelector(false);
  };

  // Prompt Deletions (No window.confirm, 100% accessible in-app modal)
  const promptDeleteMatch = (match: ExtractedMatch, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletionTarget({
      type: 'match',
      id: match.id,
      title: `Матч: ${match.team1Name} vs ${match.team2Name}`,
      subtitle: `Счёт: ${match.score1}:${match.score2}`,
      details: 'Этот матч и вся статистика его игроков будут полностью удалены из этого топа, базы данных и сайта.'
    });
  };

  const promptDeleteTop = (top: StitcherTop, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletionTarget({
      type: 'top',
      id: top.id,
      title: `Топ «${top.name}»`,
      subtitle: `Содержит ${top.matches.length} матчей`,
      details: 'Этот турнирный топ и все связанные с ним матчи будут полностью и безвозвратно удалены из базы данных и сайта.'
    });
  };

  const promptClearAllMatches = () => {
    if (activeTop.matches.length === 0) return;
    setDeletionTarget({
      type: 'clear_all',
      title: `Очистить все матчи в «${activeTop.name}»`,
      subtitle: `Всего матчей: ${activeTop.matches.length}`,
      details: 'Все матчи и агрегированная статистика этого топа будут полностью стёрты из базы данных и сайта.'
    });
  };

  // Complete Deletion Execution across Database & Site
  const executeConfirmDelete = async () => {
    if (!deletionTarget) return;
    setIsDeleting(true);

    try {
      const uid = user?.uid || 'guest';
      const roomId = getCanonicalRoomId(uid);

      if (deletionTarget.type === 'match' && deletionTarget.id) {
        const matchId = deletionTarget.id;
        
        // 1. Remove from React state / UI
        const updatedMatches = activeTop.matches.filter(m => m.id !== matchId);
        const updatedTops = tops.map(t => t.id === activeTop.id ? { ...t, matches: updatedMatches } : t);
        setTops(updatedTops);

        // 2. Local storage
        localStorage.setItem('skleyka_all_tops', JSON.stringify(updatedTops));
        localStorage.setItem('skleyka_matches', JSON.stringify(updatedMatches));

        // 3. Mark in global deleted_matches set
        try {
          const deletedRaw = localStorage.getItem(`deleted_matches_${roomId}`) || '[]';
          const deletedSet = new Set<string>(JSON.parse(deletedRaw));
          deletedSet.add(matchId);
          localStorage.setItem(`deleted_matches_${roomId}`, JSON.stringify(Array.from(deletedSet)));
        } catch (e) {}

        // 4. Delete from Backend / Firestore / Database
        try {
          await deleteDoc(doc(db, 'matches', matchId));
          await deleteDoc(doc(db, 'skleyka_matches', matchId));
          await fetch('/api/matches/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: roomId, matchId })
          }).catch(() => {});

          await setDoc(doc(db, 'skleyka_meta', roomId), {
            allTopsData: updatedTops,
            activeTopId: activeTop.id,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        } catch (dbErr) {
          console.warn('Backend delete error:', dbErr);
        }

        setDeleteNotice('✓ Матч полностью удалён из базы данных и сайта!');
      } else if (deletionTarget.type === 'top' && deletionTarget.id) {
        const topId = deletionTarget.id;

        // 1. Remove from React state
        let filtered = tops.filter(t => t.id !== topId);
        if (filtered.length === 0) {
          const freshTop: StitcherTop = {
            id: 'top_' + Date.now(),
            name: 'Новый турнир',
            createdAt: Date.now(),
            matches: [],
            top1: null,
            discipline: 'all'
          };
          filtered = [freshTop];
        }
        setTops(filtered);
        localStorage.setItem('skleyka_all_tops', JSON.stringify(filtered));

        let nextActiveId = activeTopId;
        if (activeTopId === topId || !filtered.some(t => t.id === nextActiveId)) {
          nextActiveId = filtered[0].id;
          setActiveTopId(nextActiveId);
          localStorage.setItem('skleyka_active_top_id', nextActiveId);
        }

        // 2. Delete from Backend / Firestore / Database
        try {
          await deleteDoc(doc(db, 'skleyka_tops', topId));
          await setDoc(doc(db, 'skleyka_meta', roomId), {
            allTopsData: filtered,
            activeTopId: nextActiveId,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        } catch (dbErr) {
          console.warn('Backend delete error:', dbErr);
        }

        setDeleteNotice(`✓ Топ «${deletionTarget.title}» полностью удалён из базы данных и сайта!`);
      } else if (deletionTarget.type === 'clear_all') {
        // Clear all matches in active top
        const updatedTops = tops.map(t => t.id === activeTop.id ? { ...t, matches: [], top1: null } : t);
        setTops(updatedTops);
        localStorage.setItem('skleyka_all_tops', JSON.stringify(updatedTops));
        localStorage.setItem('skleyka_matches', '[]');
        localStorage.removeItem('skleyka_top1');

        try {
          await setDoc(doc(db, 'skleyka_meta', roomId), {
            allTopsData: updatedTops,
            activeTopId: activeTop.id,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        } catch (dbErr) {
          console.warn('Backend clear error:', dbErr);
        }

        setDeleteNotice(`✓ Все матчи топа «${activeTop.name}» удалены из базы данных и сайта!`);
      }
    } catch (err: any) {
      console.error('Deletion error:', err);
    } finally {
      setIsDeleting(false);
      setDeletionTarget(null);
      setTimeout(() => setDeleteNotice(null), 3500);
    }
  };

  // App tournaments to import
  const appTournaments = useMemo(() => {
    try {
      const uid = user?.uid || 'guest';
      const roomId = getCanonicalRoomId(uid);
      const list = loadTournaments(roomId);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }, [user]);

  // Import tournament from app as a Top
  const handleImportAppTournament = (tourn: any) => {
    const matches: ExtractedMatch[] = [];
    const uid = user?.uid || 'guest';
    const roomId = getCanonicalRoomId(uid);
    const localMatches = JSON.parse(
      localStorage.getItem(`matches_${roomId}`) || 
      localStorage.getItem(`matches_${uid}`) || 
      '[]'
    );

    const tourMatches = localMatches.filter((m: any) => 
      m && (m.tournamentId === tourn.id || (tourn.name && m.tournamentName === tourn.name))
    );

    tourMatches.forEach((m: any, idx: number) => {
      const pList: any[] = [];
      if (m.team1Players && Array.isArray(m.team1Players)) {
        m.team1Players.forEach((p: any) => {
          pList.push({
            nickname: p.nickname || p.id,
            team: m.team1Name,
            kills: p.kills || p.k || 0,
            deaths: p.deaths || p.d || 0,
            assists: p.assists || p.a || 0,
            damage: p.damage || 0,
            rating: p.rating || 1.0
          });
        });
      }
      if (m.team2Players && Array.isArray(m.team2Players)) {
        m.team2Players.forEach((p: any) => {
          pList.push({
            nickname: p.nickname || p.id,
            team: m.team2Name,
            kills: p.kills || p.k || 0,
            deaths: p.deaths || p.d || 0,
            assists: p.assists || p.a || 0,
            damage: p.damage || 0,
            rating: p.rating || 1.0
          });
        });
      }

      matches.push({
        id: m.id || `app_match_${idx}`,
        team1Name: m.team1Name || 'Команда 1',
        team2Name: m.team2Name || 'Команда 2',
        score1: m.score1 || 0,
        score2: m.score2 || 0,
        players: pList,
        fileName: `Матч ${m.team1Name} vs ${m.team2Name}`
      });
    });

    const newTop: StitcherTop = {
      id: 'tourn_import_' + tourn.id + '_' + Date.now(),
      name: tourn.name || 'Импортированный турнир',
      createdAt: Date.now(),
      matches,
      discipline: 'all',
      description: `Импортировано из турнирной сетки (${matches.length} матчей)`
    };

    setTops(prev => [newTop, ...prev]);
    setActiveTopId(newTop.id);
    setShowTopSelector(false);
  };

  // Add Match Manually parser
  const handleSaveManualMatch = () => {
    const lines = manualPlayersRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const players: any[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(':');
      const nickname = parts[0]?.trim() || `Player_${idx + 1}`;
      const rest = parts[1] || '';
      
      const kMatch = rest.match(/(\d+)\s*k/i);
      const dMatch = rest.match(/(\d+)\s*d/i);
      const aMatch = rest.match(/(\d+)\s*a/i);
      const rMatch = rest.match(/(\d+\.\d+)/);

      const kills = kMatch ? parseInt(kMatch[1]) : 15;
      const deaths = dMatch ? parseInt(dMatch[1]) : 15;
      const assists = aMatch ? parseInt(aMatch[1]) : 4;
      const rating = rMatch ? parseFloat(rMatch[1]) : (kills / Math.max(1, deaths));

      const team = idx < Math.ceil(lines.length / 2) ? manualTeam1 : manualTeam2;

      players.push({
        nickname,
        team,
        kills,
        deaths,
        assists,
        damage: kills * 85,
        rating
      });
    });

    const newMatch: ExtractedMatch = {
      id: 'manual_' + Math.random().toString(36).substr(2, 9),
      team1Name: manualTeam1,
      team2Name: manualTeam2,
      score1: manualScore1,
      score2: manualScore2,
      players,
      fileName: 'Ручной ввод',
      stageId: selectedStageId || undefined
    };

    updateActiveTop(prev => ({
      ...prev,
      matches: [...prev.matches, newMatch]
    }));

    setShowAddManualMatch(false);
  };

  // File Upload via AI OCR
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    const fileList = Array.from(files);
    const newMatches: ExtractedMatch[] = [];

    for (const file of fileList) {
      try {
        console.log(`[OCR] Processing file: ${file.name} (${file.size} bytes)`);
        
        // 1. Compress image to max 1600px width (quality 0.8) before sending
        // This solves payload issues in dev environment proxies
        const compressedBlob = await compressImage(file, 1600, 0.82);
        console.log(`[OCR] Compressed: ${compressedBlob.size} bytes`);

        const formData = new FormData();
        formData.append('media', compressedBlob, file.name.replace(/\.[^.]+$/, '.jpg'));

        const resp = await fetch('/api/gemini/extract-stats', {
          method: 'POST',
          body: formData,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        let data;
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await resp.json();
        } else {
          const text = await resp.text();
          console.error("Non-JSON response from Gemini OCR:", text);
          
          if (text.includes('Cookie check') || text.includes('doctype html')) {
            throw new Error(`Ошибка авторизации сессии (Cookie check). Попробуйте обновить страницу.`);
          }
          
          throw new Error(`Ошибка обработки изображения (${resp.status})`);
        }

        if (!resp.ok) {
          throw new Error(data?.error || `Ошибка: ${resp.status}`);
        }

        newMatches.push({
          ...data,
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          stageId: selectedStageId || undefined
        });
      } catch (err: any) {
        console.error(err);
        setError(`Не удалось распознать скриншот "${file.name}": ${err.message}. Вы также можете добавить матч вручную!`);
      }
    }

    if (newMatches.length > 0) {
      updateActiveTop(prev => ({
        ...prev,
        matches: [...prev.matches, ...newMatches]
      }));
    }

    setIsProcessing(false);
  };

  // Rename active top
  const handleSaveRename = () => {
    if (tempTopName.trim()) {
      updateActiveTop(prev => ({
        ...prev,
        name: tempTopName.trim()
      }));
    }
    setEditingTopName(false);
  };

  // Select Top 1 player
  const handleSelectTop1 = (nickname: string) => {
    updateActiveTop(prev => ({
      ...prev,
      top1: nickname
    }));
  };

  // Aggregated Stats across all matches in the active top
  const aggregatedStats = useMemo(() => {
    const statsMap = new Map<string, any>();

    // Determine which stages are excluded from global view
    const excludedStageIds = new Set(stages.filter(s => s.isExcluded && s.topId === activeTop.id).map(s => s.id));

    activeTop.matches.forEach(m => {
      // If we are in "All Stages" view, exclude matches from excluded stages
      if (!selectedStageId && m.stageId && excludedStageIds.has(m.stageId)) {
        return;
      }

      if (!m.players || !Array.isArray(m.players)) return;

      // Smart match priority resolution: check manual priority, stage priority, stage name, or match filename
      const stage = m.stageId ? stages.find(s => s.id === m.stageId) : null;
      const stageNameLow = (stage?.name || '').toLowerCase();
      const fileNameLow = (m.fileName || '').toLowerCase();

      let matchPriority = m.priority || 1;
      if (stage?.priority && stage.priority > matchPriority) {
        matchPriority = stage.priority;
      }
      if (
        matchPriority < 3 &&
        (stageNameLow.includes('финал') || stageNameLow.includes('final') || fileNameLow.includes('final') || fileNameLow.includes('финал')) &&
        !stageNameLow.includes('полуфинал') && !stageNameLow.includes('semi') && !stageNameLow.includes('1/2') &&
        !stageNameLow.includes('четверть') && !stageNameLow.includes('1/4')
      ) {
        matchPriority = 3;
      } else if (
        matchPriority < 2 &&
        (stageNameLow.includes('полуфинал') || stageNameLow.includes('semi') || stageNameLow.includes('1/2') || fileNameLow.includes('semi'))
      ) {
        matchPriority = 2;
      }

      const isFinalMatch = matchPriority === 3;
      const isSemiMatch = matchPriority === 2;

      m.players.forEach(p => {
        if (!p || !p.nickname) return;
        const key = p.nickname.toLowerCase().trim();
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            nickname: p.nickname,
            team: p.team || 'Свободный агент',
            kills: 0,
            deaths: 0,
            assists: 0,
            damage: 0,
            matchesCount: 0,
            ratingSum: 0,
            highestMatchPriority: 1, // Track if they played in semis/finals
            playedInFinal: false,
            playedInSemi: false,
            finalMatchRating: 0,
            finalMatchWon: false,
            history: []
          });
        }

        const curr = statsMap.get(key);
        curr.kills += (Number(p.kills) || 0);
        curr.deaths += (Number(p.deaths) || 0);
        curr.assists += (Number(p.assists) || 0);
        curr.damage += (Number(p.damage) || 0);
        curr.matchesCount += 1;
        const pRating = Number(p.rating) || 1.0;
        curr.ratingSum += pRating;
        
        if (matchPriority > curr.highestMatchPriority) {
          curr.highestMatchPriority = matchPriority;
        }

        if (isFinalMatch) {
          curr.playedInFinal = true;
          if (pRating > curr.finalMatchRating) curr.finalMatchRating = pRating;
          const isT1 = p.team === m.team1Name;
          const s1 = Number(m.score1) || 0;
          const s2 = Number(m.score2) || 0;
          if ((isT1 && s1 > s2) || (!isT1 && s2 > s1)) {
            curr.finalMatchWon = true;
          }
        }
        if (isSemiMatch) {
          curr.playedInSemi = true;
        }

        if (p.team && curr.team === 'Свободный агент') curr.team = p.team;

        curr.history.push({
          matchId: m.id,
          opponent: p.team === m.team1Name ? m.team2Name : m.team1Name,
          score: `${m.score1}:${m.score2}`,
          kills: p.kills || 0,
          deaths: p.deaths || 0,
          assists: p.assists || 0,
          rating: pRating,
          priority: matchPriority
        });
      });
    });

    const allPlayersList = Array.from(statsMap.values());
    const maxMatchesInTop = Math.max(...allPlayersList.map(p => p.matchesCount), 1);

    const result = allPlayersList
      .map(p => {
        const rating = p.ratingSum / Math.max(1, p.matchesCount);
        const kd = p.kills / Math.max(1, p.deaths);
        const rounds = p.matchesCount * 18;
        const kpr = p.kills / Math.max(1, rounds);
        const apr = p.assists / Math.max(1, rounds);
        const adr = p.damage / Math.max(1, rounds);
        const impact = Math.max(0.5, 2.13 * kpr + 0.12 * apr - 0.41);

        // ========================================================
        // HLTV & ESPORTS TOURNAMENT MVP & TOP SKLEYKI RANKING
        // ========================================================
        let weightedRating = rating;

        // 1. DISTANCE & SAMPLE SIZE WEIGHTING:
        // A player with only 1 match when other players played 3-5 playoff matches CANNOT take Top 1 / MVP
        if (maxMatchesInTop >= 2) {
          if (p.matchesCount === 1) {
            // Significant penalty for 1-match sample size variance
            const singleMatchPenalty = maxMatchesInTop >= 4 ? 0.28 : (maxMatchesInTop === 3 ? 0.22 : 0.16);
            weightedRating -= singleMatchPenalty;
            // Additional penalty if they never reached playoffs
            if (p.highestMatchPriority < 2) {
              weightedRating -= 0.06;
            }
          } else if (p.matchesCount === 2 && maxMatchesInTop >= 4) {
            weightedRating -= 0.10;
          }

          // Bonus for tournament endurance & consistent high-volume participation
          if (p.matchesCount >= 3) {
            const distanceBonus = Math.min(0.08, (p.matchesCount - 1) * 0.02);
            weightedRating += distanceBonus;
          }
        }

        // 2. PLAYOFFS & GRAND FINAL IMPACT:
        // Grand Finalists (priority 3)
        if (p.highestMatchPriority === 3 || p.playedInFinal) {
          // Major boost for reaching the Grand Final
          weightedRating += 0.12;

          // Performance in the Grand Final itself
          if (p.finalMatchRating >= 1.25) {
            weightedRating += 0.05; // Dominant final performance
          } else if (p.finalMatchRating >= 1.10) {
            weightedRating += 0.03; // Strong final performance
          }

          // Champion boost: winning the Grand Final
          if (p.finalMatchWon) {
            weightedRating += 0.04; // Tournament champion bonus
          }
        } else if (p.highestMatchPriority === 2 || p.playedInSemi) {
          // Semi-finalists
          weightedRating += 0.05;
        }

        // 3. COMPETITIVE GUARDS:
        // Negative K/D guard: cannot be top tier with negative KD
        if (kd < 0.85 && kpr < 0.55) {
          weightedRating = Math.min(0.92, weightedRating);
        } else if (kd < 0.92 && kpr < 0.60) {
          weightedRating = Math.min(0.98, weightedRating);
        }

        // Small volume bonus for total tournament kills contribution
        if (p.kills >= 60) weightedRating += 0.02;
        if (p.kills >= 90) weightedRating += 0.02;

        return {
          ...p,
          rating,
          weightedRating,
          kd,
          adr,
          impact
        };
      })
      .sort((a, b) => b.weightedRating - a.weightedRating || b.rating - a.rating || b.kd - a.kd || b.kills - a.kills);

    return result;
  }, [activeTop.matches, selectedStageId, stages, activeTop.id]);

  // Displayed players filtered by view mode & search
  const displayedPlayers = useMemo(() => {
    let list = aggregatedStats;
    if (playerSearchQuery.trim()) {
      const q = playerSearchQuery.toLowerCase().trim();
      list = list.filter(p => p.nickname.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    }
    if (viewLimit === 'top20') return list.slice(0, 20);
    if (viewLimit === 'top10') return list.slice(0, 10);
    return list;
  }, [aggregatedStats, playerSearchQuery, viewLimit]);

  // Effective Top 1 Player
  const currentTop1Player = useMemo(() => {
    if (activeTop.top1) {
      const found = aggregatedStats.find(p => p.nickname.toLowerCase() === activeTop.top1!.toLowerCase());
      if (found) return found;
    }
    return aggregatedStats[0] || null;
  }, [aggregatedStats, activeTop.top1]);

  // Download PNG
  const handleDownload = async () => {
    if (!skleykaRef.current) return;
    setIsDownloading(true);
    try {
      await downloadElementAsImage(
        skleykaRef.current, 
        `${activeTop.name.replace(/\s+/g, '_')}_all_players_${Date.now()}.png`, 
        { backgroundColor: '#0a0a0f' }
      );
    } catch (err) {
      console.error(err);
      setDeleteNotice('Ошибка при экспорте изображения.');
      setTimeout(() => setDeleteNotice(null), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const folder = folders.find(f => f.id === activeTop.folderId);
    
    // Resolve matches with stage names and priority labels
    const enrichedMatches = activeTop.matches.map(m => {
      const stage = stages.find(s => s.id === m.stageId);
      return {
        ...m,
        stageName: stage ? stage.name : 'Без стадии',
        priorityLabel: m.priority === 3 ? 'FINAL' : m.priority === 2 ? 'SEMI-FINAL' : 'REGULAR'
      };
    });

    const totalKills = aggregatedStats.reduce((sum, p) => sum + p.kills, 0);
    const avgRating = aggregatedStats.length > 0 
      ? aggregatedStats.reduce((sum, p) => sum + p.rating, 0) / aggregatedStats.length 
      : 0;

    const data = {
      tournament: {
        name: activeTop.name,
        id: activeTop.id,
        folder: folder ? folder.name : 'Без папки',
        discipline: activeTop.discipline || 'all',
        createdAt: new Date(activeTop.createdAt).toLocaleString(),
      },
      summary: {
        totalMatches: activeTop.matches.length,
        totalUniquePlayers: aggregatedStats.length,
        totalKills: totalKills,
        averageRating: Number(avgRating.toFixed(2)),
        top1Player: currentTop1Player?.nickname || 'N/A'
      },
      leaderboard: displayedPlayers.map((p, idx) => ({
        rank: idx + 1,
        nickname: p.nickname,
        team: p.team,
        rating: Number(p.rating.toFixed(2)),
        weightedRating: Number(p.weightedRating.toFixed(2)),
        kd: Number(p.kd.toFixed(2)),
        adr: Math.round(p.adr),
        matchesPlayed: p.matchesCount,
        totalKills: p.kills,
        totalDeaths: p.deaths,
        totalAssists: p.assists,
        reachedHighStage: p.highestMatchPriority > 1
      })),
      matches: enrichedMatches,
      exportedAt: new Date().toISOString(),
      format: "MatchStitcher_v2_Export"
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTop.name.replace(/\s+/g, '_')}_stats_all_players.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const playerDetails = useMemo(() => {
    if (!selectedProfilePlayer) return null;
    return aggregatedStats.find(p => p.nickname.toLowerCase() === selectedProfilePlayer.toLowerCase());
  }, [selectedProfilePlayer, aggregatedStats]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 font-sans text-white">
      
      {/* Toast Notice */}
      {deleteNotice && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-black font-black text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-200 border border-emerald-400">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{deleteNotice}</span>
        </div>
      )}

      <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-wrap justify-between items-center bg-[#12121a] gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-yellow-500 to-amber-600 p-2.5 rounded-xl shadow-lg shadow-yellow-500/20">
              <Trophy className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {editingTopName ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={tempTopName} 
                      onChange={e => setTempTopName(e.target.value)} 
                      className="bg-black/60 border border-yellow-500/50 rounded-lg px-2.5 py-1 text-sm font-black text-white outline-none"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') setEditingTopName(false); }}
                    />
                    <button onClick={handleSaveRename} className="p-1 bg-yellow-500 text-black rounded text-xs font-bold hover:bg-yellow-400">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingTopName(false)} className="p-1 bg-white/10 text-white rounded text-xs hover:bg-white/20">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">
                      {activeTop.name}
                    </h2>
                    <button 
                      onClick={() => { setTempTopName(activeTop.name); setEditingTopName(true); }}
                      className="opacity-40 group-hover:opacity-100 hover:text-yellow-400 transition-all p-1"
                      title="Переименовать этот топ"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                  Склейка
                </span>
                <button 
                  onClick={() => promptDeleteTop(activeTop)}
                  className="p-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all ml-1 cursor-pointer"
                  title="Удалить этот топ из базы данных и сайта"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-white/40 text-[11px] uppercase font-bold tracking-widest mt-0.5">
                Матчей в топе: {activeTop.matches.length} • Игроков: {aggregatedStats.length} • Топ-1: {currentTop1Player?.nickname || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Save to Cloud Button */}
            <button 
              onClick={handleSaveToCloud}
              disabled={isSavingCloud || !hasUnsavedChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-lg ${
                hasUnsavedChanges 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 animate-pulse' 
                  : 'bg-white/5 text-white/20 border border-white/5 cursor-default'
              }`}
            >
              {isSavingCloud ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{hasUnsavedChanges ? 'Сохранить изменения' : 'Сохранено'}</span>
            </button>

            {/* Top Selector / Switcher */}
            <button 
              onClick={() => { setShowTopSelector(true); setSelectorTab('choose'); }}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 text-yellow-400 border border-yellow-500/30 px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-yellow-500/5"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Выбрать / Сменить топ</span>
              <span className="bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full ml-1">
                {tops.length}
              </span>
            </button>

            {/* Create New Top Quick Button */}
            <button 
              onClick={() => { setShowTopSelector(true); setSelectorTab('create'); }}
              className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать топ</span>
            </button>

            <button 
              onClick={onClose} 
              className="p-2 text-white/50 hover:text-white bg-white/5 rounded-xl transition-colors ml-2"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar: Match List & Match Actions */}
          <div className="w-80 border-r border-white/5 bg-black/40 flex flex-col shrink-0">
            <div className="p-3.5 border-b border-white/5 space-y-2">
              <label className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-600/20 text-xs uppercase tracking-wider">
                <Upload className="w-4 h-4" />
                <span>Загрузить фото матчей</span>
                <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowAddManualMatch(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/80 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-white/5"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>Вручную</span>
                </button>
                {activeTop.matches.length > 0 && (
                  <button 
                    onClick={promptClearAllMatches} 
                    className="px-3 py-2 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl uppercase tracking-wider transition-colors border border-red-500/20 flex items-center gap-1"
                    title="Очистить все матчи этого топа"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Очистить</span>
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-400 text-[10px] font-medium leading-tight flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Match List in Active Top */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
              {isProcessing && (
                <div className="flex flex-col items-center justify-center py-6 gap-2 bg-blue-500/5 rounded-xl border border-blue-500/20 animate-pulse">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Анализ скриншота через ИИ...</span>
                </div>
              )}
              
              {activeTop.matches.length === 0 && !isProcessing && (
                <div className="text-center py-16 text-white/20 px-4">
                  <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">
                    В топе пока нет матчей.<br/>
                    <span className="text-[10px] text-white/40 font-normal">Загрузите скриншоты или добавьте результат вручную</span>
                  </p>
                </div>
              )}

              {activeTop.matches
                .slice()
                .reverse()
                .filter(m => !selectedStageId || m.stageId === selectedStageId)
                .map((m, idx) => {
                  const stage = stages.find(s => s.id === m.stageId);
                  return (
                    <div key={m.id || idx} className="bg-white/5 border border-white/5 rounded-xl p-3 hover:border-white/10 transition-all flex flex-col justify-between group">
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <div className="flex flex-col max-w-[140px]">
                          <span className="text-[9px] text-white/40 font-mono truncate">{m.fileName || `Матч ${idx + 1}`}</span>
                          <span className="text-xs font-bold text-white truncate">{m.team1Name} vs {m.team2Name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Priority Selector (Gold/Silver/Blue dots) */}
                          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg mr-1">
                            <button 
                              onClick={() => handleSetMatchPriority(m.id, 1)}
                              className={`w-3 h-3 rounded-full transition-all ${m.priority === 1 || !m.priority ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-blue-500/20 hover:bg-blue-500/40'}`}
                              title="Обычный матч"
                            />
                            <button 
                              onClick={() => handleSetMatchPriority(m.id, 2)}
                              className={`w-3 h-3 rounded-full transition-all ${m.priority === 2 ? 'bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.5)]' : 'bg-slate-300/20 hover:bg-slate-300/40'}`}
                              title="Полуфинал (Серебро)"
                            />
                            <button 
                              onClick={() => handleSetMatchPriority(m.id, 3)}
                              className={`w-3 h-3 rounded-full transition-all ${m.priority === 3 ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'bg-yellow-400/20 hover:bg-yellow-400/40'}`}
                              title="Финал (Золото)"
                            />
                          </div>

                          <div className="relative">
                            <button 
                              onClick={() => setMovingMatchToStageId(movingMatchToStageId === m.id ? null : m.id)}
                              className={`p-1.5 rounded-lg transition-all ${m.stageId ? 'text-blue-400 bg-blue-500/10' : 'text-white/20 hover:text-blue-400 hover:bg-white/5'}`}
                              title="Назначить стадию (Группа, Плей-офф и т.д.)"
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </button>
                            {movingMatchToStageId === m.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="px-2 py-1.5 text-[9px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 mb-1">
                                  Выберите стадию
                                </div>
                                <button 
                                  onClick={() => handleMoveMatchToStage(m.id, null)}
                                  className="w-full text-left px-2 py-2 text-[10px] font-bold text-white/60 hover:bg-white/5 rounded-lg flex items-center gap-2"
                                >
                                  <X className="w-3 h-3" /> Без стадии
                                </button>
                                {stages.filter(s => s.topId === activeTop.id).map(s => (
                                  <button 
                                    key={s.id}
                                    onClick={() => handleMoveMatchToStage(m.id, s.id)}
                                    className="w-full text-left px-2 py-2 text-[10px] font-bold text-white/60 hover:bg-white/5 rounded-lg flex items-center gap-2"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-blue-500" /> {s.name}
                                  </button>
                                ))}
                                {stages.filter(s => s.topId === activeTop.id).length === 0 && (
                                  <div className="px-2 py-2 text-[9px] text-white/30 italic">
                                    Сначала создайте стадии в правой панели
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={(e) => promptDeleteMatch(m, e)}
                            className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all border border-red-500/10 hover:border-red-500/30"
                            title="Удалить этот матч"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 mb-1.5">
                        <span className="text-xs font-black text-white font-mono">{m.score1}:{m.score2}</span>
                        <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{m.players?.length || 0} игроков</span>
                      </div>
                      {stage && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-blue-500/20">
                            {stage.name}
                          </span>
                          {m.priority === 3 && (
                            <span className="bg-yellow-500/20 text-yellow-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-yellow-500/30">
                              ФИНАЛ
                            </span>
                          )}
                          {m.priority === 2 && (
                            <span className="bg-slate-300/20 text-slate-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-slate-300/30">
                              ПОЛУФИНАЛ
                            </span>
                          )}
                        </div>
                      )}
                      {!stage && (m.priority === 2 || m.priority === 3) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {m.priority === 3 && (
                            <span className="bg-yellow-500/20 text-yellow-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-yellow-500/30">
                              ФИНАЛ
                            </span>
                          )}
                          {m.priority === 2 && (
                            <span className="bg-slate-300/20 text-slate-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-slate-300/30">
                              ПОЛУФИНАЛ
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Main Area: Top Stats, Top-1 Banner, Full Player Table */}
          <div className="flex-1 flex flex-col bg-black/60 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              {activeTop.matches.length > 0 ? (
                <div className="space-y-6">
                  
                  {/* Top Bar Controls & Exports */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12121a]/80 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Вид таблицы:</span>
                      <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                          onClick={() => setViewLimit('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewLimit === 'all' ? 'bg-yellow-500 text-black shadow-md' : 'text-white/40 hover:text-white'}`}
                        >
                          Все игроки ({aggregatedStats.length})
                        </button>
                        <button
                          onClick={() => setViewLimit('top20')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewLimit === 'top20' ? 'bg-yellow-500 text-black shadow-md' : 'text-white/40 hover:text-white'}`}
                        >
                          Топ-20
                        </button>
                        <button
                          onClick={() => setViewLimit('top10')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewLimit === 'top10' ? 'bg-yellow-500 text-black shadow-md' : 'text-white/40 hover:text-white'}`}
                        >
                          Топ-10
                        </button>
                      </div>

                      <div className="relative ml-2">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input 
                          type="text" 
                          value={playerSearchQuery} 
                          onChange={e => setPlayerSearchQuery(e.target.value)} 
                          placeholder="Поиск по нику..." 
                          className="bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-yellow-500/50 w-36 sm:w-48 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleExportJson}
                        className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-lg shadow-blue-500/5"
                        title="Скачать всю склейку в формате JSON"
                      >
                        <Database className="w-3.5 h-3.5" />
                        JSON
                      </button>
                      <button 
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/5"
                        title="Скачать картинку всей таблицы"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {isDownloading ? 'Рендеринг...' : 'PNG'}
                      </button>
                    </div>
                  </div>

                  {/* Renderable Container for PNG Export */}
                  <div ref={skleykaRef} className="border border-white/10 rounded-3xl bg-[#0a0a0f] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 opacity-50" />
                    
                    {/* Background decorations like in MatchDetails */}
                    <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2" />
                    
                    {/* Header in Export View */}
                    <div className="mb-10 text-center relative z-10">
                      <div className="inline-block px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-4">
                        <span className="text-[10px] text-yellow-500 font-black uppercase tracking-[0.4em]">
                          ОБЪЕДИНЕННАЯ СТАТИСТИКА СКЛЕЙКИ
                        </span>
                      </div>
                      <h4 className="text-4xl font-black text-white uppercase tracking-[0.15em] drop-shadow-2xl">
                        {activeTop.name}
                      </h4>
                      <div className="h-1 w-24 bg-yellow-500 mx-auto mt-4 rounded-full opacity-50" />
                      <p className="text-[11px] text-white/30 font-bold uppercase tracking-[0.2em] mt-4">
                        Всего сыграно матчей: <span className="text-white/60">{activeTop.matches.length}</span> • Уникальных игроков: <span className="text-white/60">{aggregatedStats.length}</span>
                      </p>
                    </div>

                    {/* Top-1 Tournament Showcase Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 relative z-10">
                      {/* Top-1 Hero Card */}
                      <div className="md:col-span-1 bg-gradient-to-b from-[#1a1a24] to-[#12121a] border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-2xl shadow-black/50">
                        <div className="absolute top-4 left-4 bg-yellow-500 text-black text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider shadow-lg">
                          🏆 ТОП-1 ТУРНИРА
                        </div>
                        
                        <div className="relative mt-6">
                          <PlayerAvatar playerName={currentTop1Player?.nickname || 'Top1'} sizeClassName="w-28 h-28 rounded-full ring-4 ring-yellow-500/40 p-1.5 bg-black shadow-2xl" />
                          <div className="absolute -top-1 -right-1 bg-yellow-500 text-black p-2 rounded-full shadow-lg border-2 border-black">
                            <Trophy className="w-5 h-5 fill-black" />
                          </div>
                        </div>
                        
                        <h5 className="text-2xl font-black text-white mt-6 uppercase tracking-widest drop-shadow-md">
                          {currentTop1Player?.nickname || '—'}
                        </h5>
                        <div className="flex items-center gap-2 mt-2 text-white/40 text-xs font-bold uppercase tracking-wider">
                          <TeamLogo teamName={currentTop1Player?.team || ''} sizeClassName="w-4 h-4 opacity-50" />
                          {currentTop1Player?.team || 'Свободный агент'}
                        </div>

                        {currentTop1Player && (
                          <div className="flex items-center gap-2 mt-2.5 flex-wrap justify-center">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                              {currentTop1Player.matchesCount} {currentTop1Player.matchesCount === 1 ? 'матч' : currentTop1Player.matchesCount < 5 ? 'матча' : 'матчей'}
                            </span>
                            {currentTop1Player.highestMatchPriority === 3 && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                {currentTop1Player.finalMatchWon ? '🏆 ЧЕМПИОН' : '👑 ФИНАЛИСТ'}
                              </span>
                            )}
                            {currentTop1Player.highestMatchPriority === 2 && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/30">
                                🥈 ПОЛУФИНАЛ
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="mt-6 pt-5 border-t border-white/5 w-full grid grid-cols-3 gap-3 text-center">
                          <div>
                            <span className="text-[9px] uppercase text-white/20 font-black block mb-1">MVP Score</span>
                            <span className="text-lg font-black text-yellow-500 font-mono">
                              {currentTop1Player ? (currentTop1Player.weightedRating || currentTop1Player.rating).toFixed(2) : '0.00'}
                            </span>
                            {currentTop1Player && currentTop1Player.matchesCount > 1 && (
                              <span className="text-[9px] text-white/30 font-mono block">
                                ср. {currentTop1Player.rating.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] uppercase text-white/20 font-black block mb-1">K/D</span>
                            <span className={`text-lg font-black font-mono ${getKdColorClass(currentTop1Player?.kd || 1)}`}>{currentTop1Player?.kd.toFixed(2) || '0.00'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase text-white/20 font-black block mb-1">Киллов</span>
                            <span className="text-lg font-black text-white font-mono">{currentTop1Player?.kills || 0}</span>
                          </div>
                        </div>
                        
                        {/* Selector for custom Top 1 */}
                        <div className="mt-8 w-full">
                          <label className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2">
                            Сменить лидера вручную:
                          </label>
                          <select 
                            value={activeTop.top1 || currentTop1Player?.nickname || ''}
                            onChange={e => handleSelectTop1(e.target.value)}
                            className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-yellow-500/40 transition-all cursor-pointer"
                          >
                            {aggregatedStats.map(p => (
                              <option key={p.nickname} value={p.nickname}>
                                {p.nickname} ({p.team})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Stat Tiles */}
                      <div className="md:col-span-2 grid grid-cols-2 gap-6">
                        <div className="bg-[#12121a] border border-white/5 rounded-3xl p-6 flex flex-col justify-center items-center shadow-xl hover:border-white/10 transition-colors group">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 group-hover:text-white/40 transition-colors">Всего Убийств</span>
                          <span className="text-4xl font-black text-white font-mono drop-shadow-lg">{aggregatedStats.reduce((sum, p) => sum + p.kills, 0)}</span>
                          <div className="h-0.5 w-8 bg-yellow-500/30 mt-3 rounded-full" />
                        </div>
                        <div className="bg-[#12121a] border border-white/5 rounded-3xl p-6 flex flex-col justify-center items-center shadow-xl hover:border-white/10 transition-colors group">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 group-hover:text-white/40 transition-colors">Матчей В Склейке</span>
                          <span className="text-4xl font-black text-blue-400 font-mono drop-shadow-lg">{activeTop.matches.length}</span>
                          <div className="h-0.5 w-8 bg-blue-500/30 mt-3 rounded-full" />
                        </div>
                        <div className="bg-[#12121a] border border-white/5 rounded-3xl p-6 flex flex-col justify-center items-center shadow-xl hover:border-white/10 transition-colors group">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 group-hover:text-white/40 transition-colors">Средний Рейтинг</span>
                          <span className="text-4xl font-black text-yellow-500 font-mono drop-shadow-lg">
                            {(aggregatedStats.reduce((sum, p) => sum + p.rating, 0) / Math.max(1, aggregatedStats.length)).toFixed(2)}
                          </span>
                          <div className="h-0.5 w-8 bg-yellow-500/30 mt-3 rounded-full" />
                        </div>
                        <div className="bg-[#12121a] border border-white/5 rounded-3xl p-6 flex flex-col justify-center items-center shadow-xl hover:border-white/10 transition-colors group">
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 group-hover:text-white/40 transition-colors">Всего Игроков</span>
                          <span className="text-4xl font-black text-emerald-400 font-mono drop-shadow-lg">{aggregatedStats.length}</span>
                          <div className="h-0.5 w-8 bg-emerald-500/30 mt-3 rounded-full" />
                        </div>
                      </div>
                    </div>

                    {/* Table of ALL players */}
                    <div className="overflow-x-auto relative z-10 bg-[#12121a]/50 border border-white/5 rounded-3xl p-4">
                      <table className="w-full text-left border-separate border-spacing-y-1.5">
                        <thead>
                          <tr className="text-white/30 uppercase tracking-wider text-[10px] border-b border-white/5">
                            <th className="px-4 py-3 text-center font-medium">#</th>
                            <th className="px-4 py-3 font-medium">Игрок</th>
                            <th className="px-4 py-3 font-medium">Команда</th>
                            <th className="px-4 py-3 text-center font-medium">Матчей</th>
                            <th className="px-4 py-3 text-center font-medium">K-A-D</th>
                            <th className="px-4 py-3 text-center font-medium">+/-</th>
                            <th className="px-4 py-3 text-center font-medium" title="Average Damage per Round">ADR</th>
                            <th className="px-4 py-3 text-center font-medium" title="Impact Rating">Impact</th>
                            <th className="px-4 py-3 text-center font-medium">K/D</th>
                            <th className="px-4 py-3 text-right font-medium" title="Рейтинг MVP турнира с учётом дистанции, плей-офф и финала">MVP Рейтинг</th>
                            <th className="px-4 py-3 text-center font-medium">Топ-1</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedPlayers.map((p, idx) => {
                            const isChosenTop1 = (activeTop.top1 ? activeTop.top1.toLowerCase() === p.nickname.toLowerCase() : idx === 0);
                            return (
                              <tr 
                                key={p.nickname + idx} 
                                className={`transition-all duration-200 group hover:scale-[1.005] ${
                                  isChosenTop1 ? 'bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.05)]' : 'bg-white/[0.02] hover:bg-white/5'
                                }`}
                              >
                                <td className="px-4 py-4 text-center first:rounded-l-2xl">
                                  <span className={`font-bold text-xs font-mono ${isChosenTop1 ? 'text-yellow-400' : 'text-white/20'}`}>
                                    {isChosenTop1 ? '👑 1' : idx + 1}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <div 
                                    className="flex items-center gap-3 cursor-pointer" 
                                    onClick={() => setSelectedProfilePlayer(p.nickname)}
                                  >
                                    <PlayerAvatar playerName={p.nickname} sizeClassName="w-9 h-9 rounded-xl shadow-lg border border-white/5" />
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-sm font-bold text-white/90 group-hover:text-yellow-400 transition-colors uppercase tracking-wider">
                                          {p.nickname}
                                        </span>
                                        {p.highestMatchPriority === 3 && (
                                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" title="Финалист турнира">
                                            ФИНАЛ
                                          </span>
                                        )}
                                        {p.highestMatchPriority === 2 && (
                                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-300/20 text-slate-300 border border-slate-300/30" title="Полуфиналист турнира">
                                            1/2
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2 text-xs text-white/40 font-bold uppercase tracking-tight">
                                    <TeamLogo teamName={p.team} sizeClassName="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                                    <span className="truncate max-w-[120px]">{p.team}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center text-xs font-mono text-white/40">{p.matchesCount}</td>
                                <td className="px-4 py-4 text-center text-white/70 font-mono text-xs">
                                  {p.kills}-{p.assists}-{p.deaths}
                                </td>
                                <td className={`px-4 py-4 text-center font-mono text-xs ${p.kills - p.deaths > 0 ? 'text-green-400' : p.kills - p.deaths < 0 ? 'text-red-400' : 'text-white/50'}`}>
                                  {p.kills - p.deaths > 0 ? `+${p.kills - p.deaths}` : p.kills - p.deaths}
                                </td>
                                <td className="px-4 py-4 text-center text-white/50 font-mono text-xs">{Math.round(p.adr)}</td>
                                <td className="px-4 py-4 text-center text-white/50 font-mono text-xs">{p.impact.toFixed(2)}</td>
                                <td className={`px-4 py-4 text-center font-mono text-xs ${getKdColorClass(p.kd)}`}>
                                  {p.kd.toFixed(2)}
                                </td>
                                <td className="px-4 py-4 text-right last:rounded-r-2xl">
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-black text-yellow-500 font-mono">
                                      {p.weightedRating.toFixed(2)}
                                    </span>
                                    {p.matchesCount > 1 ? (
                                      <span className="text-[9px] text-white/30 font-mono" title={`Базовый средний рейтинг: ${p.rating.toFixed(2)} за ${p.matchesCount} матчей`}>
                                        ср: {p.rating.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-[8px] text-white/20 font-mono uppercase">
                                        1 матч
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <button 
                                    onClick={() => handleSelectTop1(p.nickname)}
                                    className={`p-2 rounded-xl border transition-all ${
                                      isChosenTop1
                                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-xl' 
                                        : 'bg-white/5 text-white/10 border-white/5 hover:text-yellow-400 hover:border-yellow-500/30'
                                    }`}
                                  >
                                    <Trophy className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-20 opacity-80">
                  <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <BarChart3 className="w-10 h-10 text-yellow-500" />
                  </div>
                  <div className="max-w-md">
                    <h3 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
                      Топ "{activeTop.name}" пуст
                    </h3>
                    <p className="text-sm font-medium text-white/50 leading-relaxed mb-6">
                      Загрузите скриншоты результатов матчей слева, добавьте матч вручную или выберите один из готовых топов!
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button 
                        onClick={() => { setShowTopSelector(true); setSelectorTab('choose'); }}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
                      >
                        Выбрать готовый топ
                      </button>
                      <button 
                        onClick={() => setShowAddManualMatch(true)}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold uppercase text-xs px-5 py-2.5 rounded-xl transition-all border border-white/10"
                      >
                        Добавить матч вручную
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR: STAGES (User specifically asked for this) */}
          <div className="w-64 border-l border-white/5 bg-[#0a0a0f] flex flex-col shrink-0">
            <div className="p-4 border-b border-white/5 bg-[#12121a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">Стадии (Папки)</span>
              </div>
              <button 
                onClick={() => setIsCreatingStage(true)}
                className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg transition-all border border-blue-500/20"
                title="Добавить новую стадию (папку для матчей)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {isCreatingStage && (
                <div className="bg-blue-600/10 border border-blue-500/30 p-3 rounded-xl mb-3 space-y-2.5 animate-in slide-in-from-top-2 duration-200 shadow-xl">
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Новая стадия</div>
                  <input 
                    autoFocus
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-[11px] font-bold text-white outline-none focus:border-blue-500/50"
                    value={newStageName}
                    onChange={e => setNewStageName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateStage()}
                    placeholder="Например: Плей-офф..."
                  />
                  
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Важность стадии</div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map(p => (
                        <button
                          key={p}
                          onClick={() => setNewStagePriority(p)}
                          className={`flex-1 py-1 rounded text-[9px] font-black border transition-all ${newStagePriority === p ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-transparent text-white/30 hover:bg-white/10'}`}
                        >
                          {p === 1 ? 'LOW' : p === 2 ? 'MID' : 'HIGH'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setNewStageExcluded(!newStageExcluded)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border transition-all ${newStageExcluded ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">Исключить из общего топа</span>
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${newStageExcluded ? 'bg-red-500 border-red-500 text-black' : 'border-white/20'}`}>
                      {newStageExcluded && <X className="w-2.5 h-2.5 stroke-[4]" />}
                    </div>
                  </button>

                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={handleCreateStage}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase py-2 rounded-lg transition-all"
                    >
                      Создать
                    </button>
                    <button 
                      onClick={() => setIsCreatingStage(false)}
                      className="px-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase rounded-lg transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <button 
                  onClick={() => setSelectedStageId(null)}
                  className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                    !selectedStageId 
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/5' 
                      : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Все матчи</span>
                  <span className="ml-auto bg-white/5 px-2 py-0.5 rounded text-[9px] font-mono">{activeTop.matches.length}</span>
                </button>

                {stages.filter(s => s.topId === activeTop.id).map(stage => {
                  const count = activeTop.matches.filter(m => m.stageId === stage.id).length;
                  return (
                    <button 
                      key={stage.id}
                      onClick={() => setSelectedStageId(stage.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border group ${
                        selectedStageId === stage.id 
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/5' 
                          : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${selectedStageId === stage.id ? 'bg-blue-400 animate-pulse' : 'bg-blue-500/30'}`} />
                      <span className={`truncate ${stage.isExcluded ? 'line-through opacity-50' : ''}`}>{stage.name}</span>
                      {stage.isExcluded && (
                        <span title="Исключено из общего топа">
                          <X className="w-2.5 h-2.5 text-red-500/50 ml-1" />
                        </span>
                      )}
                      {stage.priority === 3 && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.5)] ml-1" />}
                      {stage.priority === 1 && <div className="w-1.5 h-1.5 rounded-full bg-white/20 ml-1" />}
                      <span className="ml-auto bg-white/5 px-2 py-0.5 rounded text-[9px] font-mono group-hover:bg-white/10 transition-colors">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {stages.filter(s => s.topId === activeTop.id).length === 0 && !isCreatingStage && (
                <div className="mt-8 text-center px-4 py-8 border border-dashed border-white/5 rounded-2xl">
                  <Layers className="w-8 h-8 text-white/5 mx-auto mb-3" />
                  <p className="text-[10px] text-white/20 font-bold uppercase leading-relaxed tracking-wider">
                    Разделите матчи на стадии (Группы, Квалы, Плей-офф).<br/>Нажмите +, чтобы добавить первую стадию.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Manager & Selector Modal */}
        {showTopSelector && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
              
              {/* Header */}
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500/20 p-2 rounded-xl">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">
                      Менеджер Топов Склейки
                    </h3>
                    <p className="text-[11px] text-white/40 uppercase font-bold tracking-widest">
                      Создайте новый топ или выберите из готовых топов
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTopSelector(false)} 
                  className="p-1.5 text-white/40 hover:text-white bg-white/5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-5 pt-4 flex gap-2 border-b border-white/5 bg-black/20">
                <button
                  onClick={() => setSelectorTab('choose')}
                  className={`pb-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                    selectorTab === 'choose'
                      ? 'border-yellow-500 text-yellow-400' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Выбрать из готовых топов ({tops.length})
                </button>
                <button
                  onClick={() => setSelectorTab('create')}
                  className={`pb-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                    selectorTab === 'create'
                      ? 'border-yellow-500 text-yellow-400' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Создать новый топ
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                {selectorTab === 'create' ? (
                  <div className="max-w-lg mx-auto py-4 space-y-5">
                    <div>
                      <label className="text-xs font-black text-white/60 uppercase tracking-wider block mb-2">
                        Название турнира / топа
                      </label>
                      <input 
                        type="text" 
                        value={newTopNameInput} 
                        onChange={e => setNewTopNameInput(e.target.value)} 
                        placeholder="Например: Турнир 1, Major Masters, Лига 2026..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-yellow-500/50 transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-white/60 uppercase tracking-wider block mb-2">
                        Дисциплина
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewTopDiscipline('cs2')}
                          className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                            newTopDiscipline === 'cs2' 
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                              : 'bg-white/5 text-white/40 border-white/5 hover:text-white'
                          }`}
                        >
                          CS2
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewTopDiscipline('s2')}
                          className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                            newTopDiscipline === 's2' 
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                              : 'bg-white/5 text-white/40 border-white/5 hover:text-white'
                          }`}
                        >
                          Standoff 2
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewTopDiscipline('all')}
                          className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                            newTopDiscipline === 'all' 
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                              : 'bg-white/5 text-white/40 border-white/5 hover:text-white'
                          }`}
                        >
                          Общий
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleCreateNewTop}
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 fill-black" />
                      <span>Создать топ и начать загрузку матчей</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-6 h-full">
                    {/* Folder Sidebar for Tops */}
                    <div className="w-48 shrink-0 flex flex-col gap-3 border-r border-white/5 pr-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Папки</span>
                        <button 
                          onClick={() => setIsCreatingFolder(true)}
                          className="p-1 hover:text-yellow-400 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isCreatingFolder && (
                        <div className="bg-black/60 p-2.5 rounded-xl border border-yellow-500/30 space-y-2 mb-2">
                          <input 
                            autoFocus
                            className="bg-black/40 border border-white/10 outline-none text-[11px] font-bold text-white w-full px-2 py-1.5 rounded-lg"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                            placeholder="Имя папки..."
                          />
                          
                          <div className="space-y-1">
                            <div className="text-[8px] font-black text-white/30 uppercase tracking-widest">Важность</div>
                            <div className="flex gap-1">
                              {[1, 2, 3].map(p => (
                                <button
                                  key={p}
                                  onClick={() => setNewFolderPriority(p)}
                                  className={`flex-1 py-1 rounded text-[8px] font-black border transition-all ${newFolderPriority === p ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' : 'bg-white/5 border-transparent text-white/30 hover:bg-white/10'}`}
                                >
                                  {p === 1 ? 'LOW' : p === 2 ? 'MID' : 'HIGH'}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => setNewFolderExcluded(!newFolderExcluded)}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg border transition-all ${newFolderExcluded ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                          >
                            <span className="text-[9px] font-bold uppercase tracking-wider">Скрыть из общего</span>
                            <div className={`w-3 h-3 rounded border flex items-center justify-center transition-all ${newFolderExcluded ? 'bg-red-500 border-red-500 text-black' : 'border-white/20'}`}>
                              {newFolderExcluded && <X className="w-2 h-2 stroke-[4]" />}
                            </div>
                          </button>

                          <div className="flex gap-1.5 pt-1">
                            <button onClick={handleCreateFolder} className="flex-1 bg-yellow-500 text-black text-[9px] font-black uppercase py-1.5 rounded-lg">Создать</button>
                            <button onClick={() => setIsCreatingFolder(false)} className="px-2 bg-white/10 text-white rounded-lg"><X className="w-3 h-3" /></button>
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => setSelectedFolderId(null)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${!selectedFolderId ? 'bg-yellow-500/20 text-yellow-500' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Все топы</span>
                      </button>

                      {folders.map(folder => (
                        <button 
                          key={folder.id}
                          onClick={() => setSelectedFolderId(folder.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedFolderId === folder.id ? 'bg-yellow-500/20 text-yellow-500' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span className={`truncate ${folder.isExcluded ? 'line-through opacity-50' : ''}`}>{folder.name}</span>
                          {folder.isExcluded && <X className="w-2.5 h-2.5 text-red-500/50 ml-auto mr-1" />}
                          {folder.priority === 3 && <div className="w-1 h-1 rounded-full bg-yellow-400 ml-auto mr-1" />}
                          {folder.priority === 1 && <div className="w-1 h-1 rounded-full bg-white/20 ml-auto mr-1" />}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 space-y-6">
                      {/* User Saved Tops */}
                      <div>
                        <h4 className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5" />
                          {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'Ваши топы'}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {tops.filter(t => !selectedFolderId || t.folderId === selectedFolderId).map(t => {
                            const isActive = t.id === activeTop.id;
                            return (
                              <div 
                                key={t.id}
                                onClick={() => handleSelectTop(t.id)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group relative flex flex-col justify-between ${
                                  isActive 
                                    ? 'bg-yellow-500/10 border-yellow-500/50 shadow-lg shadow-yellow-500/5' 
                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-start mb-1">
                                    <h5 className="font-bold text-white group-hover:text-yellow-400 transition-colors text-sm">
                                      {t.name}
                                    </h5>
                                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                      {isActive && (
                                        <span className="bg-yellow-500 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                          Активный
                                        </span>
                                      )}
                                      <div className="relative">
                                        <button 
                                          onClick={() => setMovingTopId(movingTopId === t.id ? null : t.id)}
                                          className="p-1 text-white/20 hover:text-yellow-400 transition-colors"
                                          title="Переместить в папку"
                                        >
                                          <FolderPlus className="w-3.5 h-3.5" />
                                        </button>
                                        {movingTopId === t.id && (
                                          <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a24] border border-white/10 rounded-lg shadow-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                                            <button 
                                              onClick={() => handleMoveTopToFolder(t.id, null)}
                                              className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-white/60 hover:bg-white/5 rounded flex items-center gap-2"
                                            >
                                              <X className="w-3 h-3" /> Без папки
                                            </button>
                                            {folders.map(f => (
                                              <button 
                                                key={f.id}
                                                onClick={() => handleMoveTopToFolder(t.id, f.id)}
                                                className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-white/60 hover:bg-white/5 rounded flex items-center gap-2"
                                              >
                                                <FolderOpen className="w-3 h-3 text-yellow-500" /> {f.name}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-white/40 mb-3">
                                    {t.description || 'Пользовательский топ'}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-mono text-white/50">
                                  <span>Матчей: <strong className="text-white">{t.matches.length}</strong></span>
                                  {t.top1 && <span>Топ-1: <strong className="text-yellow-400">{t.top1}</strong></span>}
                                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={e => handleDuplicateTop(t, e)}
                                      className="p-1.5 text-white/30 hover:text-white rounded hover:bg-white/5 cursor-pointer"
                                      title="Дублировать топ"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={e => promptDeleteTop(t, e)}
                                      className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/10 hover:border-red-500/30 cursor-pointer"
                                      title="Удалить топ из базы данных и сайта"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* App Tournaments section */}
                      {!selectedFolderId && appTournaments.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                            Импортировать из турниров приложения ({appTournaments.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {appTournaments.map((t: any) => (
                              <div 
                                key={t.id}
                                onClick={() => handleImportAppTournament(t)}
                                className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-yellow-500/30 transition-all cursor-pointer flex items-center justify-between group"
                              >
                                <div>
                                  <h5 className="font-bold text-white text-xs group-hover:text-yellow-400 transition-colors">
                                    {t.name || 'Турнир'}
                                  </h5>
                                  <span className="text-[10px] text-white/40">
                                    Формат: {t.format || 'Double Elim'} • Команд: {t.teams?.length || 0}
                                  </span>
                                </div>
                                <span className="text-[10px] font-black text-yellow-400 uppercase bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 group-hover:bg-yellow-500 group-hover:text-black transition-all">
                                  Импорт
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-black/40 flex justify-between items-center">
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">
                  Выбран топ: <strong className="text-white">{activeTop.name}</strong>
                </span>
                <button
                  onClick={() => setShowTopSelector(false)}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold uppercase text-xs px-5 py-2 rounded-xl transition-all"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated "Точно хотите удалить?" Confirmation Modal */}
        {deletionTarget && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4">
            <div className="bg-[#12121a] border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
              
              <div className="flex items-center gap-3.5 mb-4">
                <div className="bg-red-500/20 text-red-500 p-3 rounded-2xl border border-red-500/30">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    Точно хотите удалить?
                  </h3>
                  <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mt-0.5">
                    Подтверждение удаления
                  </p>
                </div>
              </div>

              <div className="bg-black/50 border border-white/5 rounded-xl p-4 mb-4 space-y-1.5">
                <div className="text-sm font-black text-white">{deletionTarget.title}</div>
                <div className="text-xs font-mono text-white/60">{deletionTarget.subtitle}</div>
                {deletionTarget.details && (
                  <div className="text-[11px] text-white/40 pt-2 border-t border-white/5 leading-relaxed">
                    {deletionTarget.details}
                  </div>
                )}
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-300 font-medium leading-relaxed">
                  После подтверждения все удалённые данные будут <strong>полностью и безвозвратно удалены из базы данных и сайта</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={executeConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase text-xs py-3 rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Удаление из БД...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Да, удалить навсегда</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setDeletionTarget(null)}
                  disabled={isDeleting}
                  className="px-5 py-3 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-bold uppercase text-xs rounded-xl transition-all cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Match Add Modal */}
        {showAddManualMatch && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[75] flex items-center justify-center p-4">
            <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <h4 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Добавить результат матча вручную
                </h4>
                <button onClick={() => setShowAddManualMatch(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase block mb-1">Команда 1</label>
                    <input 
                      type="text" 
                      value={manualTeam1} 
                      onChange={e => setManualTeam1(e.target.value)} 
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase block mb-1">Счёт 1</label>
                    <input 
                      type="number" 
                      value={manualScore1} 
                      onChange={e => setManualScore1(parseInt(e.target.value) || 0)} 
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase block mb-1">Команда 2</label>
                    <input 
                      type="text" 
                      value={manualTeam2} 
                      onChange={e => setManualTeam2(e.target.value)} 
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase block mb-1">Счёт 2</label>
                    <input 
                      type="number" 
                      value={manualScore2} 
                      onChange={e => setManualScore2(parseInt(e.target.value) || 0)} 
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white font-bold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase block mb-1">
                    Игроки и статистика (Ник: K D A Rating):
                  </label>
                  <textarea 
                    value={manualPlayersRaw} 
                    onChange={e => setManualPlayersRaw(e.target.value)}
                    rows={6}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white font-mono text-[11px] outline-none focus:border-yellow-500/50"
                  />
                  <p className="text-[9px] text-white/30 mt-1">
                    Первая половина игроков относится к Команде 1, вторая к Команде 2.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleSaveManualMatch}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Сохранить матч в топ
                  </button>
                  <button 
                    onClick={() => setShowAddManualMatch(false)}
                    className="px-4 bg-white/5 hover:bg-white/10 text-white/60 font-bold uppercase rounded-xl transition-all"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Player Details HLTV-style Modal */}
        {playerDetails && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-yellow-500/15 to-transparent">
                <div className="flex items-center gap-4">
                  <PlayerAvatar playerName={playerDetails.nickname} sizeClassName="w-16 h-16 rounded-2xl ring-4 ring-black" />
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-wider">{playerDetails.nickname}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <TeamLogo teamName={playerDetails.team} sizeClassName="w-4 h-4 opacity-60" />
                      <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{playerDetails.team}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedProfilePlayer(null)} className="p-2 text-white/40 hover:text-white bg-white/5 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">Матчей</span>
                    <span className="text-xl font-black text-white font-mono">{playerDetails.matchesCount}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center border-b-2 border-yellow-500/50">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">Rating</span>
                    <span className="text-xl font-black text-yellow-500 font-mono">{playerDetails.rating.toFixed(2)}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">K/D</span>
                    <span className={`text-xl font-black font-mono ${getKdColorClass(playerDetails.kd)}`}>{playerDetails.kd.toFixed(2)}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">Kills</span>
                    <span className="text-xl font-black text-white font-mono">{playerDetails.kills}</span>
                  </div>
                </div>

                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Сыгранные матчи игрока
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                  {playerDetails.history.map((h: any, idx: number) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between hover:bg-white/5 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-0.5">vs {h.opponent}</span>
                        <span className="text-xs font-bold text-white/60">Счет: {h.score}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">K-D</span>
                          <span className="text-sm font-black text-white font-mono">{h.kills} - {h.deaths}</span>
                        </div>
                        <div className="flex flex-col items-end w-12">
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Rating</span>
                          <span className="text-sm font-black text-yellow-500 font-mono">{h.rating.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-black/40 border-t border-white/5 flex justify-between items-center">
                <button
                  onClick={() => { handleSelectTop1(playerDetails.nickname); setSelectedProfilePlayer(null); }}
                  className="bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500/30 font-black uppercase text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Сделать Топ-1 турнира</span>
                </button>
                <button onClick={() => setSelectedProfilePlayer(null)} className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] hover:text-white transition-colors">
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
