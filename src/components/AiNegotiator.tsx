import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bot, 
  ShieldAlert, 
  Sparkles, 
  Send, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Swords, 
  Trophy, 
  FileText, 
  UserCheck, 
  Layers, 
  RotateCcw, 
  Flame, 
  ChevronRight, 
  Plus, 
  Trash2,
  TrendingUp,
  Percent,
  Check,
  Scale,
  Globe,
  Upload,
  Coins,
  Building2,
  Landmark,
  Star,
  Edit3,
  HelpCircle,
  ArrowRightLeft,
  FileCode,
  Copy,
  Info,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import TeamLogo from './TeamLogo';
import { simulateMap, MAP_POOL_CS2, MAP_POOL_S2 } from '../lib/simulation';
import { useGameUniverse } from '../lib/gameUniverse';
import { getCanonicalRoomId } from './setka_tourn/storage';
import { safeLocalStorageSet } from '../lib/utils';
import { db, doc, setDoc, updateDoc, collection, addDoc } from '../firebase';
import { getAllAvailableJsonTeams, getT1TeamByName, T1_CURATED_TEAMS, T1TeamPreset } from '../lib/t1TeamsPresets';

interface AttachedMatch {
  id: string;
  mapName: string;
  score: string;
  winner: string;
  playerStats?: {
    kills: number;
    deaths: number;
    kd: number;
    rating: number;
  };
  source: 'history' | 'scrim';
  date: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'viktor';
  text: string;
  timestamp: string;
  verdict?: 'REJECTED' | 'COUNTER_OFFER' | 'NEED_TEST_MATCH' | 'ACCEPTED';
  fairnessScore?: number;
  reasons?: string[];
  counterDemand?: string;
}

const PEPES_SAMPLE_JSON = `{
  "name": "pepes",
  "budget": 1500000,
  "players": [
    { "nickname": "pepes", "role": "sniper", "rating": 126, "valRating": 3950 },
    { "nickname": "keker", "role": "opener", "rating": 115, "valRating": 3400 },
    { "nickname": "clown", "role": "rifler", "rating": 112, "valRating": 3300 },
    { "nickname": "turbo", "role": "support", "rating": 110, "valRating": 3200 },
    { "nickname": "captain", "role": "captain", "rating": 107, "valRating": 3050 }
  ]
}`;

export default function AiNegotiator({ user }: { user: any }) {
  const [game] = useGameUniverse();
  const roomId = useMemo(() => getCanonicalRoomId(user?.channelId || user?.uid, game), [user, game]);

  // Data from database / storage
  const [savedTeams, setSavedTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [historyMatches, setHistoryMatches] = useState<any[]>([]);
  const [tgUsers, setTgUsers] = useState<any[]>([]);

  // Persistent uploaded/custom JSON teams (e.g. Pepes or uploaded rosters)
  const [customJsonTeams, setCustomJsonTeams] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('negotiator_custom_json_teams');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Custom editable budgets (for any team, including JSON like Pepes)
  const [customBudgets, setCustomBudgets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('negotiator_custom_budgets');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Toast notifications (replaces window.alert)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Drag and drop & Guide states
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(true);

  // JSON Upload Modal state
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [jsonModalTab, setJsonModalTab] = useState<'upload' | 'paste' | 'preset'>('upload');
  const [pastedJsonText, setPastedJsonText] = useState<string>('');
  const [modalTargetRole, setModalTargetRole] = useState<'target' | 'buyer'>('target');
  const [jsonError, setJsonError] = useState<string>('');

  // Team source switches ('saved' | 't1_json')
  const [userTeamSource, setUserTeamSource] = useState<'saved' | 't1_json'>('saved');
  const [targetTeamSource, setTargetTeamSource] = useState<'saved' | 't1_json'>('t1_json');

  // Selected team IDs
  const [userTeamId, setUserTeamId] = useState<string>('');
  const [targetTeamId, setTargetTeamId] = useState<string>('t1_navi');

  // Editing budget modal or inline input
  const [editingTargetBudget, setEditingTargetBudget] = useState<boolean>(false);
  const [editingUserBudget, setEditingUserBudget] = useState<boolean>(false);

  // Player selection
  const [requestedPlayerId, setRequestedPlayerId] = useState<string>('');
  const [offeredPlayerId, setOfferedPlayerId] = useState<string>('cash_only');
  const [cashOffer, setCashOffer] = useState<number>(120000);

  // Checkboxes requested by user
  const [tier1Experience, setTier1Experience] = useState<boolean>(true); // "выходил ли на т1 уровень играл ли я жму галочку"
  const [leadershipSkills, setLeadershipSkills] = useState<boolean>(false);
  const [highMediaPresence, setHighMediaPresence] = useState<boolean>(false);
  const [noToxicBehavior, setNoToxicBehavior] = useState<boolean>(true);

  // Match proof states
  const [attachedMatches, setAttachedMatches] = useState<AttachedMatch[]>([]);
  const [showMatchPicker, setShowMatchPicker] = useState<boolean>(false);
  const [isSimulatingScrim, setIsSimulatingScrim] = useState<boolean>(false);

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [latestVerdict, setLatestVerdict] = useState<any>(null);

  // Transfer execution
  const [isSigningContract, setIsSigningContract] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [signedTransferData, setSignedTransferData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // List of all JSON teams available
  const availableJsonTeams = useMemo(() => getAllAvailableJsonTeams(), []);

  // Update a team's budget in state & storage
  const updateTeamBudget = (teamId: string, amount: number) => {
    const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
    setCustomBudgets(prev => {
      const updated = { ...prev, [teamId]: cleanAmount };
      try {
        localStorage.setItem('negotiator_custom_budgets', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Save custom teams list to local storage
  const saveCustomJsonTeams = (teamsList: any[]) => {
    setCustomJsonTeams(teamsList);
    try {
      localStorage.setItem('negotiator_custom_json_teams', JSON.stringify(teamsList));
    } catch (e) {}
  };

  // Load saved teams and players
  useEffect(() => {
    const loadData = () => {
      try {
        const rawTeams = localStorage.getItem(`teams_${roomId}`) || localStorage.getItem(`teams_${user?.uid}`) || '[]';
        const parsedTeams = JSON.parse(rawTeams);
        const validTeams = Array.isArray(parsedTeams) ? parsedTeams.filter((t: any) => t && t.id) : [];
        setSavedTeams(validTeams);

        const rawPlayers = localStorage.getItem(`players_${roomId}`) || localStorage.getItem(`players_${user?.uid}`) || '[]';
        const parsedPlayers = JSON.parse(rawPlayers);
        setPlayers(Array.isArray(parsedPlayers) ? parsedPlayers : []);

        const rawMatches = localStorage.getItem(`matches_${roomId}`) || localStorage.getItem(`matches_${user?.uid}`) || '[]';
        const parsedMatches = JSON.parse(rawMatches);
        setHistoryMatches(Array.isArray(parsedMatches) ? parsedMatches : []);

        const rawTg = localStorage.getItem(`tgUsers_${roomId}`) || localStorage.getItem(`tgUsers_${user?.uid}`) || '[]';
        const parsedTg = JSON.parse(rawTg);
        setTgUsers(Array.isArray(parsedTg) ? parsedTg : []);

        if (validTeams.length > 0 && !userTeamId) {
          setUserTeamId(validTeams[0].id);
        }
      } catch (err) {
        console.error("Failed to load negotiator data:", err);
      }
    };

    loadData();
    window.addEventListener('teams-updated', loadData);
    window.addEventListener('db-user-updated', loadData);
    return () => {
      window.removeEventListener('teams-updated', loadData);
      window.removeEventListener('db-user-updated', loadData);
    };
  }, [roomId, user]);

  // Robust universal JSON parser for custom teams (supports pepes, tournament rosters, single/multiple teams)
  const processAndImportJson = (jsonString: string, roleToAssign: 'target' | 'buyer' = modalTargetRole) => {
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonString.trim());
      let imported: any[] = [];

      if (Array.isArray(parsed)) {
        imported = parsed;
      } else if (parsed && parsed.teams && Array.isArray(parsed.teams)) {
        imported = parsed.teams;
      } else if (parsed && (parsed.teamName || parsed.name || parsed.team_name)) {
        imported = [parsed];
      } else if (parsed && typeof parsed === 'object') {
        // Maybe an object with team keys like { "pepes": { budget: ..., players: [...] } }
        const values = Object.values(parsed);
        if (values.length > 0 && typeof values[0] === 'object' && (values[0] as any)?.players) {
          imported = values;
        } else {
          imported = [parsed];
        }
      }

      if (imported.length === 0) {
        throw new Error('В JSON не найден объект команды или список игроков. Нажмите "Вставить пример (pepes)", чтобы увидеть правильный формат.');
      }

      const formatted = imported.map((t, idx) => {
        const teamName = t.name || t.teamName || t.team_name || 'Custom Team';
        const teamId = t.id || `custom_${teamName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}_${idx}`;
        const rawPlayers = Array.isArray(t.players) ? t.players : Array.isArray(t.roster) ? t.roster : Array.isArray(t.members) ? t.members : [];

        // Parse players
        const players = rawPlayers.length > 0 ? rawPlayers.map((p: any, pIdx: number) => {
          const nick = p.nickname || p.name || p.nick || `${teamName}_P${pIdx + 1}`;
          let rawRating = Number(p.rating || (pIdx === 0 ? 125 : 110));
          // If rating is in HLTV 2.0 format (e.g. 1.26 instead of 126), convert to 100-scale
          if (rawRating > 0 && rawRating <= 3.0) {
            rawRating = Math.round(rawRating * 100);
          }

          let role = (p.role || '').toLowerCase();
          if (role.includes('снайп') || role.includes('awp')) role = 'sniper';
          else if (role.includes('кап') || role.includes('лидер') || role.includes('igl')) role = 'captain';
          else if (role.includes('опен') || role.includes('энтри')) role = 'opener';
          else if (role.includes('сапп') || role.includes('помощ')) role = 'support';
          else if (role.includes('люрк')) role = 'lurker';
          else if (!role) role = pIdx === 0 ? 'sniper' : pIdx === 1 ? 'opener' : 'rifler';

          const valRating = Number(p.valRating || Math.round(rawRating * 30 + 100));

          return {
            id: p.id || `${teamId}_p_${pIdx + 1}`,
            nickname: nick,
            role,
            rating: rawRating,
            valRating
          };
        }) : [
          { id: `${teamId}_p1`, nickname: `${teamName}_star`, role: 'sniper', rating: 125, valRating: 3900 },
          { id: `${teamId}_p2`, nickname: `${teamName}_entry`, role: 'opener', rating: 114, valRating: 3400 },
          { id: `${teamId}_p3`, nickname: `${teamName}_rifler`, role: 'rifler', rating: 112, valRating: 3300 },
          { id: `${teamId}_p4`, nickname: `${teamName}_support`, role: 'support', rating: 110, valRating: 3200 },
          { id: `${teamId}_p5`, nickname: `${teamName}_igl`, role: 'captain', rating: 107, valRating: 3050 }
        ];

        // Flexible budget parsing (budget, balance, money, treasury, kazna)
        const budget = Number(t.budget ?? t.balance ?? t.money ?? t.treasury ?? t.kazna ?? 1200000);

        return {
          id: teamId,
          name: teamName,
          budget,
          isCustomJson: true,
          players
        };
      });

      // Save custom teams
      const combined = [...formatted, ...customJsonTeams.filter(ct => !formatted.some(f => f.id === ct.id))];
      saveCustomJsonTeams(combined);

      // Save budget to customBudgets
      formatted.forEach(f => {
        updateTeamBudget(f.id, f.budget);
      });

      // Apply to selected slot
      const chosenTeam = formatted[0];
      if (roleToAssign === 'target') {
        setTargetTeamSource('t1_json');
        setTargetTeamId(chosenTeam.id);
        // Default requested player to the star player of this team
        if (chosenTeam.players.length > 0) {
          const sorted = [...chosenTeam.players].sort((a, b) => b.rating - a.rating);
          setRequestedPlayerId(sorted[0].id);
        }
      } else {
        setUserTeamSource('t1_json');
        setUserTeamId(chosenTeam.id);
      }

      setShowJsonModal(false);
      setPastedJsonText('');
      showToast(
        `✅ Команда «${chosenTeam.name}» успешно загружена (${chosenTeam.players.length} игроков, казна $${chosenTeam.budget.toLocaleString()}) и выбрана как ${roleToAssign === 'target' ? 'Продавец (Защищаемый клуб)' : 'Покупатель'}!`,
        'success'
      );
    } catch (err: any) {
      setJsonError(err.message || 'Ошибка парсинга JSON');
      showToast(`Ошибка загрузки JSON: ${err.message || 'Неверный формат'}`, 'error');
    }
  };

  // Direct 1-click loading of Pepes team preset
  const handleLoadPepesDirectly = (roleToAssign: 'target' | 'buyer' = 'target') => {
    processAndImportJson(PEPES_SAMPLE_JSON, roleToAssign);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          processAndImportJson(text, modalTargetRole);
        }
      };
      reader.readAsText(file);
    }
  };

  // Handle custom JSON file upload from disk
  const handleUploadCustomJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processAndImportJson(text, modalTargetRole);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Resolve active User Team
  const userTeam = useMemo(() => {
    let base: any = null;
    if (userTeamSource === 'saved') {
      base = savedTeams.find(t => t.id === userTeamId) || savedTeams[0] || null;
    } else {
      const customFound = customJsonTeams.find(t => t.id === userTeamId);
      if (customFound) base = customFound;
      else {
        const t1 = availableJsonTeams.find(t => t.id === userTeamId) || availableJsonTeams[0];
        base = t1 ? getT1TeamByName(t1.name) : null;
      }
    }
    if (!base) return null;
    const effectiveBudget = customBudgets[base.id] !== undefined ? customBudgets[base.id] : (base.budget || 350000);
    return { ...base, budget: effectiveBudget };
  }, [userTeamSource, userTeamId, savedTeams, customJsonTeams, availableJsonTeams, customBudgets]);

  // Resolve active Target Team (Club under protection / Seller)
  const targetTeam = useMemo(() => {
    let base: any = null;
    if (targetTeamSource === 'saved') {
      base = savedTeams.find(t => t.id === targetTeamId) || savedTeams[1] || savedTeams[0] || null;
    } else {
      const customFound = customJsonTeams.find(t => t.id === targetTeamId);
      if (customFound) base = customFound;
      else {
        const t1 = availableJsonTeams.find(t => t.id === targetTeamId) || availableJsonTeams[0];
        base = t1 ? getT1TeamByName(t1.name) : null;
      }
    }
    if (!base) return null;
    const effectiveBudget = customBudgets[base.id] !== undefined ? customBudgets[base.id] : (base.budget || 500000);
    return { ...base, budget: effectiveBudget };
  }, [targetTeamSource, targetTeamId, savedTeams, customJsonTeams, availableJsonTeams, customBudgets]);

  // Available players
  const userPlayers = useMemo(() => {
    if (!userTeam || !Array.isArray(userTeam.players)) return [];
    return userTeam.players.filter((p: any) => p && (p.id || p.nickname));
  }, [userTeam]);

  const targetPlayers = useMemo(() => {
    if (!targetTeam || !Array.isArray(targetTeam.players)) return [];
    return targetTeam.players.filter((p: any) => p && (p.id || p.nickname));
  }, [targetTeam]);

  // Sorted target players to easily detect the franchise star / top player (e.g. Pepes or highest rating)
  const sortedTargetPlayers = useMemo(() => {
    return [...targetPlayers].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
  }, [targetPlayers]);

  const top1TargetPlayer = sortedTargetPlayers[0] || null;
  const top2TargetPlayer = sortedTargetPlayers[1] || null;

  const requestedPlayer = useMemo(() => {
    return targetPlayers.find((p: any) => p.id === requestedPlayerId) || targetPlayers[0] || null;
  }, [targetPlayers, requestedPlayerId]);

  const offeredPlayer = useMemo(() => {
    if (offeredPlayerId === 'cash_only') return null;
    return userPlayers.find((p: any) => p.id === offeredPlayerId) || null;
  }, [userPlayers, offeredPlayerId]);

  // IS REQUESTED PLAYER THE #1 BEST STAR OF THE CLUB? (e.g. Pepes / s1mple / ZywOo)
  const isTargetStarPlayer = useMemo(() => {
    if (!requestedPlayer || !top1TargetPlayer) return false;
    const isTopId = requestedPlayer.id === top1TargetPlayer.id;
    const isTopNick = requestedPlayer.nickname.toLowerCase() === top1TargetPlayer.nickname.toLowerCase();
    const isTopRating = Number(requestedPlayer.rating || 0) >= Number(top1TargetPlayer.rating || 0) - 0.5;
    return isTopId || isTopNick || isTopRating;
  }, [requestedPlayer, top1TargetPlayer]);

  const starRatingLead = useMemo(() => {
    if (!isTargetStarPlayer || !top2TargetPlayer) return 0;
    return Math.max(0, (Number(requestedPlayer?.rating || 0) - Number(top2TargetPlayer?.rating || 0)));
  }, [isTargetStarPlayer, requestedPlayer, top2TargetPlayer]);

  // Target team leader status
  const targetTeamHasLeader = useMemo(() => {
    if (!targetTeam) return false;
    if (targetTeam.isT1Preset) return true;
    const hasTgManager = tgUsers.some((u: any) => u.assignedTeamId === targetTeam.id || u.teamId === targetTeam.id);
    const hasIgl = (targetTeam.players || []).some((p: any) => (p.role || '').toLowerCase().includes('captain') || (p.role || '').toLowerCase().includes('igl'));
    return hasTgManager || hasIgl;
  }, [targetTeam, tgUsers]);

  // Set default requested player when target team changes
  useEffect(() => {
    if (targetPlayers.length > 0 && (!requestedPlayerId || !targetPlayers.some((p: any) => p.id === requestedPlayerId))) {
      const sorted = [...targetPlayers].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
      setRequestedPlayerId(sorted[0].id);
    }
  }, [targetPlayers, requestedPlayerId]);

  // Reset chat welcome when target team changes
  useEffect(() => {
    if (targetTeam) {
      const budgetText = `$${Number(targetTeam.budget || 500000).toLocaleString()}`;
      const isRich = (targetTeam.budget || 0) >= 1000000;
      
      const leaderStatusText = !targetTeamHasLeader 
        ? "⚠️ ВНИМАНИЕ: У команды нет активного лидера/менеджера. Включен протокол защиты ростера ИИ. Никаких халявных трансферов здесь не будет!"
        : isRich
        ? `🏛️ В казне нашего клуба ${budgetText}! Запомните главное правило: чем богаче клуб, тем больше денег мы требуем. Мелочь нам не интересна.`
        : `🏛️ Казна клуба составляет ${budgetText}. Я лично утверждаю каждую сделку.`;

      setChatMessages([
        {
          id: 'welcome_' + targetTeam.id,
          sender: 'viktor',
          text: `Приветствую. Я Виктор «V1KTOR» Громов — спортивный директор клуба «${targetTeam.name}». ${leaderStatusText} Кого хотите забрать и сколько готовы положить на стол переговоров?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          verdict: 'NEED_TEST_MATCH',
          fairnessScore: 35
        }
      ]);
    }
  }, [targetTeam?.id]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  // Deep Greed, Wealth, 90-110 Rating Scale Sensitivity & Star Player Mechanics
  const currentDealMetrics = useMemo(() => {
    const reqRating = Number(requestedPlayer?.rating || 100);
    const offRating = offeredPlayer ? Number(offeredPlayer.rating || 90) : 0;
    
    // Skill gap: in 90-110 scale, even +1 or +2 is monumental!
    const skillGap = offeredPlayer ? (reqRating - offRating) : reqRating;

    // Target Team Wealth Greed Multiplier
    const targetBudget = Number(targetTeam?.budget || 500000);
    const userBudget = Number(userTeam?.budget || 300000);

    // Multipliers for wealth and greed:
    const wealthGreedMultiplier = 1.0 + Math.max(0, (targetBudget - 100000) / 1400000);
    const leaderlessPenaltyMultiplier = !targetTeamHasLeader ? 1.4 : 1.0;
    
    // STAR PLAYER PENALTY: If user is taking the best player (e.g. Pepes), шансы уходят!
    const starMultiplier = isTargetStarPlayer ? 2.3 : 1.0;
    const starPenaltyCash = isTargetStarPlayer ? (140000 + Math.round(starRatingLead * 12000)) : 0;

    // Role penalties: taking sniper or captain leaves tactical vacuum
    const reqRole = (requestedPlayer?.role || '').toLowerCase();
    const offRole = (offeredPlayer?.role || '').toLowerCase();
    let rolePenaltyCash = 0;
    let rolePenaltyScore = 0;
    if (reqRole.includes('sniper') || reqRole.includes('awp')) {
      if (!offRole.includes('sniper') && !offRole.includes('awp')) {
        rolePenaltyCash += 50000;
        rolePenaltyScore += 14;
      }
    }
    if (reqRole.includes('captain') || reqRole.includes('igl')) {
      if (!offRole.includes('captain') && !offRole.includes('igl')) {
        rolePenaltyCash += 45000;
        rolePenaltyScore += 12;
      }
    }

    // Required cash calculation in 90-110 scale:
    // Even +1 rating gap demands $55,000+, +2 rating gap demands $130,000+!
    let requiredCashWithPlayer = 0;
    if (offeredPlayer) {
      if (skillGap > 0) {
        const ratingLossCash = Math.round(Math.pow(skillGap, 1.35) * 55000 + 40000);
        requiredCashWithPlayer = Math.round((ratingLossCash + starPenaltyCash + rolePenaltyCash) * leaderlessPenaltyMultiplier * wealthGreedMultiplier);
      } else if (skillGap === 0) {
        // Equal rating: synergy disruption fee
        requiredCashWithPlayer = Math.round((45000 + starPenaltyCash + rolePenaltyCash) * leaderlessPenaltyMultiplier * wealthGreedMultiplier);
      } else {
        // Offered player is better: only role/star fee
        requiredCashWithPlayer = Math.round((Math.max(15000, starPenaltyCash + rolePenaltyCash - Math.abs(skillGap) * 15000)) * wealthGreedMultiplier);
      }
    }

    // Cash-only buyout (leaving roster with 4 players!)
    const requiredCashWithoutPlayer = Math.round((350000 + Math.max(0, reqRating - 90) * 16000 + starPenaltyCash + rolePenaltyCash) * leaderlessPenaltyMultiplier * wealthGreedMultiplier * starMultiplier);

    const targetFairCash = offeredPlayer ? requiredCashWithPlayer : requiredCashWithoutPlayer;

    // Bonus points for user evidence
    let bonusScore = 0;
    if (tier1Experience) bonusScore += 12;
    if (leadershipSkills) bonusScore += 5;
    if (highMediaPresence) bonusScore += 4;
    if (noToxicBehavior) bonusScore += 3;

    // Attached matches analysis
    if (attachedMatches.length > 0) {
      let totalKd = 0;
      attachedMatches.forEach(m => {
        if (m.playerStats) totalKd += m.playerStats.kd;
      });
      const avgKd = totalKd / attachedMatches.length;
      if (avgKd >= 1.25) bonusScore += 16;
      else if (avgKd >= 1.0) bonusScore += 8;
      else if (avgKd < 0.8) bonusScore -= 22;
    } else {
      // Lack of matches penalty when taking superior player
      if (skillGap > 0) bonusScore -= 10;
    }

    // STAR PLAYER CHANCE DROP: taking franchise star drops chance heavily!
    let starChanceDrop = isTargetStarPlayer ? -30 : 0;

    // Wealth lowball penalty
    let wealthLowballPenalty = 0;
    if (targetBudget >= 1000000 && cashOffer < 90000) {
      wealthLowballPenalty = -26;
    } else if (targetBudget >= 500000 && cashOffer < 45000) {
      wealthLowballPenalty = -16;
    }

    // Cash ratio contribution to fairness score
    const cashRatio = targetFairCash > 0 ? (cashOffer / targetFairCash) : 1;
    let score = Math.round(Math.min(50, cashRatio * 45) + bonusScore + starChanceDrop + wealthLowballPenalty - rolePenaltyScore);

    // CRITICAL 90-110 RATING SCALE PENALTIES:
    // Even +1 or +2 difference represents huge combat gap!
    if (offeredPlayer) {
      if (skillGap === 1) {
        score -= 18;
      } else if (skillGap === 2) {
        score -= 32;
      } else if (skillGap === 3) {
        score -= 46;
      } else if (skillGap >= 4) {
        score -= 60;
      } else if (skillGap < 0) {
        score += Math.min(22, Math.abs(skillGap) * 7);
      }
      if (!tier1Experience) score -= 12; // Unverified on T1
    } else {
      // Cash only: massive roster penalty
      score -= 35;
      if (!targetTeamHasLeader) score -= 18;
      if (isTargetStarPlayer) score -= 18;
      if (targetBudget >= 1000000) score -= 14;
    }

    const finalFairnessScore = Math.max(5, Math.min(98, score));

    // STRICT VERDICT THRESHOLDS:
    // Teams do NOT give away good players easily!
    let estimatedVerdict: 'REJECTED' | 'COUNTER_OFFER' | 'NEED_TEST_MATCH' | 'ACCEPTED' = 'REJECTED';
    const isWellFunded = cashOffer >= targetFairCash * 0.85;
    
    if (finalFairnessScore >= 78 && (isWellFunded || skillGap < 0)) {
      estimatedVerdict = 'ACCEPTED';
    } else if (finalFairnessScore >= 45) {
      estimatedVerdict = 'COUNTER_OFFER';
    } else if (attachedMatches.length === 0 && finalFairnessScore >= 28) {
      estimatedVerdict = 'NEED_TEST_MATCH';
    } else {
      estimatedVerdict = 'REJECTED';
    }

    return {
      reqRating,
      offRating,
      skillGap,
      isTargetStarPlayer,
      starRatingLead,
      targetBudget,
      userBudget,
      wealthGreedMultiplier,
      targetFairCash,
      finalFairnessScore,
      estimatedVerdict,
      leaderlessPenaltyMultiplier
    };
  }, [
    requestedPlayer, 
    offeredPlayer, 
    targetPlayers, 
    cashOffer, 
    targetTeam,
    userTeam,
    targetTeamHasLeader, 
    isTargetStarPlayer,
    starRatingLead,
    tier1Experience, 
    leadershipSkills, 
    highMediaPresence, 
    noToxicBehavior, 
    attachedMatches
  ]);

  // Execute quick simulation scrim between the two teams
  const handleRunScrim = () => {
    if (!userTeam || !targetTeam) return;
    setIsSimulatingScrim(true);

    setTimeout(() => {
      try {
        const pool = game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2;
        const randomMap = pool[Math.floor(Math.random() * pool.length)].name;

        // Ensure rosters have 5 players
        const team1Lineup = (userTeam.players || []).slice(0, 5);
        const team2Lineup = (targetTeam.players || []).slice(0, 5);

        const result = simulateMap(
          team1Lineup,
          team2Lineup,
          userTeam.synergy || 95,
          targetTeam.synergy || 95,
          'Стандарт',
          'Стандарт',
          randomMap,
          'bo1',
          game === 'cs2'
        );

        let pStats = { kills: 16, deaths: 12, kd: 1.33, rating: 1.15 };
        if (offeredPlayer) {
          const found = result.team1Stats.find((s: any) => s.id === offeredPlayer.id || s.nickname === offeredPlayer.nickname);
          if (found) {
            const kd = found.deaths > 0 ? Number((found.kills / found.deaths).toFixed(2)) : found.kills;
            pStats = {
              kills: found.kills,
              deaths: found.deaths,
              kd,
              rating: Number(found.rating || 1.10)
            };
          }
        }

        const team1Score = (result as any).team1Score ?? (result as any).score1 ?? 13;
        const team2Score = (result as any).team2Score ?? (result as any).score2 ?? 10;

        const newScrim: AttachedMatch = {
          id: 'scrim_' + Date.now(),
          mapName: randomMap,
          score: `${team1Score}:${team2Score}`,
          winner: result.winner === 1 ? userTeam.name : targetTeam.name,
          playerStats: pStats,
          source: 'scrim',
          date: 'Только что (Тестовый спарринг)'
        };

        setAttachedMatches(prev => [newScrim, ...prev]);

        const scrimMsg: ChatMessage = {
          id: 'scrim_msg_' + Date.now(),
          sender: 'user',
          text: `Мы только что провели тестовый спарринг на карте ${randomMap}! Счет: ${team1Score}:${team2Score}. ${offeredPlayer ? `Статистика ${offeredPlayer.nickname}: ${pStats.kills} киллов, KD ${pStats.kd}.` : ''} Посмотри на цифры!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, scrimMsg]);

        handleSendOffer(`Мы только что сыграли спарринг на ${randomMap}. Игрок показал K/D ${pStats.kd}!`);
      } catch (err) {
        console.error("Scrim simulation failed:", err);
      } finally {
        setIsSimulatingScrim(false);
      }
    }, 600);
  };

  // Attach an existing match from room history
  const handleAttachHistoryMatch = (match: any) => {
    if (!match) return;
    const mapName = match.maps?.[0]?.mapName || match.map || 'Mirage';
    const score = match.score || (match.maps?.[0] ? `${match.maps[0].score1}:${match.maps[0].score2}` : '13:10');
    
    let pStats = { kills: 17, deaths: 13, kd: 1.31, rating: 1.14 };
    if (offeredPlayer && match.maps?.[0]?.team1Stats) {
      const found = match.maps[0].team1Stats.find((s: any) => s.nickname === offeredPlayer.nickname || s.id === offeredPlayer.id);
      if (found) {
        const kd = found.deaths > 0 ? Number((found.kills / found.deaths).toFixed(2)) : found.kills;
        pStats = { kills: found.kills, deaths: found.deaths, kd, rating: Number(found.rating || 1.10) };
      }
    }

    const newMatch: AttachedMatch = {
      id: 'hist_' + (match.id || Math.random()),
      mapName,
      score,
      winner: match.winner || (match.team1Score > match.team2Score ? match.team1 : match.team2) || 'Победа',
      playerStats: pStats,
      source: 'history',
      date: match.date || 'Официальный матч'
    };

    setAttachedMatches(prev => [newMatch, ...prev.filter(m => m.id !== newMatch.id)]);
    setShowMatchPicker(false);
  };

  // Send negotiation proposal / message to Viktor
  const handleSendOffer = async (customUserText?: string) => {
    if (!userTeam || !targetTeam || !requestedPlayer) return;
    
    const userText = customUserText || inputMessage.trim() || 
      `Предлагаем трансфер: ${offeredPlayer ? `обмен ${offeredPlayer.nickname} на ${requestedPlayer.nickname}` : `выкуп ${requestedPlayer.nickname}`} с доплатой $${cashOffer.toLocaleString()}. Т1 опыт: ${tier1Experience ? 'Да' : 'Нет'}. Рассмотрите наш оффер.`;

    if (!customUserText) setInputMessage('');

    const userChatMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userChatMessage]);
    setIsThinking(true);

    const payload = {
      userTeam: userTeam.name,
      targetTeam: targetTeam.name,
      userBudget: userTeam.budget || 300000,
      targetBudget: targetTeam.budget || 500000,
      requestedPlayer: {
        id: requestedPlayer.id,
        nickname: requestedPlayer.nickname,
        role: requestedPlayer.role,
        rating: requestedPlayer.rating,
        isStarPlayer: isTargetStarPlayer
      },
      offeredPlayer: offeredPlayer ? {
        id: offeredPlayer.id,
        nickname: offeredPlayer.nickname,
        role: offeredPlayer.role,
        rating: offeredPlayer.rating,
        tier1Experience
      } : {
        nickname: 'Без игрока (Чистый выкуп)',
        role: 'None',
        rating: 0,
        tier1Experience: false
      },
      cashOffer,
      sampleMatches: attachedMatches.map(m => ({
        map: m.mapName,
        score: m.score,
        playerKd: m.playerStats?.kd,
        playerKills: m.playerStats?.kills,
        source: m.source
      })),
      userMessage: userText,
      chatHistory: chatMessages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text
      }))
    };

    try {
      const res = await fetch('/api/gemini/transfer-negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('API server error');
      const data = await res.json();
      
      const viktorMsg: ChatMessage = {
        id: 'viktor_' + Date.now(),
        sender: 'viktor',
        text: data.speech || 'Предложение рассмотрено.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verdict: data.verdict,
        fairnessScore: data.fairnessScore,
        reasons: data.reasons || [],
        counterDemand: data.counterDemand
      };

      setChatMessages(prev => [...prev, viktorMsg]);
      setLatestVerdict(data);
    } catch (apiError) {
      console.warn("Using offline smart evaluator for negotiation:", apiError);
      
      const metrics = currentDealMetrics;
      let speech = '';
      let reasons: string[] = [];
      let counterDemand = '';

      const tBudget = metrics.targetBudget;
      const isRich = tBudget >= 1000000;

      if (metrics.estimatedVerdict === 'ACCEPTED') {
        speech = `Так, бумаги я изучил. Условия действительно солидные. $${cashOffer.toLocaleString()} на баланс клуба (в нашей казне теперь будет $${(tBudget + cashOffer).toLocaleString()}) плюс ${offeredPlayer ? `${offeredPlayer.nickname} на замену` : 'полный байаут'} нас устраивают. Я даю добро на трансфер!`;
        reasons = [
          isTargetStarPlayer ? 'Компенсация полностью покрывает потерю лучшего игрока' : 'Условия соответствуют классу игрока',
          tier1Experience ? 'Подтвержден опыт на Tier-1 LAN турнирах' : 'Финансовые условия полностью компенсируют риски',
          `Выгодная компенсация в $${cashOffer.toLocaleString()}`,
          `Казна клуба «${targetTeam.name}» ($${tBudget.toLocaleString()}) удовлетворена`
        ];
        counterDemand = 'Сделка одобрена! Нажмите «Подписать контракт», чтобы закрыть трансфер.';
      } else if (metrics.estimatedVerdict === 'COUNTER_OFFER') {
        speech = isTargetStarPlayer
          ? `Вы хотите забрать ${requestedPlayer.nickname} — лучшего игрока и звезду нашего клуба?! В диапазоне 90–110 каждый пункт решает исходы мейджоров! Без него наш состав просто развалится! Шансы на такую сделку минимальны, если вы не поднимете выкуп минимум до $${metrics.targetFairCash.toLocaleString()}!`
          : metrics.skillGap > 0
          ? `У нас в симуляторе рейтинг игроков 90–110, и даже разница в +${metrics.skillGap.toFixed(1)} пункта решает исходы клатчей! Вы предлагаете ухудшить наш ростер за скромные $${cashOffer.toLocaleString()}? Для клуба с казной $${tBudget.toLocaleString()} это неприемлемо.`
          : isRich
          ? `У нас в казне $${tBudget.toLocaleString()}, мы один из богатейших клубов мира! Зачем нам отдавать игрока за скромные $${cashOffer.toLocaleString()}? Чем больше у клуба денег — тем выше наши запросы!`
          : `Слушай сюда. ${requestedPlayer.nickname} — это лицо клуба! Разница в скилле ощутимая, а доплата слабовата для нашего статуса ($${tBudget.toLocaleString()}).`;
        
        reasons = [
          isTargetStarPlayer ? `⭐ КЛЮЧЕВАЯ ЗВЕЗДА: ${requestedPlayer.nickname} — лучший игрок команды (Рейтинг: ${requestedPlayer.rating})` : `Дефицит рейтинга: ${metrics.skillGap > 0 ? `-${metrics.skillGap.toFixed(1)}` : '0'} пунктов (в диапазоне 90-110 это критично)`,
          `Жадность клуба: казна $${tBudget.toLocaleString()} (Коэффициент отступных: x${metrics.wealthGreedMultiplier.toFixed(2)})`,
          !tier1Experience ? 'Нет подтвержденного Т1 опыта' : 'Т1 опыт учтен, но богатый клуб требует больше кэша'
        ];
        counterDemand = `Либо поднимайте доплату минимум до $${metrics.targetFairCash.toLocaleString()}, либо прикрепите победный скрим с K/D выше 1.30!`;
      } else if (metrics.estimatedVerdict === 'NEED_TEST_MATCH') {
        speech = `На словах вы все Тир-1 гранды, а на сервере в первом же раунде поплывете. Прикрепите матчи или сыграйте спарринг прямо сейчас, чтобы я увидел ${offeredPlayer ? offeredPlayer.nickname : 'вашу стрельбу'} в реальном деле!`;
        reasons = [
          'Отсутствуют свежие данные по матчам и форме игрока',
          'Клуб не может рисковать слотом в турнире вслепую'
        ];
        counterDemand = 'Нажмите кнопку «Сыграть тестовый спарринг (Bo1)» прямо в конструкторе.';
      } else {
        speech = isTargetStarPlayer
          ? `Вы в своем уме?! ${requestedPlayer.nickname} — это наш топ-1 игрок! Отдать главную звезду за ваши смешные $${cashOffer.toLocaleString()}?! Ни один директор в здравом уме не пойдет на это. Шанс сделки нулевой!`
          : metrics.skillGap > 0
          ? `Ты это серьезно?! В нашем симуляторе разница даже в +1 или +2 рейта — это пропасть в огневой мощи! Вы пытаетесь забрать ${requestedPlayer.nickname} (рейтинг ${requestedPlayer.rating}), взамен суете игрока слабее и думаете, что пара монет покроет ослабление состава?! Ответ: ЖЕСТКИЙ ОТКАЗ.`
          : isRich
          ? `В казне «${targetTeam.name}» лежит $${tBudget.toLocaleString()}! Вы предлагаете нам $${cashOffer.toLocaleString()} за игрока основы?! Мы на питание состава больше тратим. Полный отказ!`
          : `Ты это серьезно?! Вы предлагаете лоуболл и думаете, что можно обчистить наш ростер за копейки?! Ответ категорический: ОТКАЗ.`;
        
        reasons = [
          isTargetStarPlayer ? 'Попытка забрать неприкосновенную звезду клуба без адекватного выкупа' : 'Попытка занижения цены',
          `Богатый Т1 клуб не продает игроков дешевле $${metrics.targetFairCash.toLocaleString()}`,
          !tier1Experience ? 'Предлагаемый игрок — новичок без опыта Т1' : `Разрыв в рейтинге: -${metrics.skillGap.toFixed(1)} пунктов (в шкале 90-110 недопустимо)`
        ];
        counterDemand = `Увеличьте предложение минимум до $${metrics.targetFairCash.toLocaleString()} или предложите игрока с рейтингом не ниже ${metrics.reqRating}!`;
      }

      const viktorMsg: ChatMessage = {
        id: 'viktor_' + Date.now(),
        sender: 'viktor',
        text: speech,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verdict: metrics.estimatedVerdict,
        fairnessScore: metrics.finalFairnessScore,
        reasons,
        counterDemand
      };

      setChatMessages(prev => [...prev, viktorMsg]);
      setLatestVerdict({
        verdict: metrics.estimatedVerdict,
        fairnessScore: metrics.finalFairnessScore,
        speech,
        reasons,
        counterDemand
      });
    } finally {
      setIsThinking(false);
    }
  };

  // Execute official signed transfer into local storage and database
  const handleExecuteTransfer = async () => {
    if (!userTeam || !targetTeam || !requestedPlayer) return;
    setIsSigningContract(true);

    try {
      const updatedUserPlayers = [...userTeam.players];
      const updatedTargetPlayers = [...targetTeam.players];

      const reqIdx = updatedTargetPlayers.findIndex((p: any) => p.id === requestedPlayer.id);
      if (reqIdx === -1) throw new Error('Игрок не найден в целевой команде');

      if (offeredPlayer) {
        const offIdx = updatedUserPlayers.findIndex((p: any) => p.id === offeredPlayer.id);
        if (offIdx === -1) throw new Error('Предлагаемый игрок не найден в вашей команде');

        updatedUserPlayers[offIdx] = { ...requestedPlayer, teamId: userTeam.id };
        updatedTargetPlayers[reqIdx] = { ...offeredPlayer, teamId: targetTeam.id };
      } else {
        updatedTargetPlayers.splice(reqIdx, 1);
        updatedUserPlayers.push({ ...requestedPlayer, teamId: userTeam.id });
      }

      const updatedTeams = savedTeams.map((t: any) => {
        if (t.id === userTeam.id) {
          return {
            ...t,
            players: updatedUserPlayers,
            budget: Math.max(0, (t.budget || 200000) - cashOffer)
          };
        }
        if (t.id === targetTeam.id) {
          return {
            ...t,
            players: updatedTargetPlayers,
            budget: (t.budget || 50000) + cashOffer
          };
        }
        return t;
      });

      safeLocalStorageSet(`teams_${roomId}`, updatedTeams);
      safeLocalStorageSet(`teams_${user.uid}`, updatedTeams);
      setSavedTeams(updatedTeams);

      // Record News post
      const newsItem = {
        id: 'news_' + Date.now(),
        title: `🔥 ГРОМКИЙ ТРАНСФЕР: ${requestedPlayer.nickname} переходит в ${userTeam.name}!`,
        content: `Трансферный отдел клуба «${targetTeam.name}» (Казна: $${(targetTeam.budget || 0).toLocaleString()}) под контролем ИИ-директора Виктора Громова официально закрыл сделку по переходу ${requestedPlayer.nickname} в состав «${userTeam.name}». ${offeredPlayer ? `В обратном направлении проследовал ${offeredPlayer.nickname}.` : ''} Сумма компенсации составила $${cashOffer.toLocaleString()}.`,
        date: new Date().toLocaleDateString('ru-RU'),
        category: 'Трансферы',
        author: 'V1KTOR Transfer AI',
        verified: true
      };

      try {
        const currentNews = JSON.parse(localStorage.getItem(`news_${roomId}`) || localStorage.getItem(`news_${user.uid}`) || '[]');
        const updatedNews = [newsItem, ...(Array.isArray(currentNews) ? currentNews : [])];
        safeLocalStorageSet(`news_${roomId}`, updatedNews);
        safeLocalStorageSet(`news_${user.uid}`, updatedNews);
      } catch (e) {}

      window.dispatchEvent(new Event('teams-updated'));
      window.dispatchEvent(new Event('db-user-updated'));

      setSignedTransferData({
        requestedPlayer,
        offeredPlayer,
        userTeam,
        targetTeam,
        cashOffer
      });

      setShowSuccessModal(true);
    } catch (err: any) {
      showToast(`Ошибка оформления трансфера: ${err.message}`, 'error');
    } finally {
      setIsSigningContract(false);
    }
  };

  const isApproved = latestVerdict?.verdict === 'ACCEPTED' || (latestVerdict?.fairnessScore && latestVerdict.fairnessScore >= 70);

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col gap-5 max-w-7xl mx-auto pb-16 relative"
    >
      
      {/* Full-screen Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-blue-950/85 border-4 border-dashed border-blue-400 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <Upload className="w-16 h-16 text-blue-400 animate-bounce mb-3" />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            Отпустите файл .json здесь
          </h2>
          <p className="text-sm text-blue-200 mt-1">
            Команда сразу загрузится в Нейросеть (в слот {modalTargetRole === 'target' ? 'Продавца' : 'Покупателя'})
          </p>
        </div>
      )}

      {/* Floating In-App Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-md animate-fade-in shadow-2xl">
          <div className={`p-4 rounded-2xl border flex items-start gap-3 backdrop-blur-md ${
            toast.type === 'error' 
              ? 'bg-red-950/90 border-red-500/50 text-red-200 shadow-red-900/30' 
              : toast.type === 'info'
              ? 'bg-blue-950/90 border-blue-500/50 text-blue-200 shadow-blue-900/30'
              : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-900/30'
          }`}>
            <div className="mt-0.5 shrink-0">
              {toast.type === 'error' ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : toast.type === 'info' ? (
                <Info className="w-5 h-5 text-blue-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div className="text-xs font-bold leading-relaxed flex-1">
              {toast.text}
            </div>
            <button 
              type="button" 
              onClick={() => setToast(null)}
              className="text-white/40 hover:text-white shrink-0 ml-1 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input for background file upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadCustomJson}
        accept=".json"
        className="hidden"
      />

      {/* Top Header with Clear Indicators & JSON Upload Button */}
      <div className="rounded-2xl bg-[#0e0e16] border border-white/10 p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-black uppercase text-white tracking-wide">
                ИИ-Переговоры: Жёсткий Отказчик
              </h1>
              <span className="bg-purple-500/20 text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-500/30 uppercase">
                V1KTOR AI
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Защищает клубы от дешевых трансферов. Учитывает казну клубов и статус звезд команды.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Star status */}
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
            isTargetStarPlayer 
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse' 
              : 'bg-white/5 border-white/10 text-white/60'
          }`}>
            <Star className={`w-3.5 h-3.5 ${isTargetStarPlayer ? 'text-amber-400 fill-amber-400' : 'text-white/40'}`} />
            {isTargetStarPlayer ? '⭐ Звезда клуба (Шансы снижены!)' : 'Обычный трансфер'}
          </div>

          {/* Greed factor */}
          <div className="px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            Жадность: x{currentDealMetrics.wealthGreedMultiplier.toFixed(2)}
          </div>

          {/* PROMINENT UPLOAD JSON BUTTON */}
          <button
            type="button"
            onClick={() => {
              setJsonModalTab('upload');
              setShowJsonModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Загрузить свой JSON
          </button>
        </div>
      </div>

      {/* Visual Guide & Quick Pepes / JSON Loader Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-amber-950/30 border border-white/10 p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase text-white tracking-wider">
              Как загрузить свой JSON в Нейросеть (включая команду pepes)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpGuide(!showHelpGuide)}
            className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
          >
            {showHelpGuide ? 'Скрыть подсказку' : 'Показать инструкцию'}
            {showHelpGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showHelpGuide && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs text-white/70">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1.5">
              <span className="text-blue-400 font-bold text-[11px] uppercase flex items-center gap-1">
                1. Загрузите файл или текст
              </span>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Нажмите <strong>«Загрузить свой JSON»</strong>, перетащите файл с ПК мышкой (Drag & Drop) или вставьте текст команды.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1.5">
              <span className="text-purple-400 font-bold text-[11px] uppercase flex items-center gap-1">
                2. Продавец или Покупатель
              </span>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Укажите, кем будет команда: <strong>Продавцом</strong> (клуб с ИИ Виктором, который защищает игроков) или <strong>Покупателем</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1.5">
              <span className="text-amber-400 font-bold text-[11px] uppercase flex items-center gap-1">
                3. Казна и Звезды клуба
              </span>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Команда сразу появится в списке. Казну ($) и лучшего игрока-звезду (например, pepes) можно редактировать на лету!
              </p>
            </div>
          </div>
        )}

        {/* Quick Action Buttons Bar */}
        <div className="flex items-center gap-2.5 flex-wrap pt-1">
          <button
            type="button"
            onClick={() => handleLoadPepesDirectly('target')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Загрузить готовую команду pepes с казной $1.5M и лучшим игроком pepes (126 rating)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            ⚡ Загрузить «pepes» в 1 клик (как Продавца)
          </button>

          <button
            type="button"
            onClick={() => handleLoadPepesDirectly('buyer')}
            className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            Загрузить «pepes» как Покупателя
          </button>

          <button
            type="button"
            onClick={() => {
              setModalTargetRole('target');
              setJsonModalTab('upload');
              setShowJsonModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            Выбрать .json файл с диска
          </button>

          <button
            type="button"
            onClick={() => {
              setModalTargetRole('target');
              setJsonModalTab('paste');
              setPastedJsonText(PEPES_SAMPLE_JSON);
              setShowJsonModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            Посмотреть/вставить текст JSON
          </button>
        </div>
      </div>

      {/* Main 2-Column Clean Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Deal Parameters (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          {/* STEP 1: TEAMS & BUDGETS (Editable on the fly!) */}
          <div className="bg-[#11111a] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> 1. Команды и Казна клубов
              </span>
              <button
                type="button"
                onClick={() => {
                  setModalTargetRole('target');
                  setShowJsonModal(true);
                }}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Добавить команду из JSON
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Buyer Club Card */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-white/50 tracking-wider">Покупатель</span>
                  <div className="flex rounded-md bg-black/60 p-0.5 border border-white/10 text-[9px] font-bold">
                    <button
                      type="button"
                      onClick={() => setUserTeamSource('saved')}
                      className={`px-1.5 py-0.5 rounded ${userTeamSource === 'saved' ? 'bg-blue-600 text-white' : 'text-white/40'}`}
                    >
                      Мои
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserTeamSource('t1_json')}
                      className={`px-1.5 py-0.5 rounded ${userTeamSource === 't1_json' ? 'bg-purple-600 text-white' : 'text-white/40'}`}
                    >
                      JSON Т1
                    </button>
                  </div>
                </div>

                <select
                  value={userTeamId}
                  onChange={e => setUserTeamId(e.target.value)}
                  className="w-full bg-black/80 border border-white/15 rounded-lg px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                >
                  {userTeamSource === 'saved' ? (
                    savedTeams.map(t => (
                      <option key={`buyer_saved_${t.id}`} value={t.id} disabled={t.id === targetTeam?.id}>
                        {t.name}
                      </option>
                    ))
                  ) : (
                    <>
                      {customJsonTeams.length > 0 && (
                        <optgroup label="📥 Ваши загруженные JSON команды">
                          {customJsonTeams.map(t => (
                            <option key={`buyer_custom_${t.id}`} value={t.id}>
                              {t.name} (Загружена)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="⭐ Топ Т1 команды">
                        {T1_CURATED_TEAMS.map(t => (
                          <option key={`buyer_curated_${t.id}`} value={t.id} disabled={t.id === targetTeam?.id}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🌍 Все команды JSON">
                        {availableJsonTeams.filter(t => !t.isCurated).map((t, idx) => (
                          <option key={`buyer_json_${t.id}`} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </select>

                {/* Editable Buyer Budget */}
                <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/50">Бюджет покупателя:</span>
                    <button
                      type="button"
                      onClick={() => setEditingUserBudget(!editingUserBudget)}
                      className="text-blue-400 font-mono font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      $ {Number(userTeam?.budget || 0).toLocaleString()} <Edit3 className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {editingUserBudget && (
                    <div className="flex items-center gap-1.5 animate-fade-in">
                      <input
                        type="number"
                        step="50000"
                        value={userTeam?.budget || 0}
                        onChange={e => userTeam && updateTeamBudget(userTeam.id, Number(e.target.value))}
                        className="w-full bg-black/90 border border-blue-500/50 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold"
                        placeholder="Сумма казны"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingUserBudget(false)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct Upload into Buyer Slot */}
                <button
                  type="button"
                  onClick={() => {
                    setModalTargetRole('buyer');
                    setJsonModalTab('upload');
                    setShowJsonModal(true);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-[10px] font-bold text-blue-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-blue-400" /> Загрузить свой JSON в слот покупателя
                </button>
              </div>

              {/* Target (Seller) Club Card */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/30 flex flex-col gap-2.5 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Продавец (ИИ)
                  </span>
                  <div className="flex rounded-md bg-black/60 p-0.5 border border-white/10 text-[9px] font-bold">
                    <button
                      type="button"
                      onClick={() => setTargetTeamSource('saved')}
                      className={`px-1.5 py-0.5 rounded ${targetTeamSource === 'saved' ? 'bg-amber-600 text-white' : 'text-white/40'}`}
                    >
                      Мои
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetTeamSource('t1_json')}
                      className={`px-1.5 py-0.5 rounded ${targetTeamSource === 't1_json' ? 'bg-purple-600 text-white' : 'text-white/40'}`}
                    >
                      JSON Т1
                    </button>
                  </div>
                </div>

                <select
                  value={targetTeamId}
                  onChange={e => setTargetTeamId(e.target.value)}
                  className="w-full bg-black/80 border border-amber-500/40 rounded-lg px-2.5 py-2 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400"
                >
                  {targetTeamSource === 'saved' ? (
                    savedTeams.map(t => (
                      <option key={`target_saved_${t.id}`} value={t.id} disabled={t.id === userTeam?.id}>
                        {t.name}
                      </option>
                    ))
                  ) : (
                    <>
                      {customJsonTeams.length > 0 && (
                        <optgroup label="📥 Ваши загруженные JSON команды (pepes)">
                          {customJsonTeams.map(t => (
                            <option key={`target_custom_${t.id}`} value={t.id}>
                              {t.name} (Загружена)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="⭐ Топ Т1 команды">
                        {T1_CURATED_TEAMS.map(t => (
                          <option key={`target_curated_${t.id}`} value={t.id} disabled={t.id === userTeam?.id}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🌍 Все команды JSON">
                        {availableJsonTeams.filter(t => !t.isCurated).map((t, idx) => (
                          <option key={`target_json_${t.id}`} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    </>
                  )}
                </select>

                {/* Editable Target Budget */}
                <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/50">Казна продавца:</span>
                    <button
                      type="button"
                      onClick={() => setEditingTargetBudget(!editingTargetBudget)}
                      className="text-yellow-400 font-mono font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      title="Нажмите, чтобы изменить деньги клуба pepes или любого другого"
                    >
                      $ {Number(targetTeam?.budget || 0).toLocaleString()} <Edit3 className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {editingTargetBudget ? (
                    <div className="flex items-center gap-1.5 animate-fade-in">
                      <input
                        type="number"
                        step="100000"
                        value={targetTeam?.budget || 0}
                        onChange={e => targetTeam && updateTeamBudget(targetTeam.id, Number(e.target.value))}
                        className="w-full bg-black/90 border border-yellow-500/60 rounded px-2 py-1 text-xs text-yellow-300 font-mono font-bold"
                        placeholder="Сумма казны ($)"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingTargetBudget(false)}
                        className="px-2 py-1 bg-yellow-500 text-black font-black rounded text-[10px]"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    /* Quick preset buttons for changing money */
                    <div className="grid grid-cols-4 gap-1 mt-0.5">
                      {[150000, 500000, 1200000, 2500000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => targetTeam && updateTeamBudget(targetTeam.id, val)}
                          className="py-0.5 text-[8px] font-mono bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded border border-white/5"
                        >
                          ${val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Upload into Seller Slot */}
                <button
                  type="button"
                  onClick={() => {
                    setModalTargetRole('target');
                    setJsonModalTab('upload');
                    setShowJsonModal(true);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
                >
                  <Upload className="w-3 h-3 text-amber-400" /> Загрузить свой JSON в этот слот (pepes)
                </button>
              </div>

            </div>
          </div>

          {/* STEP 2: PLAYERS & EXCHANGE COMPARISON */}
          <div className="bg-[#11111a] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-400" /> 2. Игроки для сделки
              </span>
              <button
                type="button"
                onClick={() => setOfferedPlayerId(prev => prev === 'cash_only' ? (userPlayers[0]?.id || '') : 'cash_only')}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                {offeredPlayerId === 'cash_only' ? 'Обменять на игрока' : 'Только деньги (Без игрока)'}
              </button>
            </div>

            {/* Visual 1-on-1 Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
              
              {/* Offeree (Your Player) */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-col justify-between gap-2.5">
                <div>
                  <span className="text-[10px] font-black uppercase text-white/50 tracking-wider block mb-1">
                    Кого отдаете взамен:
                  </span>

                  {offeredPlayerId !== 'cash_only' ? (
                    <select
                      value={offeredPlayerId}
                      onChange={e => setOfferedPlayerId(e.target.value)}
                      className="w-full bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none mb-2"
                    >
                      <option value="cash_only">--- Только деньги ---</option>
                      {userPlayers.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.nickname} ({p.role || 'Rifler'}) — Рейтинг: {Number(p.rating || 100).toFixed(0)} {p.role?.toLowerCase() === 'captain' || p.role?.toLowerCase() === 'igl' ? (p.subclass === 'fragging_igl' ? '• Стрелок' : p.subclass === 'caller_igl' ? '• Коллер' : '• Обычный') : ''}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>

                {offeredPlayer ? (
                  <div className="p-2.5 bg-white/[0.03] rounded-lg border border-white/5 flex items-center gap-2.5">
                    <PlayerAvatar playerName={offeredPlayer.nickname} avatarUrl={offeredPlayer.avatarUrl} sizeClassName="w-10 h-10" className="rounded-lg shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">{offeredPlayer.nickname}</div>
                      <div className="text-[10px] text-white/50 font-mono">
                        {offeredPlayer.role || 'Rifler'} • Рейтинг: <strong className="text-emerald-400">{Number(offeredPlayer.rating || 100).toFixed(0)}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/[0.02] border border-dashed border-white/10 rounded-lg text-center text-xs text-white/40 italic">
                    Чистый денежный выкуп (без отдачи игрока)
                  </div>
                )}
              </div>

              {/* Requested (Target Player / Star) */}
              <div className={`p-3.5 rounded-xl bg-black/40 border flex flex-col justify-between gap-2.5 ${
                isTargetStarPlayer ? 'border-amber-500/50 bg-amber-950/[0.06]' : 'border-white/10'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      Кого забираете:
                    </span>
                    {isTargetStarPlayer && (
                      <span className="bg-amber-500/20 text-amber-300 text-[9px] font-black px-1.5 py-0.2 rounded border border-amber-500/40 uppercase flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-300" /> Топ-1 звезда
                      </span>
                    )}
                  </div>

                  <select
                    value={requestedPlayerId}
                    onChange={e => setRequestedPlayerId(e.target.value)}
                    className="w-full bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none mb-2"
                  >
                    {targetPlayers.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.nickname} ({p.role || 'Rifler'}) — Рейтинг: {Number(p.rating || 100).toFixed(0)}
                      </option>
                    ))}
                  </select>
                </div>

                {requestedPlayer && (
                  <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${
                    isTargetStarPlayer ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/[0.03] border-white/5'
                  }`}>
                    <PlayerAvatar playerName={requestedPlayer.nickname} avatarUrl={requestedPlayer.avatarUrl} sizeClassName="w-10 h-10" className="rounded-lg shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate flex items-center gap-1">
                        {requestedPlayer.nickname}
                        {isTargetStarPlayer && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                      </div>
                      <div className="text-[10px] text-white/50 font-mono">
                        {requestedPlayer.role || 'Rifler'} • Рейтинг: <strong className="text-yellow-400">{Number(requestedPlayer.rating || 100).toFixed(0)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Warning if targeting the best player (pepes) */}
            {isTargetStarPlayer && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
                <Star className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 fill-amber-400" />
                <div className="leading-tight">
                  <strong className="font-black uppercase tracking-wider block mb-0.5">Внимание: вы пытаетесь забрать лучшего игрока клуба!</strong>
                  Шансы одобрения резко снижены (-35%). Виктор не отдаст ключевую звезду ({requestedPlayer?.nickname}) без огромной доплаты (от ${currentDealMetrics.targetFairCash.toLocaleString()}) или победных скримов!
                </div>
              </div>
            )}

            {/* Warning if there is a skill gap in 90-110 scale */}
            {offeredPlayer && currentDealMetrics.skillGap > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <strong className="font-black uppercase tracking-wider block mb-0.5">
                    Разница в рейтинге: +{currentDealMetrics.skillGap.toFixed(0)} в пользу забираемого игрока!
                  </strong>
                  В шкале 90–110 даже +1 или +2 рейта — это решающая разница в огневой мощи и клатчах. 
                  Виктор расценивает это как ослабление команды и отклонит сделку без доплаты от ${currentDealMetrics.targetFairCash.toLocaleString()}!
                </div>
              </div>
            )}

            {/* Cash Surcharge Slider */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-yellow-400" /> Доплата клубу:
                </span>
                <span className="text-sm font-black font-mono text-yellow-400">
                  $ {cashOffer.toLocaleString()}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="800000"
                step="5000"
                value={cashOffer}
                onChange={e => setCashOffer(Number(e.target.value))}
                className="w-full accent-yellow-500 cursor-pointer"
              />

              <div className="grid grid-cols-4 gap-1.5">
                {[25000, 50000, 100000, 250000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCashOffer(prev => prev + val)}
                    className="py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/70 font-bold"
                  >
                    +${val / 1000}k
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 3: PROOF & MATCHES */}
          <div className="bg-[#11111a] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col gap-3.5">
            <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-2 border-b border-white/10 pb-2.5">
              <Trophy className="w-4 h-4 text-emerald-400" /> 3. Доказательства для Виктора
            </span>

            {/* The Tier-1 Checkbox requested by user */}
            <label className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-400/50 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={tier1Experience}
                onChange={e => setTier1Experience(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 accent-purple-500 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  Выходил ли на Т1 уровень (LAN / Major Tier-1)
                  {tier1Experience && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </span>
                <span className="text-[10px] text-white/50">
                  Галочка подтверждает, что игрок проверен на крупной сцене и не поплывет
                </span>
              </div>
            </label>

            {/* Scrim & History Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSimulatingScrim}
                onClick={handleRunScrim}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                {isSimulatingScrim ? 'Симулируем скрим...' : '⚔️ Сыграть тестовый скрим (Bo1)'}
              </button>

              <button
                type="button"
                onClick={() => setShowMatchPicker(true)}
                className="px-3.5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Из истории
              </button>
            </div>

            {/* Attached Matches list */}
            {attachedMatches.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {attachedMatches.map(m => (
                  <div key={m.id} className="p-2 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-bold text-white">{m.mapName}</span>
                      <span className="font-mono text-emerald-400 font-bold">{m.score}</span>
                      {m.playerStats && (
                        <span className="text-[10px] text-white/50 font-mono">
                          (KD: {m.playerStats.kd})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedMatches(prev => prev.filter(x => x.id !== m.id))}
                      className="text-white/30 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Primary Submit Button */}
            <button
              type="button"
              disabled={isThinking}
              onClick={() => handleSendOffer()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
            >
              <Send className="w-4 h-4" />
              {isThinking ? 'Виктор изучает бумаги...' : 'Отправить оффер Виктору'}
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: AI Chat & Real-time Verdict (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          <div className="bg-[#11111a] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col h-[740px]">
            
            {/* Header: Speedometer Gauge */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-700 flex items-center justify-center text-white font-black text-sm shrink-0">
                  V1K
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wide">Виктор «V1KTOR» Громов</h3>
                  <p className="text-[10px] text-white/40">
                    Спортивный директор «{targetTeam?.name}» (Казна: ${Number(targetTeam?.budget || 0).toLocaleString()})
                  </p>
                </div>
              </div>

              {/* Approval Gauge Pill */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 text-xs font-mono font-black">
                  <span className="text-white/40 uppercase text-[10px]">Шанс сделки:</span>
                  <span className={`text-sm ${
                    currentDealMetrics.finalFairnessScore >= 70 ? 'text-emerald-400' : 
                    currentDealMetrics.finalFairnessScore >= 45 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {currentDealMetrics.finalFairnessScore}%
                  </span>
                </div>
                <div className="w-28 h-2 bg-black/60 rounded-full overflow-hidden mt-1 border border-white/10">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      currentDealMetrics.finalFairnessScore >= 70 ? 'bg-emerald-500' : 
                      currentDealMetrics.finalFairnessScore >= 45 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${currentDealMetrics.finalFairnessScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick explanation banner of current status */}
            <div className="py-2.5 px-3 my-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  currentDealMetrics.finalFairnessScore >= 70 ? 'bg-emerald-400' : 
                  currentDealMetrics.finalFairnessScore >= 45 ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                <span className="text-white/70 text-[11px]">
                  {isTargetStarPlayer ? 'Забирают звезду клуба: шанс сделки резко снижен.' : 'Стандартные переговоры.'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-yellow-400 font-bold">
                Запрос Виктора: ${currentDealMetrics.targetFairCash.toLocaleString()}
              </span>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-3 custom-scrollbar pr-1">
              {chatMessages.map(msg => {
                const isViktor = msg.sender === 'viktor';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[90%] ${isViktor ? 'self-start' : 'self-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[9px] font-bold text-white/40 uppercase">
                        {isViktor ? 'Виктор Громов' : 'Вы (Менеджер)'}
                      </span>
                      <span className="text-[8px] text-white/30 font-mono">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed border ${
                        isViktor 
                          ? 'bg-black/70 border-purple-500/30 text-white shadow-md' 
                          : 'bg-blue-600/25 border-blue-500/40 text-blue-100 self-end'
                      }`}
                    >
                      {/* Verdict Badge */}
                      {isViktor && msg.verdict && (
                        <div className="mb-2 flex items-center gap-2">
                          {msg.verdict === 'ACCEPTED' && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                              СДЕЛКА ОДОБРЕНА
                            </span>
                          )}
                          {msg.verdict === 'COUNTER_OFFER' && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                              ВСТРЕЧНЫЙ УЛЬТИМАТУМ
                            </span>
                          )}
                          {msg.verdict === 'NEED_TEST_MATCH' && (
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                              ТРЕБУЕТСЯ СКРИМ
                            </span>
                          )}
                          {msg.verdict === 'REJECTED' && (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                              ОТКАЗ
                            </span>
                          )}
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Reasons */}
                      {isViktor && msg.reasons && msg.reasons.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase text-white/40">Факторы Виктора:</span>
                          {msg.reasons.map((r, i) => (
                            <div key={i} className="text-[10px] text-white/70 flex items-start gap-1">
                              <span className="text-purple-400">•</span>
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Demand */}
                      {isViktor && msg.counterDemand && (
                        <div className="mt-2 p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[10px] text-purple-200">
                          <strong className="text-purple-400 uppercase font-black block text-[8px] mb-0.5">Требование:</strong>
                          {msg.counterDemand}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isThinking && (
                <div className="self-start p-2.5 bg-black/40 border border-white/10 rounded-xl flex items-center gap-2 text-xs text-white/60 animate-pulse">
                  <Bot className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  Виктор изучает рынок и казну...
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick action buttons */}
            <div className="py-2 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCashOffer(prev => prev + 50000);
                  handleSendOffer("Мы поднимаем доплату на +$50,000! Это солидные деньги в вашу казну.");
                }}
                className="px-2 py-1 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
              >
                +$50k к доплате
              </button>
              <button
                type="button"
                onClick={handleRunScrim}
                className="px-2 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
              >
                ⚔️ Сыграть скрим
              </button>
              <button
                type="button"
                onClick={() => {
                  setTier1Experience(true);
                  handleSendOffer("Подтверждаем опыт игрока на Т1 сцене против мировых грандов!");
                }}
                className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
              >
                ☑️ Подтвердить Т1
              </button>
              <button
                type="button"
                onClick={() => handleSendOffer("Это наше финальное предложение. Больше мы не отступим!")}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
              >
                Финальный оффер
              </button>
            </div>

            {/* Contract Sign Button (When Approved) */}
            {isApproved && (
              <div className="p-3 mb-2 rounded-xl bg-gradient-to-r from-emerald-950/70 to-black border-2 border-emerald-500/50 flex items-center justify-between gap-3 shrink-0">
                <div>
                  <h4 className="text-xs font-black uppercase text-emerald-300">
                    Сделка согласована!
                  </h4>
                  <p className="text-[9px] text-emerald-400/70">
                    Виктор дал добро. Можно оформить официальный переход игрока.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSigningContract}
                  onClick={handleExecuteTransfer}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-xs cursor-pointer shadow-lg shadow-emerald-500/30 shrink-0"
                >
                  {isSigningContract ? 'Оформление...' : '✍️ Подписать'}
                </button>
              </div>
            )}

            {/* Input message form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendOffer();
              }}
              className="flex items-center gap-2 pt-2 border-t border-white/10 shrink-0"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="Напишите аргумент Виктору..."
                className="flex-1 bg-black/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={isThinking}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        </div>

      </div>

      {/* DEDICATED JSON UPLOAD & PASTE MODAL */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-[#12121c] border border-purple-500/40 rounded-3xl p-6 lg:p-7 max-w-2xl w-full flex flex-col gap-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white tracking-wider">
                    Загрузить команду из JSON
                  </h3>
                  <p className="text-xs text-white/50">
                    Импортируйте команду pepes или любой свой .json файл для проверки ИИ-директором
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowJsonModal(false);
                  setJsonError('');
                }}
                className="text-white/40 hover:text-white p-1 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {jsonError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {jsonError}
              </div>
            )}

            {/* Target Role Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center justify-between">
                <span>Куда применить эту команду:</span>
                <span className="text-[10px] text-white/40 normal-case">
                  {modalTargetRole === 'target' ? 'Клуб будет защищаться ИИ Виктором' : 'Команда станет вашим клубом-покупателем'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalTargetRole('target')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    modalTargetRole === 'target' 
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10' 
                      : 'bg-black/40 border-white/10 text-white/50 hover:bg-white/5'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Продавец (Защищаемый клуб)
                </button>
                <button
                  type="button"
                  onClick={() => setModalTargetRole('buyer')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    modalTargetRole === 'buyer' 
                      ? 'bg-blue-600/20 border-blue-500/60 text-blue-300 shadow-md shadow-blue-500/10' 
                      : 'bg-black/40 border-white/10 text-white/50 hover:bg-white/5'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Покупатель (Ваш клуб)
                </button>
              </div>
            </div>

            {/* Tabs Bar */}
            <div className="flex rounded-xl bg-black/60 p-1 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setJsonModalTab('upload')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  jsonModalTab === 'upload' ? 'bg-blue-600 text-white shadow-md' : 'text-white/50 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Файл .json с диска
              </button>
              <button
                type="button"
                onClick={() => setJsonModalTab('paste')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  jsonModalTab === 'paste' ? 'bg-purple-600 text-white shadow-md' : 'text-white/50 hover:text-white'
                }`}
              >
                <Copy className="w-3.5 h-3.5" /> Вставить текст JSON
              </button>
              <button
                type="button"
                onClick={() => setJsonModalTab('preset')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  jsonModalTab === 'preset' ? 'bg-amber-600 text-white shadow-md' : 'text-white/50 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Образец «pepes»
              </button>
            </div>

            {/* TAB 1: FILE UPLOAD */}
            {jsonModalTab === 'upload' && (
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 hover:border-blue-500/60 rounded-2xl p-6 bg-white/[0.02] hover:bg-blue-600/5 transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Нажмите для выбора файла .json с вашего ПК
                    </span>
                    <span className="text-[11px] text-white/40 block mt-0.5">
                      Или перетащите файл мышкой прямо в это окно
                    </span>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider mt-1 shadow-md">
                    Обзор файлов...
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start gap-2 text-[11px] text-white/50">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    Поддерживаются любые файлы <code className="text-blue-300">.json</code>, содержащие название команды и состав игроков (например: name, budget, players).
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PASTE JSON TEXT */}
            {jsonModalTab === 'paste' && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Вставьте код JSON:</span>
                  <button
                    type="button"
                    onClick={() => setPastedJsonText(PEPES_SAMPLE_JSON)}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Вставить шаблон «pepes»
                  </button>
                </div>

                <textarea
                  value={pastedJsonText}
                  onChange={e => setPastedJsonText(e.target.value)}
                  placeholder='{ "name": "pepes", "budget": 1500000, "players": [ { "nickname": "pepes", "rating": 126, "role": "sniper" }, ... ] }'
                  rows={7}
                  className="w-full bg-black/80 border border-white/15 rounded-xl p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-purple-500 custom-scrollbar"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => processAndImportJson(pastedJsonText)}
                    disabled={!pastedJsonText.trim()}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Загрузить введенный JSON
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PEPES PRESET CARD */}
            {jsonModalTab === 'preset' && (
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-black text-sm uppercase tracking-wide">
                        Команда «pepes»
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                        ⭐ Топ Звезда клуба
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-yellow-400">
                      Казна: $1,500,000
                    </span>
                  </div>

                  <p className="text-xs text-white/70">
                    У этой команды лучший игрок — <strong>pepes</strong> (рейтинг 126, снайпер). 
                    Виктор расценивает его как абсолютную звезду франшизы и требует огромную доплату.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[10px] font-mono">
                    <div className="p-2 rounded bg-black/60 border border-amber-500/40 text-center">
                      <div className="text-amber-300 font-bold">pepes ⭐</div>
                      <div className="text-white/50">126 (AWP)</div>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <div className="text-white font-bold">keker</div>
                      <div className="text-white/50">115 (Entry)</div>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <div className="text-white font-bold">clown</div>
                      <div className="text-white/50">112 (Rifler)</div>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <div className="text-white font-bold">turbo</div>
                      <div className="text-white/50">110 (Support)</div>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                      <div className="text-white font-bold">captain</div>
                      <div className="text-white/50">107 (IGL)</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLoadPepesDirectly(modalTargetRole)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-500/20 cursor-pointer mt-1"
                  >
                    ⚡ Применить команду «pepes» как {modalTargetRole === 'target' ? 'Продавца' : 'Покупателя'}
                  </button>
                </div>
              </div>
            )}

            {/* Previously uploaded teams list */}
            {customJsonTeams.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                  Сохраненные ранее JSON-команды ({customJsonTeams.length}):
                </span>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {customJsonTeams.map(ct => (
                    <div 
                      key={ct.id} 
                      className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{ct.name}</span>
                        <span className="text-[10px] text-yellow-400 font-mono">(${Number(ct.budget || 0).toLocaleString()})</span>
                        <span className="text-[10px] text-white/40">({ct.players?.length || 0} игроков)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetTeamSource('t1_json');
                            setTargetTeamId(ct.id);
                            setShowJsonModal(false);
                            showToast(`Команда «${ct.name}» выбрана как Продавец`, 'info');
                          }}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold"
                        >
                          Выбрать продавцом
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUserTeamSource('t1_json');
                            setUserTeamId(ct.id);
                            setShowJsonModal(false);
                            showToast(`Команда «${ct.name}» выбрана как Покупатель`, 'info');
                          }}
                          className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[10px] font-bold"
                        >
                          Выбрать покупателем
                        </button>
                        <button
                          type="button"
                          onClick={() => saveCustomJsonTeams(customJsonTeams.filter(x => x.id !== ct.id))}
                          className="p-1 text-white/30 hover:text-red-400 ml-1"
                          title="Удалить"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowJsonModal(false);
                  setJsonError('');
                }}
                className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Picker Modal */}
      {showMatchPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#12121a] border border-white/15 rounded-2xl p-6 max-w-xl w-full max-h-[80vh] flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-sm uppercase text-white tracking-wider flex items-center gap-2">
                <Swords className="w-4 h-4 text-blue-400" /> Выберите матч из истории
              </h3>
              <button
                type="button"
                onClick={() => setShowMatchPicker(false)}
                className="text-white/40 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar">
              {historyMatches.length === 0 ? (
                <div className="text-center p-8 text-white/30 text-xs italic">
                  В истории пока нет матчей. Сыграйте тестовый скрим прямо кнопкой «Сыграть скрим»!
                </div>
              ) : (
                historyMatches.map((m: any, idx: number) => {
                  const mName = m.maps?.[0]?.mapName || m.map || 'Mirage';
                  const score = m.score || (m.maps?.[0] ? `${m.maps[0].score1}:${m.maps[0].score2}` : '13:9');
                  return (
                    <div
                      key={m.id || idx}
                      onClick={() => handleAttachHistoryMatch(m)}
                      className="p-3 rounded-xl bg-white/[0.03] hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/40 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">
                          {m.team1 || 'Команда 1'} vs {m.team2 || 'Команда 2'}
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5 font-mono">
                          Карта: {mName} • Счет: {score}
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase text-blue-400 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                        Выбрать
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Transfer Certificate Modal */}
      {showSuccessModal && signedTransferData && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-[#101018] border-2 border-emerald-500/60 rounded-3xl p-6 lg:p-8 max-w-lg w-full flex flex-col items-center text-center gap-5 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                Официальный трансферный сертификат
              </span>
              <h3 className="text-2xl font-black text-white uppercase tracking-wider mt-2.5">
                Трансфер завершен!
              </h3>
              <p className="text-xs text-white/60 mt-1 max-w-md">
                Игрок <strong className="text-white">{signedTransferData.requestedPlayer.nickname}</strong> успешно перешел в состав <strong className="text-white">{signedTransferData.userTeam.name}</strong>!
              </p>
            </div>

            <div className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2 text-xs text-left">
              <div className="flex justify-between items-center text-white/60">
                <span>Продавец:</span>
                <span className="text-white font-bold">{signedTransferData.targetTeam.name}</span>
              </div>
              <div className="flex justify-between items-center text-white/60">
                <span>Покупатель:</span>
                <span className="text-white font-bold">{signedTransferData.userTeam.name}</span>
              </div>
              <div className="flex justify-between items-center text-white/60">
                <span>Игрок взамен:</span>
                <span className="text-white font-bold">{signedTransferData.offeredPlayer?.nickname || 'Только деньги'}</span>
              </div>
              <div className="flex justify-between items-center text-white/60">
                <span>Компенсация:</span>
                <span className="text-yellow-400 font-mono font-bold">$ {signedTransferData.cashOffer.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Отлично, продолжить работу
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
