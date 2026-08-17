import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from '../firebase';
import { Newspaper, Users, Plus, X, Image as ImageIcon, Search, LayoutTemplate, Trash2, ArrowRight, Download, User } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import TeamLogo from './TeamLogo';
import PlayerAvatar from './PlayerAvatar';
import { safeLocalStorageSet } from '../lib/utils';

export default function News({ user }: { user: any }) {
  const [news, setNews] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);

  const compressImage = (base64Str: string, maxWidth = 1920, maxHeight = 1080): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'custom' | 'roster_announcement' | 'player_transfer' | 'welcome_player' | 'tournament_invites'>('welcome_player');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [newImage, setNewImage] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [selectedBg, setSelectedBg] = useState('bg-gradient-to-br from-[#1a1a24] to-[#12121a]');
  const [fullViewNews, setFullViewNews] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const isLocal = user.isLocalDemo || !db || db === 'localdb';
      
      const localPlayers = JSON.parse(localStorage.getItem(`players_${user.uid}`) || '[]');
      const localTeams = JSON.parse(localStorage.getItem(`teams_${user.uid}`) || '[]');
      const localNews = JSON.parse(localStorage.getItem(`news_${user.uid}`) || '[]');
      
      setPlayers(localPlayers);
      setTeams(localTeams);
      setNews(localNews);

      if (!isLocal) {
        try {
          const qPlayers = query(collection(db, 'players'), where('channelId', '==', user.uid));
          const qsPlayers = await getDocs(qPlayers);
          const pList = qsPlayers.docs.map(d => ({id: d.id, ...d.data()}));
          setPlayers(pList);

          const qTeams = query(collection(db, 'teams'), where('channelId', '==', user.uid));
          const qsTeams = await getDocs(qTeams);
          const tList = qsTeams.docs.map(d => ({id: d.id, ...d.data()}));
          setTeams(tList);

          const qNews = query(collection(db, 'news'), where('channelId', '==', user.uid));
          const qsNews = await getDocs(qNews);
          const nList = qsNews.docs.map(d => ({id: d.id, ...d.data()}));
          setNews(nList.sort((a, b) => b.createdAt - a.createdAt));
        } catch(e) {
          console.warn("Fallback to local db for News data fetching");
        }
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNews = async () => {
    if (newType === 'custom' && !newTitle.trim()) {
      setError("Введите заголовок");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (newType === 'custom' && !newImage.trim()) {
      setError("Введите ссылку на изображение");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if ((newType === 'player_transfer' || newType === 'welcome_player') && (!selectedTeamId || !selectedPlayerId)) {
      setError("Выберите игрока и команду");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (newType === 'roster_announcement' && !selectedTeamId) {
      setError("Выберите команду");
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (newType === 'tournament_invites' && selectedTeamIds.length === 0) {
      setError("Выберите хотя бы одну команду");
      setTimeout(() => setError(''), 3000);
      return;
    }

    let finalTitle = newTitle.trim();
    if (!finalTitle && newType !== 'custom') {
      const t = teams.find(team => team.id === selectedTeamId);
      const p = players.find(player => player.id === selectedPlayerId);
      if (newType === 'welcome_player' && p) finalTitle = `WELCOME ${p.nickname}`;
      if (newType === 'roster_announcement' && t) finalTitle = `${t.name} ROSTER`;
      if (newType === 'player_transfer' && p && t) finalTitle = `${p.nickname} JOINS ${t.name}`;
      if (newType === 'tournament_invites') finalTitle = `ПРИГЛАШЕННЫЕ НА ТУРНИР`;
    }

    const newsItem = {
      title: finalTitle,
      type: newType,
      imageUrl: newImage,
      teamId: selectedTeamId,
      playerId: selectedPlayerId,
      teamIds: selectedTeamIds,
      createdAt: Date.now(),
      background: selectedBg,
      channelId: user.uid
    };


    try {
      const isLocal = user.isLocalDemo || !db || db === 'localdb';
      if (isLocal) {
        throw new Error("Local demo mode");
      }
      const docRef = await addDoc(collection(db, 'news'), newsItem);
      setNews(prev => [{ ...newsItem, id: docRef.id }, ...prev]);
      setShowAddModal(false);
      setNewTitle('');
      setNewImage('');
      setSelectedTeamId('');
      setSelectedPlayerId('');
      setSelectedTeamIds([]);
      } catch(e) {
      console.warn("Fallback to local save for news", e);
      const itemWithId = { ...newsItem, id: Date.now().toString() };
      setNews(prev => {
        const updated = [itemWithId, ...prev];
        
        // Use a timeout to run side effects outside the render phase
        setTimeout(() => {
          safeLocalStorageSet(`news_${user.uid}`, updated);
        }, 0);
        
        return updated;
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewImage('');
      setSelectedTeamId('');
      setSelectedPlayerId('');
      setSelectedTeamIds([]);
      }

  };


  const handleDownload = async (id: string, title: string) => {
    const node = document.getElementById(`news-banner-${id}`);
    if (!node) return;
    try {
      const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let dataUrl: string;
      try {
        dataUrl = await htmlToImage.toPng(node, { 
          backgroundColor: '#12121a',
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          cacheBust: true,
          style: { borderRadius: '0' }
        });
      } catch (e) {
        dataUrl = await htmlToImage.toPng(node, { 
          backgroundColor: '#12121a',
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          style: { borderRadius: '0' }
        });
      }
      const link = document.createElement('a');
      link.download = `news_${title.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      // alert removed
    }
  };


  const handleDelete = async (id: string) => {
    // window.confirm is restricted in iframes
    try {
      const isLocal = user.isLocalDemo || !db || db === 'localdb';
      if (isLocal) {
        throw new Error("Local demo mode");
      }
      await deleteDoc(doc(db, 'news', id));
      setNews(prev => prev.filter(n => n.id !== id));
    } catch(e) {
      console.warn("Fallback to local delete for news", e);
      setNews(prev => {
        const updated = prev.filter(n => n.id !== id);
        setTimeout(() => {
          try {
            localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
          } catch(e) {}
        }, 0);
        return updated;
      });
    }
  };


  const renderNewsBanner = (n: any) => {
    const team = teams.find(t => t.id === n.teamId);
    const player = players.find(p => p.id === n.playerId);

    if (n.type === 'custom') {
      return (
        <div id={`news-banner-${n.id}`} className="w-full h-64 rounded-xl overflow-hidden relative">
          <img src={n.imageUrl} alt="News" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
            <h3 className="text-2xl font-black text-white">{n.title}</h3>
          </div>
        </div>
      );
    }


        if (n.type === 'tournament_invites') {
      const invTeams = (n.teamIds || []).map((id: string) => teams.find(t => t.id === id)).filter(Boolean);
      return (
        <div id={`news-banner-${n.id}`} className={`w-full h-auto min-h-64 rounded-xl overflow-hidden relative border border-white/10 p-6 flex flex-col justify-center items-center ${!n.background || n.background.startsWith('http') || n.background.startsWith('data:') ? 'bg-gradient-to-br from-[#1a1a24] to-[#12121a]' : n.background}`} style={n.background && (n.background.startsWith('http') || n.background.startsWith('data:')) ? { backgroundImage: `url(${n.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          <div className="absolute inset-0 bg-black/40 pointer-events-none mix-blend-overlay"></div>
          
          <div className="z-10 flex flex-col items-center animate-fade-in w-full">
            <div className="text-white font-black uppercase tracking-[0.2em] text-2xl mb-8 text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
              {n.title || "ПРИГЛАШЕННЫЕ НА ТУРНИР"}
            </div>
            
            <div className={`flex flex-wrap justify-center gap-x-3 gap-y-4 w-full max-w-2xl px-8 ${invTeams.length > 8 ? 'mt-4' : 'mt-8'}`}>
              {invTeams.map((t: any, i: number) => (
                <div key={i} className="flex flex-col items-center gap-2 w-16 sm:w-20">
                  <div className={`rounded-full bg-black/50 border-2 border-white/20 flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.8)] relative ${invTeams.length > 8 ? 'w-12 h-12 p-1.5' : 'w-16 h-16 p-2'}`}>
                    <TeamLogo game={user?.game || 'cs2'} teamName={t?.name || 'Unknown'} sizeClassName={invTeams.length > 8 ? 'w-8 h-8' : 'w-10 h-10'} logoUrl={t?.logoUrl} />
                  </div>
                  <span className={`text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-center tracking-wider uppercase leading-tight ${invTeams.length > 8 ? 'text-[9px] max-w-full truncate' : 'text-[10px]'}`}>{t?.name || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (n.type === 'welcome_player' && team && player) {
      return (
        <div id={`news-banner-${n.id}`} className={`w-full h-auto min-h-64 rounded-xl overflow-hidden relative border border-white/10 p-6 flex flex-col justify-center items-center ${!n.background || n.background.startsWith('http') || n.background.startsWith('data:') ? 'bg-gradient-to-br from-[#1a1a24] to-[#12121a]' : n.background}`} style={n.background && (n.background.startsWith('http') || n.background.startsWith('data:')) ? { backgroundImage: `url(${n.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          <div className="absolute inset-0 bg-black/20 pointer-events-none mix-blend-overlay"></div>
          
          <div className="z-10 flex flex-col items-center animate-fade-in">
            <div className="text-white/60 font-bold uppercase tracking-[0.3em] text-xs mb-6 text-center shadow-black drop-shadow-md">
              WELCOME TO {team.name}
            </div>
            
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/10 overflow-hidden relative shadow-2xl bg-[#12121a] flex items-center justify-center">
                 <PlayerAvatar playerName={player.nickname} avatarUrl={player.avatarUrl} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-[#1a1a24] rounded-full border-4 border-[#1a1a24] flex items-center justify-center shadow-lg">
                 <TeamLogo teamName={team.name} logoUrl={team.logoUrl} className="w-10 h-10" />
              </div>
            </div>

            <h3 className="text-3xl md:text-5xl font-black text-white text-center tracking-tight shadow-black drop-shadow-lg">
              {n.title}
            </h3>
          </div>
        </div>
      );
    }
    if (n.type === 'roster_announcement' && team) {
      return (
        <div id={`news-banner-${n.id}`} className={`w-full h-auto min-h-64 rounded-xl overflow-hidden relative border border-white/10 p-6 flex flex-col ${!n.background || n.background.startsWith('http') || n.background.startsWith('data:') ? 'bg-gradient-to-br from-[#1a1a24] to-[#12121a]' : n.background}`} style={n.background && (n.background.startsWith('http') || n.background.startsWith('data:')) ? { backgroundImage: `url(${n.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          <div className="absolute -right-20 -top-20 opacity-5 blur-2xl pointer-events-none">
             <TeamLogo teamName={team.name} logoUrl={team.logoUrl} className="w-96 h-96 grayscale" />
          </div>
          <div className="flex items-center gap-4 mb-6 z-10">
            <TeamLogo teamName={team.name} logoUrl={team.logoUrl} className="w-16 h-16 drop-shadow-lg" />
            <div>
              <div className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-1">Анонс состава</div>
              <h3 className="text-2xl font-black text-white">{n.title}</h3>
            </div>
          </div>
          <div className="flex gap-4 items-center justify-center flex-wrap mt-auto z-10 bg-black/30 p-4 rounded-xl border border-white/5">
            {team.players && team.players.map((p: any, idx: number) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <PlayerAvatar playerName={p.nickname} avatarUrl={p.avatarUrl} className="w-12 h-12" />
                <span className="text-xs font-bold text-white">{p.nickname}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (n.type === 'player_transfer' && team && player) {
      return (
        <div id={`news-banner-${n.id}`} className={`w-full h-64 rounded-xl overflow-hidden relative border border-blue-500/20 p-6 flex flex-col justify-center items-center ${!n.background || n.background.startsWith('http') || n.background.startsWith('data:') ? 'bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24]' : n.background}`} style={n.background && (n.background.startsWith('http') || n.background.startsWith('data:')) ? { backgroundImage: `url(${n.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          <div className="text-blue-400 font-bold uppercase tracking-widest text-xs absolute top-6 left-6">Трансфер</div>
          <h3 className="text-xl font-black text-white absolute bottom-6 text-center w-full">{n.title}</h3>
          
          <div className="flex items-center gap-8 z-10">
            <div className="flex flex-col items-center gap-3">
               <PlayerAvatar playerName={player.nickname} avatarUrl={player.avatarUrl} className="w-24 h-24 shadow-2xl shadow-blue-500/20 border-2 border-blue-500/50" />
               <span className="text-lg font-black text-white">{player.nickname}</span>
            </div>
            <ArrowRight className="w-8 h-8 text-blue-500/50" />
            <div className="flex flex-col items-center gap-3">
               <TeamLogo teamName={team.name} logoUrl={team.logoUrl} className="w-24 h-24 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
               <span className="text-lg font-black text-white">{team.name}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-32 rounded-xl bg-white/5 flex items-center justify-center p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white">{n.title}</h3>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-blue-500" />
            ЛЕНТА НОВОСТЕЙ
          </h1>
          <p className="text-white/40 mt-1">Публикуйте анонсы, трансферы и важные события</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          СОЗДАТЬ НОВОСТЬ
        </button>
      </div>

      {loading ? (
        <div className="text-blue-400/50 p-8 text-center font-bold animate-pulse">Загрузка...</div>
      ) : news.length === 0 ? (
        <div className="text-white/30 p-12 text-center font-bold bg-[#12121a] rounded-2xl border border-white/5">
          <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
          Новостей пока нет
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {news.map(n => (
            <div key={n.id} className="relative group animate-fade-in cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all rounded-xl" onClick={() => setFullViewNews(n)}>
               {renderNewsBanner(n)}
                              <button 
                 onClick={(e) => { e.stopPropagation(); handleDownload(n.id, n.title); }}
                 className="absolute top-4 right-14 w-8 h-8 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg items-center justify-center hidden group-hover:flex transition-all z-20"
                 title="Скачать скриншот"
               >
                 <Download className="w-4 h-4" />
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                 className="absolute top-4 right-4 w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-lg items-center justify-center hidden group-hover:flex transition-all z-20"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
               <div className="absolute bottom-4 right-4 text-[10px] text-white/40 font-bold px-2 py-1 bg-black/40 rounded">
                 {new Date(n.createdAt).toLocaleDateString('ru-RU', {day: '2-digit', month: 'short', year: 'numeric'})}
               </div>
            </div>
          ))}
        </div>
      )}


      {fullViewNews && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setFullViewNews(null)}>
          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFullViewNews(null)} className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
            <div className="shadow-2xl shadow-blue-500/10 rounded-xl overflow-hidden">
               {renderNewsBanner(fullViewNews)}
            </div>
            <div className="mt-6 flex justify-center">
              <button 
                 onClick={() => handleDownload(fullViewNews.id, fullViewNews.title)}
                 className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center gap-2"
              >
                 <Download className="w-5 h-5" />
                 СКАЧАТЬ ИЗОБРАЖЕНИЕ
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-blue-400" />
                СОЗДАНИЕ НОВОСТИ
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            

            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/50 uppercase">Заголовок новости {newType !== 'custom' && "(Опционально)"}</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Например: WELCOME S1MPLE!"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/50 uppercase">Формат / Шаблон</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <button
                    onClick={() => setNewType('welcome_player')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'welcome_player' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <User className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Приветствие игрока</span>
                  </button>
                  <button
                    onClick={() => setNewType('roster_announcement')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'roster_announcement' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <Users className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Анонс состава</span>
                  </button>
                  <button
                    onClick={() => setNewType('player_transfer')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'player_transfer' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <ArrowRight className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Трансфер игрока</span>
                  </button>
                  <button
                    onClick={() => setNewType('custom')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'custom' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Свой скриншот</span>
                  </button>
                  <button
                    onClick={() => setNewType('tournament_invites')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'tournament_invites' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <LayoutTemplate className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Инвайты</span>
                  </button>
                </div>
              </div>

              {newType === 'custom' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase">Изображение</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newImage.startsWith('data:') ? '' : newImage}
                      onChange={e => setNewImage(e.target.value)}
                      placeholder={newImage.startsWith('data:') ? "Загружен локальный файл" : "Ссылка (или загрузите файл ->)"}
                      className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <label className="cursor-pointer flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-4 transition-colors" title="Загрузить файл">
                      <ImageIcon className="w-5 h-5 text-white/70" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await fetch('/api/upload', { method: 'POST', body: formData });
                              const data = await res.json();
                              if (data.url) setNewImage(data.url);
                            } catch(e) {}
                          }
                        }} 
                      />
                    </label>
                  </div>
                  {newImage && (
                     <div className="mt-4 rounded-xl overflow-hidden h-40 border border-white/10">
                       <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                     </div>
                  )}
                </div>
              )}

              {(newType === 'welcome_player' || newType === 'roster_announcement' || newType === 'player_transfer' || newType === 'tournament_invites') && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase">Фон карточки</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      "bg-gradient-to-br from-[#1a1a24] to-[#12121a]",
                      "bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24]",
                      "bg-[url('https://i.ibb.co/LdvD7pXY/2025-02-27-01-26-28.jpg')]",
                      "bg-gradient-to-r from-purple-900/50 via-black to-blue-900/50",
                      "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-[#0a0a0f]",
                      "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-indigo-950",
                      "bg-gradient-to-br from-green-900/40 to-[#12121a]",
                      "bg-gradient-to-bl from-orange-900/40 to-black"
                    ].map((bg, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedBg(bg)}
                        className={`h-12 rounded-xl border-2 transition-all ${selectedBg === bg ? 'border-blue-500 scale-105' : 'border-white/10 hover:border-white/30'} ${bg}`}
                      />
                    ))}
                    
                  </div>
                  
                </div>
              )}
              {newType === 'tournament_invites' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase">Выберите команды (до 16)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedTeamIds.map(tid => {
                      const team = teams.find(t => t.id === tid);
                      if (!team) return null;
                      return (
                        <div key={tid} className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-sm">
                          <TeamLogo game={user?.game || 'cs2'} teamName={team.name} logoUrl={team.logoUrl} sizeClassName="w-4 h-4" />
                          <span>{team.name}</span>
                          <button onClick={() => setSelectedTeamIds(prev => prev.filter(id => id !== tid))} className="text-red-400 hover:text-red-300 ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value && !selectedTeamIds.includes(e.target.value) && selectedTeamIds.length < 16) {
                        setSelectedTeamIds(prev => [...prev, e.target.value]);
                      }
                    }}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">-- Добавить команду --</option>
                    {teams.filter(t => !selectedTeamIds.includes(t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {(newType === 'roster_announcement' || newType === 'player_transfer' || newType === 'welcome_player') && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase">
                    Выберите команду
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={e => setSelectedTeamId(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">-- Выберите команду --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(newType === 'player_transfer' || newType === 'welcome_player') && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase">Выберите игрока</label>
                  <select
                    value={selectedPlayerId}
                    onChange={e => setSelectedPlayerId(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">-- Выберите игрока --</option>
                    {players
                      .filter(p => {
                        if (!selectedTeamId) return true;
                        const t = teams.find(team => team.id === selectedTeamId);
                        if (!t || !t.players) return true; // If no players, show all just in case? No, wait.
                        return t.players.some((tp: any) => tp && tp.id === p.id);
                      })
                      .map(p => (
                      <option key={p.id} value={p.id}>{p.nickname}</option>
                    ))}
                  </select>
                </div>
              )}

              {newType === 'roster_announcement' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase flex justify-between">
                    <span>Кастомный состав (необязательно)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedPlayerIds.map(pid => {
                      const player = players.find(p => p.id === pid);
                      if (!player) return null;
                      return (
                        <div key={pid} className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-sm">
                          <PlayerAvatar playerName={player.nickname} avatarUrl={player.avatarUrl} className="w-4 h-4" />
                          <span>{player.nickname}</span>
                          <button onClick={() => setSelectedPlayerIds(prev => prev.filter(id => id !== pid))} className="text-red-400 hover:text-red-300 ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value && !selectedPlayerIds.includes(e.target.value)) {
                        setSelectedPlayerIds(prev => [...prev, e.target.value]);
                      }
                    }}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">-- Добавить игрока в состав --</option>
                    {players.filter(p => !selectedPlayerIds.includes(p.id)).map(p => (
                      <option key={p.id} value={p.id}>{p.nickname}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-white/30">Если не выбрано, будет использован текущий состав команды.</p>
                </div>
              )}
            </div>

            {error && (
              <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm font-bold animate-fade-in flex items-center justify-center">
                {error}
              </div>
            )}
            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-white/50 hover:text-white hover:bg-white/5 transition-all"
              >
                ОТМЕНА
              </button>
              <button
                onClick={handleCreateNews}
                className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-500/20"
              >
                ОПУБЛИКОВАТЬ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
