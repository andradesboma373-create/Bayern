import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, db } from '../firebase';

import { ShieldAlert, UserPlus, X, Search, User, ArrowRightLeft, Check, CheckCircle2, Clock, XCircle, Zap, RefreshCw, Coins } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { safeLocalStorageSet } from '../lib/utils';

export default function TgUsers({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'users' | 'transfers'>('users');
  const [tgUsersList, setTgUsersList] = useState<any[]>([]);
  const [swapOffersList, setSwapOffersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [transferFilter, setTransferFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('accepted');
  
  const [selectedTgUser, setSelectedTgUser] = useState<any>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState('Менеджер (Лидер)');
  
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<any>(null);
  const [moneyModalUser, setMoneyModalUser] = useState<any>(null);
  const [moneyAmount, setMoneyAmount] = useState<string>('');
  const [moneyAction, setMoneyAction] = useState<'add' | 'set' | 'subtract'>('add');
  const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [executingTransferId, setExecutingTransferId] = useState<string | null>(null);
  const [executingAll, setExecutingAll] = useState<boolean>(false);

  const localTeams = JSON.parse(localStorage.getItem(`teams_${user?.uid}`) || '[]');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Tg Users
      let usersList: any[] = [];
      try {
        const qUsers = query(collection(db, 'tgUsers'), where('botUserId', '==', user.uid));
        const snapUsers = await getDocs(qUsers);
        usersList = snapUsers.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        usersList = JSON.parse(localStorage.getItem(`tgUsers_${user.uid}`) || '[]');
      }
      setTgUsersList(usersList);
      safeLocalStorageSet(`tgUsers_${user.uid}`, usersList);

      // 2. Fetch Swap Offers / Transfers
      let swapsList: any[] = [];
      try {
        const qSwaps = query(collection(db, 'swapOffers'), where('channelId', '==', user.uid));
        const snapSwaps = await getDocs(qSwaps);
        swapsList = snapSwaps.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        swapsList = JSON.parse(localStorage.getItem(`swapOffers_${user.uid}`) || '[]');
      }
      // Sort newest first
      swapsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setSwapOffersList(swapsList);
      safeLocalStorageSet(`swapOffers_${user.uid}`, swapsList);

    } catch (e: any) {
      console.warn("Firestore error, loading locally");
      setTgUsersList(JSON.parse(localStorage.getItem(`tgUsers_${user.uid}`) || '[]'));
      setSwapOffersList(JSON.parse(localStorage.getItem(`swapOffers_${user.uid}`) || '[]'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => {
      fetchData();
    };

    window.addEventListener('db-user-updated', handleUpdate);
    window.addEventListener('teams-updated', handleUpdate);
    return () => {
      window.removeEventListener('db-user-updated', handleUpdate);
      window.removeEventListener('teams-updated', handleUpdate);
    };
  }, [user]);

  const handleUpdateMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moneyModalUser) return;
    const amountNum = Number(moneyAmount) || 0;
    if (amountNum <= 0 && moneyAction !== 'set') {
      alert("Укажите корректную сумму");
      return;
    }

    const team = localTeams.find((t: any) => t.id === moneyModalUser.teamId);
    let currentBudget = team?.budget !== undefined ? Number(team.budget) : (Number(moneyModalUser.money) || 0);
    let newBudget = currentBudget;

    if (moneyAction === 'add') {
      newBudget = currentBudget + amountNum;
    } else if (moneyAction === 'subtract') {
      newBudget = Math.max(0, currentBudget - amountNum);
    } else {
      newBudget = Math.max(0, amountNum);
    }

    try {
      // 1. Update tgUser doc
      const userRef = doc(db, 'tgUsers', moneyModalUser.id);
      await updateDoc(userRef, { money: newBudget });

      // 2. Update team doc if assigned
      if (moneyModalUser.teamId) {
        const teamRef = doc(db, 'teams', moneyModalUser.teamId);
        await updateDoc(teamRef, { budget: newBudget });

        const updatedLocalTeams = localTeams.map((t: any) => t.id === moneyModalUser.teamId ? { ...t, budget: newBudget } : t);
        safeLocalStorageSet(`teams_${user.uid}`, updatedLocalTeams);
      }

      // Sync cache for server bot
      const updatedLocalTgUsers = tgUsersList.map(u => u.id === moneyModalUser.id ? { ...u, money: newBudget } : u);
      safeLocalStorageSet(`tgUsers_${user.uid}`, updatedLocalTgUsers);

      fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          teams: localTeams.map((t: any) => t.id === moneyModalUser.teamId ? { ...t, budget: newBudget } : t),
          tgUsers: updatedLocalTgUsers
        })
      }).catch(() => {});

      // Notify user via Telegram Bot API endpoint if bot token exists
      const settingsStr = localStorage.getItem(`settings_${user.uid}`);
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.botToken && moneyModalUser.chatId) {
          const diffStr = moneyAction === 'add' ? `+ $${amountNum.toLocaleString()}` : moneyAction === 'subtract' ? `- $${amountNum.toLocaleString()}` : `$${newBudget.toLocaleString()}`;
          const msgText = `💰 *ИЗМЕНЕНИЕ БЮДЖЕТА* 💰\n\nАдминистратор изменил бюджет вашей организации *${moneyModalUser.teamName || 'Команда'}*!\n\nСтарый баланс: *$${currentBudget.toLocaleString()}*\nНовый баланс: *$${newBudget.toLocaleString()}* (${diffStr})`;
          fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: moneyModalUser.chatId,
              text: msgText,
              parse_mode: 'Markdown'
            })
          }).catch(err => console.warn("TG notification failed:", err));
        }
      }

      setStatusMsg({ type: 'success', text: `Бюджет обновлен: $${newBudget.toLocaleString()}` });
      setMoneyModalUser(null);
      setMoneyAmount('');
      fetchData();
      window.dispatchEvent(new Event('db-user-updated'));
    } catch (err: any) {
      console.error("Error updating money:", err);
      setStatusMsg({ type: 'error', text: 'Ошибка при сохранении денег' });
    }
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleAssignTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTgUser || !selectedTeamId) return;
    
    const team = localTeams.find((t: any) => t.id === selectedTeamId);
    if (!team) return;
    
    try {
      const ref = doc(db, 'tgUsers', selectedTgUser.id);
      await updateDoc(ref, {
        teamId: team.id,
        teamName: team.name,
        status: selectedRole
      });
    } catch (e) {}
    
    setStatusMsg({ type: 'success', text: `Команда ${team.name} назначена пользователю @${selectedTgUser.username || selectedTgUser.firstName}` });
    setSelectedTgUser(null);
    fetchData();
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleRemoveTeam = async (tgUser: any) => {
    try {
      const ref = doc(db, 'tgUsers', tgUser.id);
      await updateDoc(ref, {
        teamId: null,
        teamName: null,
        status: 'Свободный агент'
      });
    } catch(e) {}
    setStatusMsg({ type: 'success', text: `Пользователь @${tgUser.username || tgUser.firstName} снят с должности` });
    setConfirmRemoveUser(null);
    fetchData();
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Execution engine for a single transfer offer
  const executeTransfer = async (offer: any, quiet = false) => {
    let teamsArr = JSON.parse(localStorage.getItem(`teams_${user?.uid}`) || '[]');
    let tgUsersArr = JSON.parse(localStorage.getItem(`tgUsers_${user?.uid}`) || '[]');
    let playersArr = JSON.parse(localStorage.getItem(`players_${user?.uid}`) || '[]');
    let swapOffersArr = JSON.parse(localStorage.getItem(`swapOffers_${user?.uid}`) || '[]');

    const senderTeam = teamsArr.find((t: any) => t.id === offer.senderTeamId);
    const receiverTeam = teamsArr.find((t: any) => t.id === offer.receiverTeamId);

    if (!senderTeam || !receiverTeam) {
      if (!quiet) alert(`Одна из команд (ID: ${offer.senderTeamId} / ${offer.receiverTeamId}) не найдена.`);
      return false;
    }

    const senderManager = tgUsersArr.find((u: any) => u.teamId === senderTeam.id);
    const receiverManager = tgUsersArr.find((u: any) => u.teamId === receiverTeam.id);

    let senderBudget = senderTeam.budget !== undefined ? Number(senderTeam.budget) : (senderManager ? Number(senderManager.money) || 0 : 0);
    let receiverBudget = receiverTeam.budget !== undefined ? Number(receiverTeam.budget) : (receiverManager ? Number(receiverManager.money) || 0 : 0);

    const surcharge = Number(offer.surcharge) || 0;

    if (surcharge > 0 && senderBudget < surcharge) {
      if (!quiet) alert(`У команды ${senderTeam.name} недостаточно денег на доплату ($${senderBudget.toLocaleString()} из $${surcharge.toLocaleString()}).`);
      return false;
    }

    const senderPlayers = Array.isArray(senderTeam.players) ? [...senderTeam.players] : [];
    const receiverPlayers = Array.isArray(receiverTeam.players) ? [...receiverTeam.players] : [];

    const senderPlayerIdx = offer.senderPlayerId === 'skip' ? -2 : senderPlayers.findIndex((p: any) => p && p.id === offer.senderPlayerId);
    const receiverPlayerIdx = receiverPlayers.findIndex((p: any) => p && p.id === offer.receiverPlayerId);

    if (receiverPlayerIdx === -1) {
      if (!quiet) alert(`Игрок ${offer.receiverPlayerName} больше не находится в клубе ${receiverTeam.name}.`);
      return false;
    }

    const playerB = receiverPlayers[receiverPlayerIdx];
    let playerA: any = null;
    if (offer.senderPlayerId !== 'skip') {
      if (senderPlayerIdx === -1) {
        if (!quiet) alert(`Игрок ${offer.senderPlayerName} больше не находится в клубе ${senderTeam.name}.`);
        return false;
      }
      playerA = senderPlayers[senderPlayerIdx];
    }

    // Perform swap in rosters
    const updatedSenderPlayers = [...senderPlayers];
    const updatedReceiverPlayers = [...receiverPlayers];

    if (offer.senderPlayerId !== 'skip' && playerA) {
      updatedSenderPlayers[senderPlayerIdx] = playerB;
      updatedReceiverPlayers[receiverPlayerIdx] = playerA;
    } else {
      updatedSenderPlayers.push(playerB);
      updatedReceiverPlayers.splice(receiverPlayerIdx, 1);
    }

    const newSenderBudget = Math.max(0, senderBudget - surcharge);
    const newReceiverBudget = receiverBudget + surcharge;

    // Update team calculations
    const updatedSenderTeam = {
      ...senderTeam,
      players: updatedSenderPlayers,
      budget: newSenderBudget,
      totalValRating: updatedSenderPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0)
    };

    const updatedReceiverTeam = {
      ...receiverTeam,
      players: updatedReceiverPlayers,
      budget: newReceiverBudget,
      totalValRating: updatedReceiverPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0)
    };

    // Update local teams array
    teamsArr = teamsArr.map((t: any) => {
      if (t.id === senderTeam.id) return updatedSenderTeam;
      if (t.id === receiverTeam.id) return updatedReceiverTeam;
      return t;
    });

    // Update manager budgets in tgUsers array
    if (senderManager || receiverManager) {
      tgUsersArr = tgUsersArr.map((u: any) => {
        if (senderManager && u.id === senderManager.id) return { ...u, money: newSenderBudget };
        if (receiverManager && u.id === receiverManager.id) return { ...u, money: newReceiverBudget };
        return u;
      });
    }

    // Update standalone players
    playersArr = playersArr.map((p: any) => {
      if (p.id === playerB.id) return { ...p, team: senderTeam.name, teamId: senderTeam.id };
      if (playerA && p.id === playerA.id) return { ...p, team: receiverTeam.name, teamId: receiverTeam.id };
      return p;
    });

    // Update Firestore
    try {
      await updateDoc(doc(db, 'teams', senderTeam.id), {
        players: updatedSenderPlayers,
        budget: newSenderBudget,
        totalValRating: updatedSenderTeam.totalValRating
      });
      await updateDoc(doc(db, 'teams', receiverTeam.id), {
        players: updatedReceiverPlayers,
        budget: newReceiverBudget,
        totalValRating: updatedReceiverTeam.totalValRating
      });
      if (senderManager) await updateDoc(doc(db, 'tgUsers', senderManager.id), { money: newSenderBudget });
      if (receiverManager) await updateDoc(doc(db, 'tgUsers', receiverManager.id), { money: newReceiverBudget });
      await updateDoc(doc(db, 'swapOffers', offer.id), { status: 'accepted' });
    } catch (e) {
      console.warn("Firestore write warning:", e);
    }

    // Save to LocalStorage
    safeLocalStorageSet(`teams_${user.uid}`, teamsArr);
    safeLocalStorageSet(`tgUsers_${user.uid}`, tgUsersArr);
    safeLocalStorageSet(`players_${user.uid}`, playersArr);

    swapOffersArr = swapOffersArr.map((o: any) => o.id === offer.id ? { ...o, status: 'accepted' } : o);
    safeLocalStorageSet(`swapOffers_${user.uid}`, swapOffersArr);

    // Sync cache endpoint
    fetch('/api/sync-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        teams: teamsArr,
        tgUsers: tgUsersArr,
        players: playersArr,
        swapOffers: swapOffersArr
      })
    }).catch(() => {});

    // Notify Telegram managers if bot token exists
    const settingsStr = localStorage.getItem(`settings_${user.uid}`);
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        if (settings.botToken) {
          const msgText = `⚡ *ТРАНСФЕР ОДОБРЕН И ПРОВЕДЕН* ⚡\n\n` +
            `Администратор подтвердил трансфер между *${senderTeam.name}* и *${receiverTeam.name}*!\n\n` +
            `• Переход: *${playerB.nickname || playerB.name}* ➡️ *${senderTeam.name}*\n` +
            (playerA ? `• Переход: *${playerA.nickname || playerA.name}* ➡️ *${receiverTeam.name}*\n` : '') +
            (surcharge > 0 ? `• Доплата: *$${surcharge.toLocaleString()}*\n` : '') +
            `\nНовый баланс ${senderTeam.name}: *$${newSenderBudget.toLocaleString()}*\nНовый баланс ${receiverTeam.name}: *$${newReceiverBudget.toLocaleString()}*`;

          if (senderManager?.chatId) {
            fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId: senderManager.chatId, text: msgText, parse_mode: 'Markdown' })
            }).catch(() => {});
          }
          if (receiverManager?.chatId && receiverManager.chatId !== senderManager?.chatId) {
            fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId: receiverManager.chatId, text: msgText, parse_mode: 'Markdown' })
            }).catch(() => {});
          }
        }
      } catch (e) {}
    }

    return true;
  };

  // Execute single transfer from UI
  const handleSingleTransferExecution = async (offer: any) => {
    setExecutingTransferId(offer.id);
    const ok = await executeTransfer(offer);
    setExecutingTransferId(null);
    if (ok) {
      setStatusMsg({ type: 'success', text: `Трансфер между ${offer.senderTeamName} и ${offer.receiverTeamName} успешно проведен!` });
      fetchData();
      window.dispatchEvent(new Event('db-user-updated'));
      window.dispatchEvent(new Event('teams-updated'));
    } else {
      setStatusMsg({ type: 'error', text: 'Не удалось провести трансфер. Проверьте составы и бюджеты.' });
    }
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Reject transfer
  const handleRejectTransfer = async (offer: any) => {
    try {
      await updateDoc(doc(db, 'swapOffers', offer.id), { status: 'rejected' });
    } catch (e) {}

    const localSwaps = JSON.parse(localStorage.getItem(`swapOffers_${user.uid}`) || '[]');
    const updated = localSwaps.map((o: any) => o.id === offer.id ? { ...o, status: 'rejected' } : o);
    safeLocalStorageSet(`swapOffers_${user.uid}`, updated);

    setStatusMsg({ type: 'success', text: 'Трансфер отклонен' });
    fetchData();
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Execute all pending transfers
  const handleExecuteAllTransfers = async () => {
    const pendingList = swapOffersList.filter(o => o.status === 'pending');
    if (pendingList.length === 0) {
      alert("Нет активных ожидающих трансферов для проведения.");
      return;
    }

    if (!window.confirm(`Вы уверены, что хотите применить ВСЕ ожидающие трансферы (${pendingList.length} шт.)?\n\nВсе игроки моментально сменят составы, а финансовые средства будут зачислены/списаны в боте и на сайте.`)) {
      return;
    }

    setExecutingAll(true);
    let count = 0;
    for (const offer of pendingList) {
      const ok = await executeTransfer(offer, true);
      if (ok) count++;
    }
    setExecutingAll(false);

    setStatusMsg({ type: 'success', text: `🚀 Успешно проведено трансферов: ${count} из ${pendingList.length}! Игроки перешли в составы, деньги зачислены.` });
    fetchData();
    window.dispatchEvent(new Event('db-user-updated'));
    window.dispatchEvent(new Event('teams-updated'));
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const filteredUsers = tgUsersList.filter(u => {
    const q = searchQuery.toLowerCase();
    return (u.username || '').toLowerCase().includes(q) || (u.firstName || '').toLowerCase().includes(q);
  });

  const pendingOffersCount = swapOffersList.filter(o => o.status === 'pending').length;

  const filteredTransfers = swapOffersList.filter(o => {
    if (transferFilter !== 'all' && o.status !== transferFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (o.senderTeamName || '').toLowerCase().includes(q) ||
           (o.receiverTeamName || '').toLowerCase().includes(q) ||
           (o.senderPlayerName || '').toLowerCase().includes(q) ||
           (o.receiverPlayerName || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 rounded-2xl p-8 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 uppercase tracking-widest flex items-center gap-3">
              <User className="text-blue-400 w-8 h-8" />
              База Telegram Бота
            </h1>
            <p className="text-white/60 text-sm mt-2 font-medium">Управление пользователями, привязкой команд, фин. балансом и автоматическими трансферами</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchData}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-xl transition-all"
              title="Обновить данные"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {pendingOffersCount > 0 && (
              <button
                onClick={handleExecuteAllTransfers}
                disabled={executingAll}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-900/30 border border-emerald-400/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-5 h-5 text-yellow-300 animate-bounce" />
                {executingAll ? 'Проведение...' : `Применить все трансферы (${pendingOffersCount})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Header Navigation */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3.5 rounded-t-2xl font-black uppercase text-xs tracking-wider flex items-center gap-2.5 transition-all border-t border-x ${
            activeTab === 'users'
              ? 'bg-[#12121a] border-white/10 text-blue-400 border-b-[#12121a] -mb-px'
              : 'bg-black/30 border-transparent text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <User className="w-4 h-4" />
          Пользователи Бота ({tgUsersList.length})
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-6 py-3.5 rounded-t-2xl font-black uppercase text-xs tracking-wider flex items-center gap-2.5 transition-all border-t border-x ${
            activeTab === 'transfers'
              ? 'bg-[#12121a] border-white/10 text-purple-400 border-b-[#12121a] -mb-px'
              : 'bg-black/30 border-transparent text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Трансферы ТГ ({swapOffersList.length})
          {pendingOffersCount > 0 && (
            <span className="px-2 py-0.5 bg-yellow-500 text-black rounded-full font-black text-[10px] animate-pulse">
              {pendingOffersCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input 
                type="text" 
                placeholder="Поиск пользователей по нику или имени..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-white/40 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" /> Загрузка данных...
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-white/40 font-bold uppercase tracking-wider">
                  Пользователи не найдены
                </div>
              ) : (
                filteredUsers.map(u => {
                  const team = localTeams.find((t: any) => t.id === u.teamId);
                  const teamBudget = team?.budget !== undefined ? Number(team.budget) : (Number(u.money) || 0);

                  return (
                    <div key={u.id} className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30 shrink-0">
                          <User className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-lg">
                            {u.firstName} {u.lastName} <span className="text-white/40 text-sm">@{u.username}</span>
                          </div>
                          <div className="text-xs font-bold uppercase tracking-wider mt-1 text-white/60">
                            Chat ID: {u.chatId} • Статус: <span className={u.teamId ? 'text-green-400' : 'text-yellow-500'}>{u.status || 'Свободный агент'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <span className="text-xs text-emerald-400/70 uppercase font-black">Бюджет:</span>
                          <span className="text-emerald-400 font-mono font-black text-sm">$ {teamBudget.toLocaleString()}</span>
                          <button 
                            onClick={() => { setMoneyModalUser(u); setMoneyAmount(''); setMoneyAction('add'); }} 
                            className="ml-2 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded font-bold text-xs uppercase transition-colors flex items-center gap-1"
                            title="Выдать / забрать деньги"
                          >
                            <Coins className="w-3.5 h-3.5" /> Изменить
                          </button>
                        </div>

                        {u.teamId ? (
                          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                            <TeamLogo teamName={u.teamName} sizeClassName="w-6 h-6" />
                            <span className="font-black uppercase text-sm text-white">{u.teamName}</span>
                            <button onClick={() => setConfirmRemoveUser(u)} className="ml-2 p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition-colors" title="Снять с должности">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setSelectedTgUser(u)} className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors border border-blue-500/30">
                            <UserPlus className="w-4 h-4" />
                            Назначить команду
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRANSFERS DEPARTMENT */}
      {activeTab === 'transfers' && (
        <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
          {/* Header Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-6">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 overflow-x-auto">
              <button
                onClick={() => setTransferFilter('all')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap ${
                  transferFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                Все ({swapOffersList.length})
              </button>
              <button
                onClick={() => setTransferFilter('pending')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  transferFilter === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-white/40 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Ожидают ({swapOffersList.filter(o => o.status === 'pending').length})
              </button>
              <button
                onClick={() => setTransferFilter('accepted')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  transferFilter === 'accepted' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-white/40 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Проведены ({swapOffersList.filter(o => o.status === 'accepted').length})
              </button>
              <button
                onClick={() => setTransferFilter('rejected')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  transferFilter === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-white/40 hover:text-white'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" /> Отклонены ({swapOffersList.filter(o => o.status === 'rejected').length})
              </button>
            </div>

            {/* Action execute all button */}
            {pendingOffersCount > 0 && (
              <button
                onClick={handleExecuteAllTransfers}
                disabled={executingAll}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 border border-emerald-400/30 transition-all shrink-0 self-start lg:self-auto disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-yellow-300" />
                {executingAll ? 'Проведение...' : `Применить все трансферы (${pendingOffersCount})`}
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Поиск по названию команды или имени игрока..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* List of Transfers */}
          {loading ? (
            <div className="text-center py-12 text-white/40 font-bold uppercase tracking-wider">Загрузка трансферов...</div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-16 text-white/40 font-bold uppercase tracking-wider border border-dashed border-white/10 rounded-2xl">
              Трансферные предложения не найдены
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTransfers.map((offer) => {
                const isPending = offer.status === 'pending';
                const isAccepted = offer.status === 'accepted';
                const isRejected = offer.status === 'rejected';

                return (
                  <div 
                    key={offer.id} 
                    className={`border rounded-2xl p-6 transition-all relative overflow-hidden ${
                      isPending ? 'bg-black/40 border-yellow-500/30 hover:border-yellow-500/60' :
                      isAccepted ? 'bg-emerald-950/20 border-emerald-500/20' :
                      'bg-black/20 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      {/* Left side: Teams & Exchange details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1 ${
                            isPending ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            isAccepted ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {isPending && <Clock className="w-3 h-3" />}
                            {isAccepted && <CheckCircle2 className="w-3 h-3" />}
                            {isRejected && <XCircle className="w-3 h-3" />}
                            {isPending ? 'Ожидает одобрения' : isAccepted ? 'Проведен (Принят)' : 'Отклонен'}
                          </span>

                          {offer.createdAt && (
                            <span className="text-white/30 text-xs font-mono">
                              {new Date(offer.createdAt).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                        </div>

                        {/* Teams Matchup Header */}
                        <div className="flex items-center gap-4 text-white">
                          <div className="flex items-center gap-2">
                            <TeamLogo teamName={offer.senderTeamName} sizeClassName="w-7 h-7" />
                            <span className="font-black text-lg uppercase tracking-wide">{offer.senderTeamName}</span>
                          </div>

                          <ArrowRightLeft className="w-5 h-5 text-purple-400 shrink-0" />

                          <div className="flex items-center gap-2">
                            <TeamLogo teamName={offer.receiverTeamName} sizeClassName="w-7 h-7" />
                            <span className="font-black text-lg uppercase tracking-wide">{offer.receiverTeamName}</span>
                          </div>
                        </div>

                        {/* Players Involved */}
                        <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-1.5 text-sm">
                          <div className="flex items-center justify-between text-white/80">
                            <span>Игрок из {offer.receiverTeamName}:</span>
                            <span className="font-black text-emerald-400">{offer.receiverPlayerName}</span>
                          </div>
                          {offer.senderPlayerId !== 'skip' && (
                            <div className="flex items-center justify-between text-white/80">
                              <span>Игрок из {offer.senderTeamName}:</span>
                              <span className="font-black text-blue-400">{offer.senderPlayerName}</span>
                            </div>
                          )}
                          {offer.surcharge > 0 && (
                            <div className="flex items-center justify-between text-white/80 pt-1 border-t border-white/5">
                              <span>Доплата от {offer.senderTeamName}:</span>
                              <span className="font-mono font-black text-yellow-400">$ {(offer.surcharge || 0).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Action Buttons */}
                      <div className="flex flex-col sm:flex-row md:flex-col items-stretch justify-center gap-3 shrink-0">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleSingleTransferExecution(offer)}
                              disabled={executingTransferId === offer.id}
                              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-900/30 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
                            >
                              <Zap className="w-4 h-4 text-yellow-300" />
                              {executingTransferId === offer.id ? 'Проведение...' : 'Провести трансфер'}
                            </button>

                            <button
                              onClick={() => handleRejectTransfer(offer)}
                              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs uppercase tracking-wider rounded-xl border border-red-500/20 transition-all text-center"
                            >
                              Отклонить
                            </button>
                          </>
                        ) : isAccepted ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 font-black text-xs uppercase tracking-wider rounded-xl border border-green-500/20">
                            <Check className="w-4 h-4" /> Игроки перешли
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 font-bold text-xs uppercase tracking-wider rounded-xl border border-red-500/20">
                            Отклонено
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ASSIGN TEAM MODAL */}
      {selectedTgUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-black uppercase tracking-wider text-white">Назначить команду</h3>
              <p className="text-white/50 text-sm mt-1">@{selectedTgUser.username}</p>
            </div>
            
            <form onSubmit={handleAssignTeam} className="p-6 space-y-6">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Выберите команду</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">-- Выберите команду --</option>
                  {localTeams.filter((t: any) => !tgUsersList.some(u => u.teamId === t.id)).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.game === 'cs2' ? 'CS2' : 'Standoff 2'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Роль</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Менеджер (Лидер)">Менеджер (Лидер)</option>
                  <option value="Тренер">Тренер</option>
                  <option value="Игрок">Игрок</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSelectedTgUser(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all">Отмена</button>
                <button type="submit" disabled={!selectedTeamId} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50">Назначить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM REMOVE MODAL */}
      {confirmRemoveUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-black text-red-500 uppercase tracking-wider">ВНИМАНИЕ</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-white text-sm">Вы собираетесь СНЯТЬ команду у <strong>@{confirmRemoveUser.username}</strong>.</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setConfirmRemoveUser(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all">Отмена</button>
                <button onClick={() => handleRemoveTeam(confirmRemoveUser)} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all">Снять</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MONEY MODAL */}
      {moneyModalUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                💰 Изменение бюджета
              </h3>
              <p className="text-white/60 text-sm mt-1">
                Пользователь: <span className="text-white font-bold">@{moneyModalUser.username}</span> ({moneyModalUser.teamName || 'Без команды'})
              </p>
            </div>

            <form onSubmit={handleUpdateMoney} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Действие</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMoneyAction('add')}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase transition-all border ${moneyAction === 'add' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/40 border-white/10 text-white/60'}`}
                  >
                    ➕ Начислить
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoneyAction('subtract')}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase transition-all border ${moneyAction === 'subtract' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black/40 border-white/10 text-white/60'}`}
                  >
                    ➖ Списать
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoneyAction('set')}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase transition-all border ${moneyAction === 'set' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/40 border-white/10 text-white/60'}`}
                  >
                    ✏️ Установить
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                  Сумма ($)
                </label>
                <input
                  type="number"
                  placeholder="Например: 50000"
                  value={moneyAmount}
                  onChange={(e) => setMoneyAmount(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono font-bold text-lg focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              {/* Fast presets */}
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Быстрый выбор</label>
                <div className="flex flex-wrap gap-2">
                  {[10000, 25000, 50000, 100000, 250000, 500000, 1000000, 1500000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMoneyAmount(String(val))}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-xs font-mono font-bold border border-white/10 transition-colors"
                    >
                      ${val.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setMoneyModalUser(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30"
                >
                  Применить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS NOTIFICATION TOAST */}
      {statusMsg && (
        <div className={`fixed bottom-6 right-6 px-6 py-3.5 rounded-xl font-bold text-sm shadow-2xl z-50 border backdrop-blur-md ${statusMsg.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-200' : 'bg-red-900/90 border-red-500/50 text-red-200'}`}>
          {statusMsg.text}
        </div>
      )}
    </div>
  );
}
