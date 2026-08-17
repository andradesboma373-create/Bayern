import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot,
  increment
} from '../firebase';
import { 
  RefreshCw, 
  UserCheck, 
  TrendingUp, 
  AlertTriangle, 
  Coins, 
  Check, 
  X, 
  Lock, 
  Play, 
  Square, 
  ArrowRightLeft, 
  Clock, 
  Search,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { safeLocalStorageSet } from '../lib/utils';

export default function Transfers({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'fft' | 'academy' | 'swaps'>('fft');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  
  // DB Lists
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [tgUsers, setTgUsers] = useState<any[]>([]);
  const [swapOffers, setSwapOffers] = useState<any[]>([]);
  
  // Tour Status States
  const [tourActive, setTourActive] = useState(false);
  const [tourTeams, setTourTeams] = useState<string[]>([]);
  const [savingTour, setSavingTour] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);

  // Free Agents offer state
  const [selectedFftPlayer, setSelectedFftPlayer] = useState<any | null>(null);
  const [fftOfferTeamId, setFftOfferTeamId] = useState('');
  const [fftOfferSalary, setFftOfferSalary] = useState(50000);
  const [fftNegotiationState, setFftNegotiationState] = useState<'idle' | 'thinking' | 'accepted' | 'declined'>('idle');
  const [negotiationMessage, setNegotiationMessage] = useState('');

  // Swap creation state
  const [swapSenderTeamId, setSwapSenderTeamId] = useState('');
  const [swapSenderPlayerId, setSwapSenderPlayerId] = useState('');
  const [swapReceiverTeamId, setSwapReceiverTeamId] = useState('');
  const [swapReceiverPlayerId, setSwapReceiverPlayerId] = useState('');
  const [swapSurcharge, setSwapSurcharge] = useState(100000);
  const [hasSurcharge, setHasSurcharge] = useState(false);

  // Academy logic states
  const [selectedAcademyId, setSelectedAcademyId] = useState<string>('');

  const [swapError, setSwapError] = useState('');
  const [swapSuccess, setSwapSuccess] = useState('');

  // Status/Alert Message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Pre-populate with cached data for instant loading / fallback if offline/quota exceeded
    try {
      const cachedPlayers = localStorage.getItem(`players_${user.uid}`);
      if (cachedPlayers) setPlayers(JSON.parse(cachedPlayers));
      const cachedTeams = localStorage.getItem(`teams_${user.uid}`);
      if (cachedTeams) setTeams(JSON.parse(cachedTeams));
      const cachedTgUsers = localStorage.getItem(`tgUsers_${user.uid}`);
      if (cachedTgUsers) setTgUsers(JSON.parse(cachedTgUsers));
      const cachedSwaps = localStorage.getItem(`swapOffers_${user.uid}`);
      if (cachedSwaps) setSwapOffers(JSON.parse(cachedSwaps));
      const cachedTourneys = localStorage.getItem(`tournaments_${user.uid}`);
      if (cachedTourneys) setTournaments(JSON.parse(cachedTourneys));
      const cachedMatches = localStorage.getItem(`matches_${user.uid}`);
      if (cachedMatches) setMatches(JSON.parse(cachedMatches));
      const cachedSettings = localStorage.getItem(`settings_${user.uid}`);
      if (cachedSettings) {
        const data = JSON.parse(cachedSettings);
        setTourActive(!!data.tourActive);
        setTourTeams(data.tourTeams || []);
      }
    } catch (e) {}

    setLoading(true);

    let unsubPlayers = () => {};
    let unsubTeams = () => {};
    let unsubTgUsers = () => {};
    let unsubSwaps = () => {};
    let unsubTourneys = () => {};
    let unsubMatches = () => {};
    let unsubSettings = () => {};

    // Load static data from localStorage (populated by backup-data sync)
    const handleDbUpdated = () => {
      try {
        const cachedPlayers = localStorage.getItem(`players_${user.uid}`);
        if (cachedPlayers) setPlayers(JSON.parse(cachedPlayers));
        const cachedTeams = localStorage.getItem(`teams_${user.uid}`);
        if (cachedTeams) setTeams(JSON.parse(cachedTeams));
        const cachedTgUsers = localStorage.getItem(`tgUsers_${user.uid}`);
        if (cachedTgUsers) setTgUsers(JSON.parse(cachedTgUsers));
        const cachedSwaps = localStorage.getItem(`swapOffers_${user.uid}`);
        if (cachedSwaps) setSwapOffers(JSON.parse(cachedSwaps));
        const cachedTourneys = localStorage.getItem(`tournaments_${user.uid}`);
        if (cachedTourneys) setTournaments(JSON.parse(cachedTourneys));
        const cachedMatches = localStorage.getItem(`matches_${user.uid}`);
        if (cachedMatches) setMatches(JSON.parse(cachedMatches));
        const cachedSettings = localStorage.getItem(`settings_${user.uid}`);
        if (cachedSettings) {
          const data = JSON.parse(cachedSettings);
          setTourActive(!!data.tourActive);
          setTourTeams(data.tourTeams || []);
        }
        setLoading(false);
      } catch (e) {
        console.warn("Failed to load from local storage", e);
      }
    };

    handleDbUpdated();

    if (user && user.uid && user.uid !== 'guest') {
      try {
        const qSwaps = query(collection(db, 'swapOffers'), where('channelId', '==', user.uid));
        unsubSwaps = onSnapshot(qSwaps, (snap) => {
          const list: any[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setSwapOffers(list);
          try { localStorage.setItem(`swapOffers_${user.uid}`, JSON.stringify(list)); } catch(e){}
        });

        const qTeams = query(collection(db, 'teams'), where('channelId', '==', user.uid));
        unsubTeams = onSnapshot(qTeams, (snap) => {
          const list: any[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setTeams(list);
          try { localStorage.setItem(`teams_${user.uid}`, JSON.stringify(list)); } catch(e){}
        });
      } catch (err) {
        console.warn("Realtime listener init error:", err);
      }
    }

    window.addEventListener('db-user-updated', handleDbUpdated);

    return () => {
      unsubSwaps();
      unsubTeams();
      window.removeEventListener('db-user-updated', handleDbUpdated);
    };
  }, [user]);

  // Handle Tour Toggle

  const getTeamValRating = (team: any) => {
    if (!team || !team.players) return 0;
    return team.players.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0);
  };

  const getTeamCsRating = (team: any) => {
    if (!team || !team.players) return 0;
    const players = team.players.slice(0, 5).filter((p: any) => p && p.id);
    if (players.length === 0) return 0;
    const total = players.reduce((acc: number, p: any) => acc + (Number(p.rating) || 100), 0);
    return total / players.length;
  };

  const getTeamCsRatingById = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return getTeamCsRating(team);
  };

  const getTeamValRatingById = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return getTeamValRating(team);
  };

  const handleToggleTour = async () => {
    if (!user) return;
    setSavingTour(true);
    try {
      const newStatus = !tourActive;
      const settingsRef = doc(db, 'settings', user.uid);
      await setDoc(settingsRef, {
        tourActive: newStatus,
        tourTeams: tourTeams
      }, { merge: true });
      
      setStatusMsg({
        type: 'success',
        text: newStatus ? 'Тур успешно запущен! Трансферы для участвующих команд заблокированы.' : 'Тур завершен! Трансферы разблокированы.'
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Ошибка сохранения тура: ${err.message}` });
    } finally {
      setSavingTour(false);
    }
  };

  // Add/Remove Team from Tour List
  const handleToggleTeamInTour = async (teamId: string) => {
    if (!user) return;
    let updatedTourTeams = [...tourTeams];
    if (updatedTourTeams.includes(teamId)) {
      updatedTourTeams = updatedTourTeams.filter(id => id !== teamId);
    } else {
      updatedTourTeams.push(teamId);
    }
    setTourTeams(updatedTourTeams);

    try {
      const settingsRef = doc(db, 'settings', user.uid);
      await setDoc(settingsRef, {
        tourTeams: updatedTourTeams
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Helper: check if team is locked due to active tour
  const isTeamLocked = (teamId: string) => {
    if (tourActive && tourTeams.includes(teamId)) return true;
    const activeTournaments = tournaments.filter(t => t.status === 'ongoing');
    for (const t of activeTournaments) {
        if (t.teams && t.teams.some((team: any) => team.id === teamId)) {
            return true;
        }
    }
    return false;
  };

  // Get manager's budget and tgUser document
  const getTeamManagerAndBudget = (teamId: string) => {
    const tgUser = tgUsers.find(u => u.teamId === teamId);
    return {
      tgUser,
      budget: tgUser ? (tgUser.money || 0) : 0
    };
  };

  // Offer Contract to FFT Player
  const handleOfferContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFftPlayer || !fftOfferTeamId) return;

    if (isTeamLocked(fftOfferTeamId)) {
      setNegotiationMessage('Эта команда сейчас на туре! Трансферные операции заблокированы.');
      setFftNegotiationState('declined');
      return;
    }

    const { tgUser, budget } = getTeamManagerAndBudget(fftOfferTeamId);
    // if (!tgUser) {
    //   setNegotiationMessage('У этой команды нет зарегистрированного менеджера в Telegram-боте.');
    //   setFftNegotiationState('declined');
    //   return;
    // }

    if (tgUser && budget < fftOfferSalary) {
      setNegotiationMessage('У команды недостаточно средств для выплаты стартового бюджета/зарплаты!');
      setFftNegotiationState('declined');
      return;
    }

    const team = teams.find(t => t.id === fftOfferTeamId);
    if (!team) return;

    // Check for empty slots
    const emptySlotIndex = team.players.findIndex((p: any) => !p.id || p.nickname === 'Пусто');
    if (emptySlotIndex === -1) {
      setNegotiationMessage('В составе команды нет свободных слотов (максимум 5 игроков)!');
      setFftNegotiationState('declined');
      return;
    }

    // Start Negotiation Simulation
    setFftNegotiationState('thinking');
    setNegotiationMessage('Игрок рассматривает предложение контракта...');

    setTimeout(async () => {
      // Logic for acceptance: higher salary increases chances
      // Base requirement: e.g. minimum $30,000 salary
      const acceptThreshold = 30000;
      let accepted = false;

      if (fftOfferSalary >= acceptThreshold) {
        const roll = Math.random();
        // $100k+ is 95% acceptance, lower is scaled
        const acceptChance = fftOfferSalary >= 100000 ? 0.95 : 0.7 + (fftOfferSalary / 200000);
        accepted = roll < acceptChance;
      } else {
        // under minimum salary
        accepted = Math.random() < 0.15; // 15% desperate chance
      }

      if (accepted) {
        try {
          // Transaction updates:
          // 1. Assign player to empty team slot
          const updatedPlayers = [...team.players];
          updatedPlayers[emptySlotIndex] = {
            id: selectedFftPlayer.id,
            nickname: selectedFftPlayer.nickname,
            role: selectedFftPlayer.role,
            rating: selectedFftPlayer.rating,
            valRating: selectedFftPlayer.valRating || 0
          };

          await updateDoc(doc(db, 'teams', team.id), {
            players: updatedPlayers,
            totalValRating: updatedPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0)
          });

          // 2. Deduct money from manager's balance
          if (tgUser) {
            const newMoney = budget - fftOfferSalary;
            await updateDoc(doc(db, 'tgUsers', tgUser.id), {
              money: newMoney
            });
            window.dispatchEvent(new Event('db-user-updated'));
          }

          setFftNegotiationState('accepted');
          setNegotiationMessage(`Контракт успешно подписан! Игрок ${selectedFftPlayer.nickname} перешел в команду ${team.name}. `);
          setSelectedFftPlayer(null);
        } catch (err: any) {
          setFftNegotiationState('declined');
          setNegotiationMessage(`Ошибка при подписании контракта: ${err.message}`);
        }
      } else {
        setFftNegotiationState('declined');
        setNegotiationMessage(`Игрок ${selectedFftPlayer.nickname} отклонил ваше предложение. Он хочет более высокую зарплату или лучшие условия.`);
      }
    }, 2500);
  };

  // Submit Swap Trade Offer
  const handleCreateSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwapError('');
    setSwapSuccess('');

    if (!swapSenderTeamId || !swapSenderPlayerId || !swapReceiverTeamId || !swapReceiverPlayerId) {
      setSwapError('Пожалуйста, выберите обе команды и обоих игроков для обмена.');
      return;
    }

    if (swapSenderTeamId === swapReceiverTeamId) {
      setSwapError('Невозможно произвести обмен внутри одной команды.');
      return;
    }

    if (isTeamLocked(swapSenderTeamId) || isTeamLocked(swapReceiverTeamId)) {
      setSwapError('Один из клубов находится на туре. Обмены заблокированы.');
      return;
    }

    // Check surcharge budget
    const { tgUser: senderTgUser, budget: senderBudget } = getTeamManagerAndBudget(swapSenderTeamId);
    if (senderTgUser && swapSurcharge > 0 && senderBudget < swapSurcharge) {
      setSwapError('У команды-отправителя недостаточно средств для выплаты доплаты!');
      return;
    }

    try {
      const senderTeam = teams.find(t => t.id === swapSenderTeamId);
      const receiverTeam = teams.find(t => t.id === swapReceiverTeamId);
      const playerA = swapSenderPlayerId === 'skip' ? null : players.find(p => p.id === swapSenderPlayerId);
      const playerB = players.find(p => p.id === swapReceiverPlayerId);

      if (!senderTeam || !receiverTeam || (swapSenderPlayerId !== 'skip' && !playerA) || !playerB) {
        setSwapError('Ошибка поиска игроков или команд в базе.');
        return;
      }

      const senderPlayerName = swapSenderPlayerId === 'skip' ? 'Без игрока (только доплата деньгами)' : playerA?.nickname || 'Игрок';

      // Create pendingTrades document
      const pendingTradeRef = doc(collection(db, 'pendingTrades'));
      const pendingTradeId = pendingTradeRef.id;
      await setDoc(pendingTradeRef, {
        id: pendingTradeId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'swapOffers'), {
        channelId: user.uid,
        senderTeamId: swapSenderTeamId,
        senderTeamName: senderTeam.name,
        senderPlayerId: swapSenderPlayerId,
        senderPlayerName: senderPlayerName,
        receiverTeamId: swapReceiverTeamId,
        receiverTeamName: receiverTeam.name,
        receiverPlayerId: swapReceiverPlayerId,
        receiverPlayerName: playerB.nickname,
        surcharge: Number(swapSurcharge) || 0,
        status: 'pending',
        pendingTradeId: pendingTradeId,
        createdAt: new Date().toISOString()
      });

      // Send bot notification to receiver team manager
      try {
        await fetch('/api/bot/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            teamId: swapReceiverTeamId,
            text: `🔔 *Вам предложили обмен!* 🔄\n\nКлуб *${senderTeam.name}* предлагает вам обменять *${playerB.nickname}* на *${senderPlayerName}* с доплатой вам *$${(Number(swapSurcharge) || 0).toLocaleString()}*.\n\nПроверить предложение и ответить можно на сайте или в Telegram-боте!`
          })
        });
      } catch (notifyErr) {
        console.warn("Failed to notify receiver manager:", notifyErr);
      }

      setSwapSuccess('Трансферный запрос на обмен успешно создан!');
      setSwapSenderTeamId('');
      setSwapSenderPlayerId('');
      setSwapReceiverTeamId('');
      setSwapReceiverPlayerId('');
      setSwapSurcharge(100000);
    } catch (err: any) {
      console.warn("Fallback: saving swap offer locally", err);
      try {
        const senderTeam = teams.find(t => t.id === swapSenderTeamId);
        const receiverTeam = teams.find(t => t.id === swapReceiverTeamId);
        const playerA = swapSenderPlayerId === 'skip' ? null : players.find(p => p.id === swapSenderPlayerId);
        const playerB = players.find(p => p.id === swapReceiverPlayerId);

        if (senderTeam && receiverTeam && (swapSenderPlayerId === 'skip' || playerA) && playerB) {
          const senderPlayerName = swapSenderPlayerId === 'skip' ? 'Без игрока (только доплата деньгами)' : playerA?.nickname || 'Игрок';
          const localTradeId = 'lt_' + Math.random().toString(36).substring(2, 11);
          const localSwapOffers = JSON.parse(localStorage.getItem(`swapOffers_${user.uid}`) || '[]');
          
          const newSwapOffer = {
            id: localTradeId,
            channelId: user.uid,
            senderTeamId: swapSenderTeamId,
            senderTeamName: senderTeam.name,
            senderPlayerId: swapSenderPlayerId,
            senderPlayerName: senderPlayerName,
            receiverTeamId: swapReceiverTeamId,
            receiverTeamName: receiverTeam.name,
            receiverPlayerId: swapReceiverPlayerId,
            receiverPlayerName: playerB.nickname,
            surcharge: Number(swapSurcharge) || 0,
            status: 'pending',
            pendingTradeId: localTradeId,
            createdAt: new Date().toISOString()
          };
          
          localSwapOffers.push(newSwapOffer);
          safeLocalStorageSet(`swapOffers_${user.uid}`, localSwapOffers);
          setSwapOffers(localSwapOffers);

          // Force immediate server sync so the bot receives the transfer
          fetch('/api/sync-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              swapOffers: localSwapOffers
            })
          }).then(() => {
            fetch('/api/bot/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                teamId: swapReceiverTeamId,
                text: `🔔 *Вам предложили обмен!* 🔄\n\nКлуб *${senderTeam.name}* предлагает вам обменять *${playerB.nickname}* на своего *${playerA.nickname}* с доплатой вам *$${(Number(swapSurcharge) || 0).toLocaleString()}*.\n\nПроверить предложение и ответить можно на сайте или в Telegram-боте!`
              })
            }).catch(() => {});
          }).catch(() => {});

          setSwapSuccess('Трансферный запрос на обмен успешно создан (сохранено локально)!');
          setSwapSenderTeamId('');
          setSwapSenderPlayerId('');
          setSwapReceiverTeamId('');
          setSwapReceiverPlayerId('');
          setSwapSurcharge(100000);
          return;
        }
      } catch (innerErr: any) {
        console.error("Local trade creation failed:", innerErr);
      }
      setSwapError(`Ошибка отправки обмена: ${err.message}`);
    }
  };

  // Execute Swap Offer Approval
  const handleAcceptSwap = async (offer: any) => {
    if (isTeamLocked(offer.senderTeamId) || isTeamLocked(offer.receiverTeamId)) {
      alert('Один из клубов заблокирован на туре. Обмен невозможен.');
      return;
    }

    const { tgUser: senderManager, budget: senderBudget } = getTeamManagerAndBudget(offer.senderTeamId);
    const { tgUser: receiverManager, budget: receiverBudget } = getTeamManagerAndBudget(offer.receiverTeamId);

    // if (!senderManager || !receiverManager) {
    //   alert('У одной из команд нет активного лидера в Telegram-боте.');
    //   return;
    // }

    if (senderManager && offer.surcharge > 0 && senderBudget < offer.surcharge) {
      alert('У команды-отправителя недостаточно денег на доплату.');
      return;
    }

    try {
      // Verify pendingTrade transaction state
      if (offer.pendingTradeId && !user.isLocalDemo) {
        const pTradeRef = doc(db, 'pendingTrades', offer.pendingTradeId);
        const pTradeSnap = await getDoc(pTradeRef);
        if (!pTradeSnap.exists() || pTradeSnap.data().status !== 'pending') {
          alert('Трейд недействителен');
          return;
        }
        await updateDoc(pTradeRef, { status: 'completed' });
      }

      const senderTeam = teams.find(t => t.id === offer.senderTeamId);
      const receiverTeam = teams.find(t => t.id === offer.receiverTeamId);

      if (!senderTeam || !receiverTeam) {
        alert('Одна из команд обмена не найдена.');
        return;
      }

      // Find players in rosters
      const senderPlayerIdx = offer.senderPlayerId === 'skip' ? -2 : senderTeam.players.findIndex((p: any) => p.id === offer.senderPlayerId);
      const receiverPlayerIdx = receiverTeam.players.findIndex((p: any) => p.id === offer.receiverPlayerId);

      if ((offer.senderPlayerId !== 'skip' && senderPlayerIdx === -1) || receiverPlayerIdx === -1) {
        alert('Один из игроков больше не состоит в указанном клубе.');
        return;
      }

      const playerBData = receiverTeam.players[receiverPlayerIdx];

      // Perform Swap in teams array
      const updatedSenderPlayers = [...senderTeam.players];
      if (offer.senderPlayerId !== 'skip') {
        updatedSenderPlayers[senderPlayerIdx] = playerBData;
      } else {
        updatedSenderPlayers.push(playerBData);
      }

      const updatedReceiverPlayers = [...receiverTeam.players];
      if (offer.senderPlayerId !== 'skip') {
        const playerAData = senderTeam.players[senderPlayerIdx];
        updatedReceiverPlayers[receiverPlayerIdx] = playerAData;
      } else {
        updatedReceiverPlayers.splice(receiverPlayerIdx, 1);
      }

      // 1. Update Team documents
      await updateDoc(doc(db, 'teams', senderTeam.id), { 
        players: updatedSenderPlayers,
        totalValRating: updatedSenderPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0)
      });
      await updateDoc(doc(db, 'teams', receiverTeam.id), { 
        players: updatedReceiverPlayers,
        totalValRating: updatedReceiverPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0)
      });

      // 2. Perform financial surcharge transfers
      if (offer.surcharge > 0) {
        if (senderManager) await updateDoc(doc(db, 'tgUsers', senderManager.id), { money: senderBudget - offer.surcharge });
        if (receiverManager) await updateDoc(doc(db, 'tgUsers', receiverManager.id), { money: receiverBudget + offer.surcharge });
        window.dispatchEvent(new Event('db-user-updated'));
      }

      // 3. Update swap offer status
      await updateDoc(doc(db, 'swapOffers', offer.id), { status: 'accepted' });
      setStatusMsg({ type: 'success', text: `Обмен успешно подтвержден! Игроки обменялись составами.` });
    } catch (err: any) {
      console.warn("Fallback: processing swap accept locally", err);
      try {
        const senderTeam = teams.find(t => t.id === offer.senderTeamId);
        const receiverTeam = teams.find(t => t.id === offer.receiverTeamId);

        if (senderTeam && receiverTeam) {
          const senderPlayerIdx = offer.senderPlayerId === 'skip' ? -2 : senderTeam.players.findIndex((p: any) => p && p.id === offer.senderPlayerId);
          const receiverPlayerIdx = receiverTeam.players.findIndex((p: any) => p && p.id === offer.receiverPlayerId);

          if ((offer.senderPlayerId === 'skip' || senderPlayerIdx !== -1) && receiverPlayerIdx !== -1) {
            const playerBData = receiverTeam.players[receiverPlayerIdx];

            const updatedSenderPlayers = [...senderTeam.players];
            if (offer.senderPlayerId !== 'skip') {
              updatedSenderPlayers[senderPlayerIdx] = playerBData;
            } else {
              updatedSenderPlayers.push(playerBData);
            }

            const updatedReceiverPlayers = [...receiverTeam.players];
            if (offer.senderPlayerId !== 'skip') {
              const playerAData = senderTeam.players[senderPlayerIdx];
              updatedReceiverPlayers[receiverPlayerIdx] = playerAData;
            } else {
              updatedReceiverPlayers.splice(receiverPlayerIdx, 1);
            }

            // Update teams in local storage
            const localTeams = JSON.parse(localStorage.getItem(`teams_${user.uid}`) || '[]');
            const updatedLocalTeams = localTeams.map((t: any) => {
              if (t.id === senderTeam.id) {
                return { 
                  ...t, 
                  players: updatedSenderPlayers,
                  totalValRating: updatedSenderPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0)
                };
              }
              if (t.id === receiverTeam.id) {
                return {
                  ...t,
                  players: updatedReceiverPlayers,
                  totalValRating: updatedReceiverPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0)
                };
              }
              return t;
            });
            safeLocalStorageSet(`teams_${user.uid}`, updatedLocalTeams);
            setTeams(updatedLocalTeams);

            // Update manager budgets in local storage
            const localTgUsers = JSON.parse(localStorage.getItem(`tgUsers_${user.uid}`) || '[]');
            const updatedLocalTgUsers = localTgUsers.map((u: any) => {
              if (senderManager && u.id === senderManager.id) {
                return { ...u, money: senderBudget - offer.surcharge };
              }
              if (receiverManager && u.id === receiverManager.id) {
                return { ...u, money: receiverBudget + offer.surcharge };
              }
              return u;
            });
            safeLocalStorageSet(`tgUsers_${user.uid}`, updatedLocalTgUsers);
            setTgUsers(updatedLocalTgUsers);

            // Update swapOffer status to accepted
            const localSwapOffers = JSON.parse(localStorage.getItem(`swapOffers_${user.uid}`) || '[]');
            const updatedLocalSwaps = localSwapOffers.map((o: any) => {
              if (o.id === offer.id) {
                return { ...o, status: 'accepted' };
              }
              return o;
            });
            safeLocalStorageSet(`swapOffers_${user.uid}`, updatedLocalSwaps);
            setSwapOffers(updatedLocalSwaps);

            // Trigger immediate server sync
            fetch('/api/sync-cache', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                teams: updatedLocalTeams,
                tgUsers: updatedLocalTgUsers,
                swapOffers: updatedLocalSwaps
              })
            }).catch(() => {});

            window.dispatchEvent(new Event('db-user-updated'));
            setStatusMsg({ type: 'success', text: `Обмен успешно подтвержден (сохранено локально)! Игроки обменялись составами.` });
            return;
          }
        }
      } catch (innerErr: any) {
        console.error("Local swap approval failed:", innerErr);
      }
      alert(`Ошибка обработки транзакции обмена: ${err.message}`);
    }
  };

  // Reject Swap Offer
  const handleRejectSwap = async (offerId: string) => {
    try {
      if (!user.isLocalDemo) {
        await updateDoc(doc(db, 'swapOffers', offerId), { status: 'rejected' });
      }
      setStatusMsg({ type: 'success', text: 'Запрос на обмен отклонен.' });
    } catch (err: any) {
      console.warn("Fallback: processing swap reject locally", err);
      try {
        const localSwapOffers = JSON.parse(localStorage.getItem(`swapOffers_${user.uid}`) || '[]');
        const updatedLocalSwaps = localSwapOffers.map((o: any) => {
          if (o.id === offerId) {
            return { ...o, status: 'rejected' };
          }
          return o;
        });
        localStorage.setItem(`swapOffers_${user.uid}`, JSON.stringify(updatedLocalSwaps));
        setSwapOffers(updatedLocalSwaps);

        // Trigger immediate server sync
        fetch('/api/sync-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            swapOffers: updatedLocalSwaps
          })
        }).catch(() => {});

        setStatusMsg({ type: 'success', text: 'Запрос на обмен отклонен (сохранено локально).' });
        return;
      } catch (innerErr: any) {
        console.error("Local swap rejection failed:", innerErr);
      }
      alert(`Ошибка: ${err.message}`);
    }
  };

  // Filter FFT players (players that are not assigned to any team)
  const assignedPlayerIds = teams.flatMap(t => t.players?.map((p: any) => p.id)).filter(Boolean);
  const fftPlayers = players.filter(p => !assignedPlayerIds.includes(p.id));

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-white">
      
      {/* Top Header Panel */}
      <div className="w-full">
        {/* Banner Block */}
        <div className="bg-[#12121a] rounded-2xl p-8 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <RefreshCw className="text-blue-500 animate-spin-slow w-8 h-8" />
              Трансферное Окно
            </h1>
            <p className="text-white/40 text-sm mt-2 font-semibold">
              Управляйте свободными агентами (FFT), проводите обмены между клубами и контролируйте статус туров в панели "Турниры".
            </p>
          </div>
          
          {/* Tabs header - 4 buttons structured by lines */}
          <div className="flex flex-col gap-3 w-full md:w-[450px]">
            {/* 1 СТРОЧКА: ОБМЕНЫ и АКАДЕМКИ */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('swaps')}
                className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTab === 'swaps' 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/10' 
                    : 'bg-black/40 text-white/75 border-white/5 hover:text-white hover:bg-white/5'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                Обмены ({swapOffers.filter(s => s.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('academy')}
                className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  activeTab === 'academy' 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/10' 
                    : 'bg-black/40 text-white/75 border-white/5 hover:text-white hover:bg-white/5'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Академки
              </button>
            </div>

            {/* 2 СТРОЧКА: ФФТ ИГРОКИ */}
            <button
              onClick={() => setActiveTab('fft')}
              className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                activeTab === 'fft' 
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/10' 
                  : 'bg-black/40 text-white/75 border-white/5 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              ФФТ Игроки
            </button>

            {/* 3 СТРОЧКА: НАЗАД */}
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border bg-red-600/10 hover:bg-red-600/20 text-red-400 border-red-500/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Link>
          </div>
        </div>
      </div>

      {/* Team Leaderboard Row */}
      <div className="bg-[#12121a] rounded-2xl p-6 border border-white/5 flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
          <span>🏆</span> Топ команд (по CS Рейтингу)
        </h3>
        <div className="flex flex-wrap gap-4">
          {teams.length === 0 ? (
            <span className="text-xs text-white/30 italic">Нет зарегистрированных команд</span>
          ) : (
            [...teams]
              .sort((a, b) => getTeamCsRating(b) - getTeamCsRating(a))
              .map((t, idx) => {
                const csRating = getTeamCsRating(t);
                const valRating = getTeamValRating(t);
                return (
                  <div key={t.id} className="flex items-center gap-3 bg-black/40 border border-white/5 px-4 py-2.5 rounded-xl">
                    <span className="text-xs font-bold text-white/40">#{idx + 1}</span>
                    <span className="font-bold text-white text-xs">{t.name}</span>
                    <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                      <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">CS: {csRating.toFixed(2)}</span>
                      <span className="text-[10px] font-mono text-[#ff8f00] font-bold bg-[#ff8f00]/10 px-2 py-0.5 rounded">VAC: {valRating.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Global Status Message */}
      {statusMsg && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-bold ${
          statusMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-white/40 hover:text-white cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="bg-[#12121a] rounded-2xl border border-white/5 p-8 flex flex-col gap-6">
        
        {/* FFT PLAYERS TAB */}
        {activeTab === 'fft' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Free Agent List */}
            <div className="xl:col-span-2 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-3 gap-4">
                <h2 className="text-xl font-black uppercase tracking-wider text-white">Свободные Агенты (FFT)</h2>
                <div className="relative w-full md:w-64">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                   <input type="text" placeholder="Поиск агента..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#12121a] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
              
              {fftPlayers.filter(p => p.nickname.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="p-12 text-center text-white/30 font-bold bg-black/20 rounded-xl border border-white/5">
                  В настоящее время свободных агентов нет. Все игроки состоят в клубах.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {fftPlayers.filter(p => p.nickname.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => {
                    const isSelected = selectedFftPlayer?.id === p.id;
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          setSelectedFftPlayer(p);
                          setFftNegotiationState('idle');
                        }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.05)]' 
                            : 'bg-black/30 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={`https://ui-avatars.com/api/?name=${p.nickname}&background=random`} className="w-10 h-10 rounded-full" />
                          <div>
                            <div className="font-black text-white">{p.nickname}</div>
                            <div className="text-[10px] text-white/40 uppercase tracking-widest">{p.role}</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <div className="text-right">
                            <span className="text-[9px] text-white/30 uppercase block font-black">CS2 Rating</span>
                            <span className="font-mono font-bold text-blue-400">{Number(p.rating).toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-white/30 uppercase block font-black">VAC Pts</span>
                            <span className="font-mono font-bold text-[#ff8f00]">{(p.valRating || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Negotiation Offer Box */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 h-fit">
              <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Coins className="text-yellow-500" />
                Подписать Игрока
              </h2>
              
              {!selectedFftPlayer ? (
                <div className="py-12 text-center text-white/30 text-sm font-semibold flex flex-col items-center gap-3">
                  <Search className="w-8 h-8 opacity-40" />
                  Выберите свободного агента в списке слева, чтобы отправить предложение.
                </div>
              ) : (
                <form onSubmit={handleOfferContract} className="flex flex-col gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center relative overflow-hidden">
                    <img src={`https://ui-avatars.com/api/?name=${selectedFftPlayer.nickname}&background=random`} className="w-16 h-16 rounded-full mx-auto mb-2 border border-white/10" />
                    <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-black tracking-widest uppercase">FFT AGENT</span>
                    <h3 className="text-xl font-black mt-2">{selectedFftPlayer.nickname}</h3>
                    <p className="text-white/40 text-xs font-mono font-bold uppercase mt-1">Роль: {selectedFftPlayer.role} | VAC: {(selectedFftPlayer.valRating || 0).toLocaleString()}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Ваш Клуб</label>
                    <select 
                      required
                      value={fftOfferTeamId}
                      onChange={e => setFftOfferTeamId(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none text-sm"
                    >
                      <option value="">-- Выберите команду --</option>
                      {teams.filter(t => !t.isAcademy).map(t => {
                        const locked = isTeamLocked(t.id);
                        const { budget } = getTeamManagerAndBudget(t.id);
                        const teamVal = getTeamValRating(t);
                        const teamCs = getTeamCsRating(t);
                        return (
                          <option key={t.id} value={t.id} disabled={locked}>
                            {t.name} (CS: {teamCs.toFixed(2)} | VAC: {teamVal.toLocaleString()}) {locked ? ' (На Туре - LOCK)' : ` ($ ${budget.toLocaleString()})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Предложение бюджета / Зарплата ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-yellow-500 font-bold">$</span>
                      <input 
                        type="number"
                        min="5000"
                        step="5000"
                        value={fftOfferSalary}
                        onChange={e => setFftOfferSalary(Number(e.target.value))}
                        className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono font-bold text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-white/30 font-semibold block mt-1.5">Контрактные требования FFT агентов начинаются от $30 000.</span>
                  </div>

                  {fftNegotiationState !== 'idle' && (
                    <div className={`p-4 rounded-xl border text-xs font-semibold leading-relaxed ${
                      fftNegotiationState === 'thinking' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' :
                      fftNegotiationState === 'accepted' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                      'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {negotiationMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={fftNegotiationState === 'thinking' || !fftOfferTeamId}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-40 text-white font-black py-3.5 rounded-xl transition-all uppercase tracking-wider text-sm cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.15)] mt-2"
                  >
                    {fftNegotiationState === 'thinking' ? 'Отправка...' : 'Отправить предложение'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ACADEMY PROSPECTS TAB */}
        {activeTab === 'academy' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Academy Selector */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-6 h-fit flex flex-col gap-4">
                <h2 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/5 pb-3">Управление Академией</h2>
                
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Выберите академию</label>
                  <select 
                    value={selectedAcademyId}
                    onChange={e => setSelectedAcademyId(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none text-sm"
                  >
                    <option value="">-- Ваши академические команды --</option>
                    {teams.filter(t => t.isAcademy).map(t => (
                      <option key={t.id} value={t.id}>
                        🛡 {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAcademyId && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                     <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Состав выбранной академии</h3>
                     <div className="flex flex-col gap-2">
                       {teams.find(t => t.id === selectedAcademyId)?.players?.map((p: any, pIdx: number) => {
                          const isEmpty = !p || !p.id;
                          return isEmpty ? null : (
                            <div key={pIdx} className="flex justify-between items-center p-2 rounded-lg bg-black/40 border border-white/5 text-xs">
                               <div className="flex flex-col">
                                  <span className="font-bold text-white/80">{p.nickname}</span>
                                  <span className="text-[10px] text-white/40 uppercase">{p.role}</span>
                               </div>
                            </div>
                          )
                       })}
                       {(!teams.find(t => t.id === selectedAcademyId)?.players || teams.find(t => t.id === selectedAcademyId)?.players.length === 0) && (
                         <div className="text-center p-3 text-white/30 text-xs italic bg-white/[0.02] rounded-lg border border-white/5">
                           Состав пуст
                         </div>
                       )}
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* SWAP TRADE OFFERS TAB */}
        {activeTab === 'swaps' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Create Offer Form */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-6 h-fit flex flex-col gap-4">
              <h2 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/5 pb-3">Предложить обмен игроками</h2>
              
              {swapError && <div className="text-xs font-bold text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{swapError}</div>}
              {swapSuccess && <div className="text-xs font-bold text-green-400 bg-green-500/10 p-3 rounded-xl border border-green-500/20">{swapSuccess}</div>}

              <form onSubmit={handleCreateSwap} className="flex flex-col gap-4">
                
                {/* Sender Team */}
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Отправитель обмена (Ваш клуб)</label>
                  <select 
                    value={swapSenderTeamId}
                    onChange={e => {
                      setSwapSenderTeamId(e.target.value);
                      setSwapSenderPlayerId('');
                    }}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none text-xs"
                  >
                    <option value="">-- Выберите команду A --</option>
                    {teams.filter(t => !t.isAcademy).map(t => {
                      const teamVal = getTeamValRating(t);
                        const teamCs = getTeamCsRating(t);
                      return (
                        <option key={t.id} value={t.id} disabled={isTeamLocked(t.id)}>
                          {t.name} (CS: {teamCs.toFixed(2)} | VAC: {teamVal.toLocaleString()}) {isTeamLocked(t.id) ? ' (На Туре - LOCK)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Sender Player */}
                {swapSenderTeamId && (
                  <div>
                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Игрок из вашего клуба</label>
                    <select 
                      value={swapSenderPlayerId}
                      onChange={e => setSwapSenderPlayerId(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none text-xs"
                    >
                      <option value="">-- Выберите игрока A --</option>
                      <option value="skip">--- Без игрока (только доплата) ---</option>
                      {teams.find(t => t.id === swapSenderTeamId)?.players?.filter((p: any) => p && p.id).map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.nickname} (CS: {Number(p.rating).toFixed(0)} | VAC: {p.valRating || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Receiver Team */}
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Получатель обмена (Другой клуб)</label>
                  <select 
                    value={swapReceiverTeamId}
                    onChange={e => {
                      setSwapReceiverTeamId(e.target.value);
                      setSwapReceiverPlayerId('');
                    }}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none text-xs"
                  >
                    <option value="">-- Выберите команду B --</option>
                    {teams.filter(t => !t.isAcademy).map(t => {
                      const teamVal = getTeamValRating(t);
                        const teamCs = getTeamCsRating(t);
                      return (
                        <option key={t.id} value={t.id} disabled={isTeamLocked(t.id)}>
                          {t.name} (CS: {teamCs.toFixed(2)} | VAC: {teamVal.toLocaleString()}) {isTeamLocked(t.id) ? ' (На Туре - LOCK)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Receiver Player */}
                {swapReceiverTeamId && (
                  <div>
                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Игрок другого клуба</label>
                    <select 
                      value={swapReceiverPlayerId}
                      onChange={e => setSwapReceiverPlayerId(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none text-xs"
                    >
                      <option value="">-- Выберите игрока B --</option>
                      {teams.find(t => t.id === swapReceiverTeamId)?.players?.filter((p: any) => p && p.id).map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.nickname} (CS: {Number(p.rating).toFixed(0)} | VAC: {p.valRating || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Cash surcharge */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block">Доплата от вас ($)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setHasSurcharge(false); setSwapSurcharge(0); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${!hasSurcharge ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-black/40 border-white/10 text-white/50 hover:bg-white/5'}`}
                    >
                      Без ДП
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasSurcharge(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${hasSurcharge ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-500' : 'bg-black/40 border-white/10 text-white/50 hover:bg-white/5'}`}
                    >
                      С ДП
                    </button>
                  </div>
                  
                  {hasSurcharge && (
                    <div className="mt-2 animate-fade-in">
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-yellow-500 font-bold">$</span>
                        <input 
                          type="number"
                          min="0"
                          step="10000"
                          value={swapSurcharge}
                          onChange={e => setSwapSurcharge(Number(e.target.value))}
                          className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono font-bold text-xs"
                          placeholder="Введите сумму доплаты"
                        />
                      </div>
                      <span className="text-[9px] text-white/30 block mt-1.5 leading-snug">
                        Сумма доплаты будет автоматически списана с баланса вашего клуба и зачислена другому клубу при одобрении.
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#ff8f00] hover:bg-[#ff8f00]/80 text-black font-black py-3 rounded-xl transition-all uppercase tracking-wider text-xs cursor-pointer shadow-[0_0_20px_rgba(255,143,0,0.15)] mt-2"
                >
                  Предложить Обмен
                </button>
              </form>
            </div>

            {/* Swap Trade Offers List */}
            <div className="xl:col-span-2 flex flex-col gap-4">
              <h2 className="text-xl font-black uppercase tracking-wider text-white border-b border-white/5 pb-3 flex items-center gap-2">
                <Clock className="text-blue-500 animate-pulse w-5 h-5" />
                Активные Запросы На Обмен ({swapOffers.filter(s => s.status === 'pending').length})
              </h2>

              {swapOffers.length === 0 ? (
                <div className="p-12 text-center text-white/30 font-bold bg-black/20 rounded-xl border border-white/5">
                  В настоящее время нет открытых трансферных запросов на обмен.
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                  {swapOffers.map((offer) => {
                    const isPending = offer.status === 'pending';
                    return (
                      <div key={offer.id} className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-4 relative overflow-hidden group">
                        
                        {/* Status tag */}
                        <div className="absolute top-0 right-0">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-bl block ${
                            offer.status === 'accepted' ? 'bg-green-500/10 text-green-400 border-l border-b border-green-500/10' :
                            offer.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-l border-b border-red-500/10' :
                            'bg-yellow-500/10 text-yellow-500 border-l border-b border-yellow-500/10'
                          }`}>
                            {offer.status === 'accepted' ? 'Принят' : 
                             offer.status === 'rejected' ? 'Отклонен' : 'Ожидает решения'}
                          </span>
                        </div>

                        {/* Swap visualizer cards */}
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
                          <div className="md:col-span-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 text-center">
                            <span className="text-[9px] font-bold text-white/40 block mb-1 uppercase tracking-wider">
                              {offer.senderTeamName} (CS: {getTeamCsRatingById(offer.senderTeamId).toFixed(2)} | VAC: {getTeamValRatingById(offer.senderTeamId).toLocaleString()})
                            </span>
                            <span className="font-black text-white text-base block">{offer.senderPlayerName}</span>
                          </div>
                          
                          <div className="md:col-span-1 flex flex-col items-center justify-center">
                            <ArrowRightLeft className="text-blue-500 w-5 h-5" />
                            {offer.surcharge > 0 && (
                              <span className="text-[9px] text-yellow-500 font-bold mt-1 font-mono leading-none">
                                +$ {offer.surcharge.toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="md:col-span-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 text-center">
                            <span className="text-[9px] font-bold text-white/40 block mb-1 uppercase tracking-wider">
                              {offer.receiverTeamName} (CS: {getTeamCsRatingById(offer.receiverTeamId).toFixed(2)} | VAC: {getTeamValRatingById(offer.receiverTeamId).toLocaleString()})
                            </span>
                            <span className="font-black text-white text-base block">{offer.receiverPlayerName}</span>
                          </div>
                        </div>

                        {/* Action buttons (only for admin/pending) */}
                        {isPending && (
                          <div className="flex gap-3 justify-end border-t border-white/5 pt-3 mt-1">
                            <button 
                              onClick={() => handleRejectSwap(offer.id)}
                              className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <X className="w-3.5 h-3.5" />
                              Отклонить обмен
                            </button>
                            <button 
                              onClick={() => handleAcceptSwap(offer)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Одобрить обмен
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
