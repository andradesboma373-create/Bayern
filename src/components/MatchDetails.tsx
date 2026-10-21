import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Download, Trophy, Check, ChevronDown, Database, Image as ImageIcon, Layers } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { RATING_CONFIG } from '../match-logic/config/RatingConfig';
import { RatingSystem } from '../match-logic/systems/RatingSystem';
import { getKdColorClass, getSwingColorClass, formatSwing } from '../lib/utils';
import { getMapImageUrl } from '../utils/mapUtils';

function StatsTable({ teamName, colorClass, stats, totalRounds }: { teamName: string, colorClass: string, borderClass?: string, stats?: any[], totalRounds?: number }) {
  if (!stats || !Array.isArray(stats) || stats.length === 0) {
    return (
      <div className="bg-[#14141d] border border-white/5 rounded-2xl p-5">
        <h3 className={`${colorClass} font-black uppercase tracking-wider mb-4 pb-2 border-b border-white/10`}>{teamName}</h3>
        <p className="text-white/40 text-xs italic py-4">Нет доступной статистики по игрокам</p>
      </div>
    );
  }

  const sortedStats = [...stats].sort((a, b) => {
    const getHltv = (p: any) => {
        let hltv = p?.hltvRating;
        if (!hltv && p?.rating && Number(p.rating) < 10) hltv = p.rating;
        if (!hltv) {
            const breakdown = RatingSystem.calculatePlayerRating(p, p?.totalRounds || totalRounds || 1);
            hltv = breakdown.rating.toFixed(2);
        }
        return parseFloat(hltv || '0');
    };
    const diffHltv = getHltv(b) - getHltv(a);
    if (Math.abs(diffHltv) > 0.001) return diffHltv;
    // Tie-breaker: K-D differential (+/-)
    const diffA = (a?.kills ?? 0) - (a?.deaths ?? 0);
    const diffB = (b?.kills ?? 0) - (b?.deaths ?? 0);
    if (diffB !== diffA) return diffB - diffA;
    // Secondary tie-breaker: Total kills
    return (b?.kills ?? 0) - (a?.kills ?? 0);
  });

  return (
    <div className="bg-[#14141d] border border-white/5 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
        <TeamLogo teamName={teamName.replace(/\s*\(Всего\)/, '')} sizeClassName="w-6 h-6 text-xs" />
        <h3 className={`${colorClass} font-black uppercase tracking-wider text-sm`}>{teamName}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[560px]">
          <thead>
            <tr className="text-white/40 uppercase tracking-wider text-[11px] font-semibold border-b border-white/10">
              <th className="py-2.5 px-3 text-left">ИГРОК</th>
              <th className="py-2.5 px-2 text-center font-bold">K</th>
              <th className="py-2.5 px-2 text-center font-bold">A</th>
              <th className="py-2.5 px-2 text-center font-bold">D</th>
              <th className="py-2.5 px-2 text-center font-bold">DIFF</th>
              <th className="py-2.5 px-2 text-center font-bold">KD</th>
              <th className="py-2.5 px-2 text-center font-bold">KPR</th>
              <th className="py-2.5 px-2 text-center font-bold">DPR</th>
              <th className="py-2.5 px-2 text-center font-bold">ADR</th>
              <th className="py-2.5 px-2 text-center font-bold">IMP</th>
              <th className="py-2.5 px-3 text-right font-bold">RATING</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((p: any, idx: number) => {
              const nickname = p?.nickname || p?.name || `Игрок ${idx + 1}`;
              const kills = p?.kills ?? 0;
              const assists = p?.assists ?? 0;
              const deaths = p?.deaths ?? 0;
              const diff = kills - deaths;
              const rounds = Math.max(1, p?.totalRounds || totalRounds || 1);
              const breakdown = RatingSystem.calculatePlayerRating(p, rounds);
              
              const kd = p?.kd ? Number(p.kd).toFixed(2) : (deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2));
              const kpr = p?.kpr ? Number(p.kpr).toFixed(2) : (kills / rounds).toFixed(2);
              const dpr = p?.dpr ? Number(p.dpr).toFixed(2) : (deaths / rounds).toFixed(2);
              const adr = p?.adr ? Math.round(Number(p.adr)) : Math.round((p?.damage || (kills * 100 + assists * 35)) / rounds);
              const imp = p?.impact ? Number(p.impact).toFixed(2) : breakdown.impact.toFixed(2);
              
              let hltv = p?.hltvRating;
              if (!hltv && p?.rating && Number(p.rating) < 10) hltv = Number(p.rating).toFixed(2);
              if (!hltv) hltv = breakdown.rating.toFixed(2);
              const ratingNum = parseFloat(hltv || '1.00');

              const isTopFragger = idx === 0;

              return (
                <tr 
                  key={idx} 
                  className={`border-b border-white/5 transition-colors hover:bg-white/[0.03] ${isTopFragger ? 'bg-amber-500/[0.04]' : ''}`}
                >
                  <td className={`py-2.5 px-3 font-bold text-sm ${isTopFragger ? 'text-[#ffb300] border-l-2 border-[#ffb300]' : 'text-white'}`}>
                    {nickname}
                  </td>
                  <td className="py-2.5 px-2 text-center font-black text-white text-sm">{kills}</td>
                  <td className="py-2.5 px-2 text-center text-white/70 font-medium text-xs">{assists}</td>
                  <td className="py-2.5 px-2 text-center text-white/70 font-medium text-xs">{deaths}</td>
                  <td className={`py-2.5 px-2 text-center font-bold text-xs ${diff > 0 ? 'text-[#4ade80]' : diff < 0 ? 'text-[#f87171]' : 'text-white/50'}`}>
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className={`py-2.5 px-2 text-center font-bold text-xs ${Number(kd) >= 1.0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                    {kd}
                  </td>
                  <td className="py-2.5 px-2 text-center text-white/70 font-mono text-xs">{kpr}</td>
                  <td className="py-2.5 px-2 text-center text-white/70 font-mono text-xs">{dpr}</td>
                  <td className="py-2.5 px-2 text-center text-white/90 font-mono text-xs font-semibold">{adr}</td>
                  <td className="py-2.5 px-2 text-center text-white/90 font-mono text-xs font-semibold">{imp}</td>
                  <td className={`py-2.5 px-3 text-right font-black text-sm font-mono ${ratingNum >= 1.15 ? 'text-[#4ade80]' : ratingNum >= 1.00 ? 'text-[#facc15]' : 'text-[#f87171]'}`}>
                    {ratingNum.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MatchDetails({ match, onClose }: { match: any, onClose: () => void }) {
  const navigate = useNavigate();
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const t1Name = match?.team1Name || match?.team1?.name || (typeof match?.team1 === 'string' ? match.team1 : '') || 'Команда 1';
  const t2Name = match?.team2Name || match?.team2?.name || (typeof match?.team2 === 'string' ? match.team2 : '') || 'Команда 2';
  const t1Score = match?.team1Score ?? match?.score1 ?? 0;
  const t2Score = match?.team2Score ?? match?.score2 ?? 0;
  const mapsList: any[] = Array.isArray(match?.maps) ? match.maps : [];

  const downloadJson = () => {
    if (!match) return;
    const dataStr = JSON.stringify(match, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `match_${t1Name}_vs_${t2Name}_${Date.now()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    linkElement.remove();
  };

  const downloadPhoto = async () => {
    if (!resultContainerRef.current) return;
    setIsDownloading(true);
    try {
      // Allow DOM to settle with isDownloading state before capture
      await new Promise(r => setTimeout(r, 150));

      const { toPng } = await import('html-to-image');
      const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let imgData: string;
      try {
        imgData = await toPng(resultContainerRef.current, {
          backgroundColor: '#0a0a0f',
          cacheBust: true,
          pixelRatio: 2,
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          style: {
            borderRadius: '1.5rem',
          }
        });
      } catch (retryErr) {
        imgData = await toPng(resultContainerRef.current, {
          backgroundColor: '#0a0a0f',
          pixelRatio: 1.5,
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          style: {
            borderRadius: '1.5rem',
          }
        });
      }
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", imgData);
      downloadAnchorNode.setAttribute("download", `match_${t1Name}_vs_${t2Name}_${Date.now()}.png`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e: any) {
      console.error('Ошибка создания изображения:', e?.message || e);
      alert('Error creating image: ' + (e?.message || e));
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadPdf = async () => {
    if (!resultContainerRef.current) return;
    setIsDownloading(true);
    try {
        const { exportElementToDataUrl } = await import('../lib/exportImage');
        const dataUrl = await exportElementToDataUrl(resultContainerRef.current, {
            backgroundColor: '#0a0a0f',
            pixelRatio: 2.0
        });

        if (dataUrl) {
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF('l', 'px', [resultContainerRef.current.scrollWidth * 0.75, resultContainerRef.current.scrollHeight * 0.75]);
            const width = pdf.internal.pageSize.getWidth();
            const height = pdf.internal.pageSize.getHeight();
            pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
            pdf.save(`match_${t1Name}_vs_${t2Name}_report.pdf`);
        }
    } catch (err) {
        console.error("PDF Export error:", err);
    } finally {
        setIsDownloading(false);
    }
  };

  const downloadBoth = async () => {
    downloadJson();
    await downloadPdf();
  };

  const isBO1 = match?.bo === 1 || match?.bo === '1' || match?.format === 'BO1' || mapsList.length === 1;
  const [selectedResultTab, setSelectedResultTab] = useState<'overall' | number>('overall');

  const selectedMapObj = (selectedResultTab !== 'overall' && mapsList[selectedResultTab as number]) ? mapsList[selectedResultTab as number] : null;
  const activeMapName = selectedMapObj 
    ? (selectedMapObj.mapName || selectedMapObj.name || 'de_inferno') 
    : (mapsList.length > 0 ? (mapsList[0].mapName || mapsList[0].name || 'de_inferno') : '');
  const cleanActiveMapKey = activeMapName ? activeMapName.toLowerCase().replace(/^de_/i, '').replace(/[\s_-]+/g, '') : '';

  const displayT1Score = selectedMapObj ? (selectedMapObj.team1Score ?? selectedMapObj.score1 ?? 0) : (isBO1 && mapsList[0] ? (mapsList[0].team1Score ?? mapsList[0].score1 ?? t1Score) : t1Score);
  const displayT2Score = selectedMapObj ? (selectedMapObj.team2Score ?? selectedMapObj.score2 ?? 0) : (isBO1 && mapsList[0] ? (mapsList[0].team2Score ?? mapsList[0].score2 ?? t2Score) : t2Score);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div ref={resultContainerRef} className={`bg-[#0a0a0f] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/40 sticky top-0 z-10 shrink-0">
          <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-widest">ДЕТАЛИ МАТЧА</h2>
            {!isDownloading && (
              <div className="flex flex-wrap items-center gap-2">
                {match?.tournamentId && (
                  <button 
                    onClick={async () => {
                       try {
                          const { updateBetaTournamentMatchResult, getCanonicalRoomId } = await import('./setka_tourn/storage');
                          const userId = match.userId || 'guest';
                          const roomId = getCanonicalRoomId(userId);
                          updateBetaTournamentMatchResult(
                            roomId,
                            match.tournamentId,
                            t1Name,
                            t2Name,
                            t1Score,
                            t2Score
                          );
                          alert("Результат успешно сохранен в базу турнира!");
                          onClose();
                          navigate(`/tournaments-beta/${match.tournamentId}`);
                       } catch (e) {
                          console.error(e);
                          alert("Ошибка при сохранении");
                       }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs sm:text-sm"
                    title="Сохранить результат в базу турнира"
                  >
                    <Check className="w-4 h-4" />
                    <span>Сохранить</span>
                  </button>
                )}
                <div className="relative group/download">
                  <button className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs sm:text-sm shadow-md">
                    <Download className="w-4 h-4" />
                    <span>Скачать</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                  <div className="absolute top-full right-0 mt-1.5 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover/download:opacity-100 group-hover/download:visible transition-all z-50">
                    <button onClick={downloadPhoto} className="w-full text-left px-4 py-3 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer">
                      <ImageIcon className="w-4 h-4 text-blue-400" /> ФОТО (.PNG)
                    </button>
                    <button onClick={downloadJson} className="w-full text-left px-4 py-3 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5 cursor-pointer">
                      <Database className="w-4 h-4 text-emerald-400" /> ДАННЫЕ (.JSON)
                    </button>
                    <button onClick={downloadPdf} className="w-full text-left px-4 py-3 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5 cursor-pointer">
                      <Layers className="w-4 h-4 text-purple-400" /> ОТЧЕТ (.PDF)
                    </button>
                    <button onClick={downloadBoth} className="w-full text-left px-4 py-3 text-xs font-black text-blue-400 hover:bg-blue-500/10 flex items-center gap-3 transition-colors border-t border-white/10 cursor-pointer">
                      <Check className="w-4 h-4" /> СКАЧАТЬ ОБА
                    </button>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer border border-white/10 text-xs sm:text-sm font-bold"
                  title="Закрыть окно"
                >
                  <X className="w-4 h-4 text-white/70" />
                  <span>НАЗАД</span>
                </button>
              </div>
            )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div 
            className="bg-[#12121a] border border-white/10 shadow-2xl shadow-black/50 rounded-2xl p-8 text-center relative overflow-hidden mb-6"
            style={cleanActiveMapKey ? {
              backgroundImage: `linear-gradient(to bottom, rgba(18,18,26,0.92), rgba(26,26,36,0.98)), url('/maps/${cleanActiveMapKey.replace(/\.(webp|jpg|png)$/i, "")}.webp')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#ff8f00]/2 blur-[100px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/2 blur-[100px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2"></div>
            <div className="flex items-center justify-center gap-6 mb-4 relative z-10">
              <TeamLogo teamName={t1Name} sizeClassName="w-16 h-16 text-2xl" />
              <div>
                <h2 className="text-3xl font-black tracking-widest text-white uppercase">{t1Name} vs {t2Name}</h2>
                <p className="text-sm font-bold text-[#ff8f00] tracking-wider uppercase mt-1 drop-shadow-md">
                  {activeMapName || 'de_inferno'}
                </p>
              </div>
              <TeamLogo teamName={t2Name} sizeClassName="w-16 h-16 text-2xl" />
            </div>
            
            <div className="text-6xl font-black tracking-widest mb-6 relative z-10 drop-shadow-xl">
              <span className={displayT1Score > displayT2Score ? 'text-[#ff8f00] drop-shadow-[0_0_10px_rgba(255,143,0,0.3)]' : 'text-white/50'}>
                {displayT1Score}
              </span>
              <span className="mx-6 text-white/20 text-4xl">:</span>
              <span className={displayT2Score > displayT1Score ? 'text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'text-white/50'}>
                {displayT2Score}
              </span>
            </div>

            {match?.mvp && (
              <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-6 py-2 mb-6">
                <span className="text-yellow-500">⭐</span>
                <span className="text-white font-bold text-sm tracking-widest uppercase">MVP: {match.mvp.nickname}</span>
                <span className="text-yellow-500 font-black">{match.mvp.hltvRating || (match.mvp.rating && Number(match.mvp.rating) < 10 ? match.mvp.rating : '')}</span>
              </div>
            )}

            {match?.tournamentId && !isDownloading && (
              <div className="flex flex-col items-center gap-3 mb-6 relative z-10 animate-bounce-slow">
                <button 
                  onClick={async () => {
                    // Try to save the match to the tournament if it's not already linked properly
                    try {
                        const { updateBetaTournamentMatchResult, getCanonicalRoomId } = await import('./setka_tourn/storage');
                        const userId = match.userId || 'guest';
                        const roomId = getCanonicalRoomId(userId);
                        
                        updateBetaTournamentMatchResult(
                            roomId,
                            match.tournamentId,
                            t1Name,
                            t2Name,
                            t1Score,
                            t2Score
                        );
                        
                        onClose();
                        navigate(`/tournaments-beta/${match.tournamentId}`);
                    } catch (e) {
                        console.error("Error saving match result to tournament from details view:", e);
                        // Fallback: just navigate
                        onClose();
                        navigate(`/tournaments-beta/${match.tournamentId}`);
                    }
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center gap-3 group cursor-pointer uppercase tracking-widest text-sm"
                >
                  <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  СОХРАНИТЬ МАТЧ В БАЗЕ
                </button>
                <p className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-wider">Результат будет записан в сетку</p>
              </div>
            )}

            <div className="mt-8 flex flex-col items-center gap-3 w-full">
              {!isDownloading ? (
                <button 
                  onClick={() => setSelectedResultTab('overall')}
                  className={`w-full max-w-md px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 border cursor-pointer ${selectedResultTab === 'overall' ? 'bg-white/10 border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'bg-transparent border-white/5 text-white/40 hover:bg-white/5 hover:border-white/10'}`}
                >
                  ОБЩАЯ СТАТИСТИКА
                </button>
              ) : (
                <div className="text-[11px] font-black uppercase tracking-widest text-[#ff8f00] bg-[#ff8f00]/10 border border-[#ff8f00]/30 px-5 py-2 rounded-full mb-1">
                  СЫГРАННЫЕ КАРТЫ СЕРИИ
                </div>
              )}
              {mapsList.length > 0 && (
                <div className="flex justify-center gap-3 flex-wrap max-w-full">
                  {mapsList.map((mapItem: any, i: number) => {
                    const mName = mapItem?.mapName || mapItem?.name || `Карта ${i + 1}`;
                    const rawKey = (mapItem?.mapId || mapItem?.id || mapItem?.mapName || mapItem?.name || 'mirage').toLowerCase();
                    const cleanKey = rawKey.replace(/^de_/i, '').replace(/[\s_-]+/g, '');
                    const mSc1 = mapItem?.team1Score ?? mapItem?.score1 ?? 0;
                    const mSc2 = mapItem?.team2Score ?? mapItem?.score2 ?? 0;

                    return (
                      <div 
                        key={i}
                        onClick={() => !isDownloading && setSelectedResultTab(i)}
                        className={`relative overflow-hidden group w-[130px] h-[85px] rounded-xl font-bold transition-all ${!isDownloading ? 'cursor-pointer' : ''} ${selectedResultTab === i ? 'ring-2 ring-white/50 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'opacity-85 hover:opacity-100 hover:ring-1 hover:ring-white/20'}`}
                      >
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url('${getMapImageUrl(mName)}')` }}
                          title={mName}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/60 flex flex-col items-center justify-center p-1">
                          <span className="text-[10px] text-white/90 uppercase tracking-widest mb-1 drop-shadow-md truncate max-w-[110px] font-bold">{mName}</span>
                          <span className="font-black text-xl text-white drop-shadow-lg flex items-center gap-1.5">
                            <span className={mSc1 > mSc2 ? 'text-[#ff8f00]' : 'text-white/80'}>{mSc1}</span>
                            <span className="text-white/30 text-sm">:</span>
                            <span className={mSc2 > mSc1 ? 'text-blue-400' : 'text-white/80'}>{mSc2}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {selectedResultTab === 'overall' ? (
              <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <StatsTable teamName={`${t1Name} (Всего)`} colorClass="text-[#ff8f00]" borderClass="border-[#ff8f00]/30" stats={match?.team1Stats} totalRounds={mapsList.length > 0 ? mapsList.reduce((acc, m) => acc + (m.team1Score ?? m.score1 ?? 0) + (m.team2Score ?? m.score2 ?? 0), 0) || (displayT1Score + displayT2Score) : (displayT1Score + displayT2Score) || 24} />
                  <StatsTable teamName={`${t2Name} (Всего)`} colorClass="text-blue-500" borderClass="border-blue-500/30" stats={match?.team2Stats} totalRounds={mapsList.length > 0 ? mapsList.reduce((acc, m) => acc + (m.team1Score ?? m.score1 ?? 0) + (m.team2Score ?? m.score2 ?? 0), 0) || (displayT1Score + displayT2Score) : (displayT1Score + displayT2Score) || 24} />
                </div>
              </div>
            ) : selectedMapObj ? (
              <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="text-[#ff8f00] font-bold text-sm uppercase tracking-widest">Карта {(selectedResultTab as number) + 1}</div>
                    <div className="text-2xl font-black text-white uppercase">{selectedMapObj.mapName || selectedMapObj.name || 'Карта'}</div>
                  </div>
                  <div className="text-3xl font-black">
                    <span className={(selectedMapObj.team1Score ?? selectedMapObj.score1 ?? 0) > (selectedMapObj.team2Score ?? selectedMapObj.score2 ?? 0) ? 'text-[#ff8f00]' : 'text-white/50'}>{selectedMapObj.team1Score ?? selectedMapObj.score1 ?? 0}</span>
                    <span className="mx-2 text-white/20">:</span>
                    <span className={(selectedMapObj.team2Score ?? selectedMapObj.score2 ?? 0) > (selectedMapObj.team1Score ?? selectedMapObj.score1 ?? 0) ? 'text-blue-500' : 'text-white/50'}>{selectedMapObj.team2Score ?? selectedMapObj.score2 ?? 0}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <StatsTable teamName={t1Name} colorClass="text-[#ff8f00]" borderClass="border-[#ff8f00]/30" stats={selectedMapObj.team1Stats} totalRounds={((selectedMapObj.team1Score ?? selectedMapObj.score1 ?? 0) + (selectedMapObj.team2Score ?? selectedMapObj.score2 ?? 0)) || (displayT1Score + displayT2Score) || 24} />
                  <StatsTable teamName={t2Name} colorClass="text-blue-500" borderClass="border-blue-500/30" stats={selectedMapObj.team2Stats} totalRounds={((selectedMapObj.team1Score ?? selectedMapObj.score1 ?? 0) + (selectedMapObj.team2Score ?? selectedMapObj.score2 ?? 0)) || (displayT1Score + displayT2Score) || 24} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="text-center py-4 text-xs font-bold tracking-widest text-white/30 uppercase">
            ASSEZMS • ASSEZ
          </div>

          {/* Bottom Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl mt-6">
            <button
              onClick={onClose}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer border border-white/10"
            >
              <X className="w-4 h-4 text-white/70" /> НАЗАД К СПИСКУ МАТЧЕЙ
            </button>
            <div className="relative group/downloadbottom">
              <button className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all cursor-pointer text-xs sm:text-sm shadow-md">
                <Download className="w-4 h-4" />
                <span>СКАЧАТЬ (.PNG, .JSON, .PDF)</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              <div className="absolute bottom-full right-0 mb-1.5 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover/downloadbottom:opacity-100 group-hover/downloadbottom:visible transition-all z-50">
                <button onClick={downloadPhoto} className="w-full text-left px-4 py-3 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-blue-400" /> ФОТО (.PNG)
                </button>
                <button onClick={downloadJson} className="w-full text-left px-4 py-3 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5 cursor-pointer">
                  <Database className="w-4 h-4 text-emerald-400" /> ДАННЫЕ (.JSON)
                </button>
                <button onClick={downloadPdf} className="w-full text-left px-4 py-3 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5 cursor-pointer">
                  <Layers className="w-4 h-4 text-purple-400" /> ОТЧЕТ (.PDF)
                </button>
                <button onClick={downloadBoth} className="w-full text-left px-4 py-3 text-xs font-black text-blue-400 hover:bg-blue-500/10 flex items-center gap-3 transition-colors border-t border-white/10 cursor-pointer">
                  <Check className="w-4 h-4" /> СКАЧАТЬ ОБА
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
