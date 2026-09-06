import { useState, useRef } from 'react';
import { X, Download } from 'lucide-react';
import TeamLogo from './TeamLogo';

function StatsTable({ teamName, colorClass, borderClass, stats }: { teamName: string, colorClass: string, borderClass: string, stats?: any[] }) {
  if (!stats || !Array.isArray(stats) || stats.length === 0) {
    return (
      <div>
        <h3 className={`${colorClass} font-black uppercase tracking-wider mb-4 pb-2 border-b ${borderClass}`}>{teamName}</h3>
        <p className="text-white/40 text-xs italic py-4">Нет доступной статистики по игрокам</p>
      </div>
    );
  }

  const sortedStats = [...stats].sort((a, b) => {
    const getHltv = (p: any) => {
        let hltv = p?.hltvRating;
        if (!hltv && p?.rating && Number(p.rating) < 10) hltv = p.rating;
        if (!hltv) {
            const kills = p?.kills ?? 0;
            const deaths = p?.deaths ?? 0;
            const assists = p?.assists ?? 0;
            const rounds = p?.totalRounds || Math.max(1, kills / 0.7);
            const kpr = kills / rounds;
            const dpr = deaths / rounds;
            const apr = assists / rounds;
            const impact = 2.13 * kpr + 0.42 * apr - 0.41;
            const adrFloat = p?.adr ? Number(p.adr) : (85 * kpr + 15);
            const baseHltv = 0.30 * (kpr / 0.68) + 0.20 * (adrFloat / 72) + 0.10 * (Math.max(0, impact) / 0.8) + 0.25 * (1 - dpr);
            hltv = Math.max(0.65, Math.min(2.15, baseHltv * 1.04)).toFixed(2);
        }
        return parseFloat(hltv || '0');
    };
    return getHltv(b) - getHltv(a);
  });

  return (
    <div>
      <h3 className={`${colorClass} font-black uppercase tracking-wider mb-4 pb-2 border-b ${borderClass}`}>{teamName}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[300px]">
          <thead>
            <tr className="text-white/30 uppercase tracking-wider text-[10px] border-b border-white/5">
              <th className="py-2 font-medium">Игрок</th>
              <th className="py-2 text-center font-medium">K-A-D</th>
              <th className="py-2 text-center font-medium">+/-</th>
              <th className="py-2 text-center font-medium" title="Average Damage per Round">ADR</th>
              <th className="py-2 text-center font-medium" title="Impact Rating">Impact</th>
              <th className="py-2 text-center font-medium">K/D</th>
              <th className="py-2 text-right font-medium">Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((p: any, idx: number) => {
              const nickname = p?.nickname || p?.name || `Игрок ${idx + 1}`;
              const kills = p?.kills ?? 0;
              const assists = p?.assists ?? 0;
              const deaths = p?.deaths ?? 0;
              const diff = kills - deaths;
              const fkDiff = (p?.fk || 0) - (p?.fd || 0);
              const adrVal = p?.adr != null && !isNaN(Number(p.adr)) ? Number(p.adr).toFixed(1) : '-';
              
              let hltv = p?.hltvRating;
              if (!hltv && p?.rating && Number(p.rating) < 10) {
                 hltv = p.rating;
              }
              const kd = p?.kd || (deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2));
              
              if (!hltv) {
                  const rounds = p?.totalRounds || Math.max(1, kills / 0.7);
                  const kpr = kills / rounds;
                  const dpr = deaths / rounds;
                  const apr = assists / rounds;
                  const impact = 2.13 * kpr + 0.42 * apr - 0.41;
                  const adrFloat = p?.adr ? Number(p.adr) : (85 * kpr + 15);
                  const baseHltv = 0.30 * (kpr / 0.68) + 0.20 * (adrFloat / 72) + 0.10 * (Math.max(0, impact) / 0.8) + 0.25 * (1 - dpr);
                  hltv = Math.max(0.65, Math.min(2.15, baseHltv * 1.04)).toFixed(2);
              }

              return (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2 font-bold text-white/90">{nickname}</td>
                  <td className="py-2 text-center text-white/70 font-mono text-xs">{kills}-{assists}-{deaths}</td>
                  <td className={`py-2 text-center font-mono text-xs ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white/50'}`}>
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="py-2 text-center text-white/50 font-mono text-xs">{adrVal}</td>
                  <td className="py-2 text-center text-white/50 font-mono text-xs">{p?.impact || '-'}</td>
                  <td className="py-2 text-center text-white/50 font-mono text-xs">{kd}</td>
                  <td className="py-2 text-right font-bold text-yellow-500/80 font-mono text-sm">{hltv}</td>
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
  const resultContainerRef = useRef<HTMLDivElement>(null);

  const t1Name = match?.team1Name || match?.team1?.name || (typeof match?.team1 === 'string' ? match.team1 : '') || 'Команда 1';
  const t2Name = match?.team2Name || match?.team2?.name || (typeof match?.team2 === 'string' ? match.team2 : '') || 'Команда 2';
  const t1Score = match?.team1Score ?? match?.score1 ?? 0;
  const t2Score = match?.team2Score ?? match?.score2 ?? 0;
  const mapsList: any[] = Array.isArray(match?.maps) ? match.maps : [];

  const downloadPhoto = async () => {
    if (!resultContainerRef.current) return;
    try {
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
    }
  };

  const isBO1 = match?.bo === 1 || match?.bo === '1' || match?.format === 'BO1' || mapsList.length === 1;
  const [selectedResultTab, setSelectedResultTab] = useState<'overall' | number>('overall');

  const selectedMapObj = (selectedResultTab !== 'overall' && mapsList[selectedResultTab as number]) ? mapsList[selectedResultTab as number] : null;
  const activeMapName = selectedMapObj ? (selectedMapObj.mapName || selectedMapObj.name || 'de_inferno') : (isBO1 && mapsList[0] ? (mapsList[0].mapName || mapsList[0].name || 'de_inferno') : '');

  const displayT1Score = selectedMapObj ? (selectedMapObj.team1Score ?? selectedMapObj.score1 ?? 0) : (isBO1 && mapsList[0] ? (mapsList[0].team1Score ?? mapsList[0].score1 ?? t1Score) : t1Score);
  const displayT2Score = selectedMapObj ? (selectedMapObj.team2Score ?? selectedMapObj.score2 ?? 0) : (isBO1 && mapsList[0] ? (mapsList[0].team2Score ?? mapsList[0].score2 ?? t2Score) : t2Score);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div ref={resultContainerRef} className="bg-[#0a0a0f] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40 sticky top-0 z-10">
          <h2 className="text-xl font-black text-white uppercase tracking-widest">ДЕТАЛИ МАТЧА</h2>
          <div className="flex items-center gap-2">
            <button onClick={downloadPhoto} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors cursor-pointer" title="Скачать как изображение">
              <Download className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Скачать</span>
            </button>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div 
            className="bg-gradient-to-br from-[#12121a] to-[#1a1a24] border border-white/10 shadow-2xl shadow-black/50 rounded-2xl p-8 text-center relative overflow-hidden mb-6"
            style={activeMapName ? {
              backgroundImage: `linear-gradient(to bottom, rgba(18,18,26,0.85), rgba(26,26,36,0.95)), url('/maps/${activeMapName.toLowerCase()}.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#ff8f00]/10 blur-[80px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2"></div>
            <div className="flex items-center justify-center gap-6 mb-4 relative z-10">
              <TeamLogo teamName={t1Name} sizeClassName="w-16 h-16 text-2xl" />
              <h2 className="text-3xl font-black tracking-widest text-white uppercase">{t1Name} vs {t2Name}</h2>
              <TeamLogo teamName={t2Name} sizeClassName="w-16 h-16 text-2xl" />
            </div>
            
            <div className="text-6xl font-black tracking-widest mb-6 relative z-10 drop-shadow-xl">
              <span className={displayT1Score > displayT2Score ? 'text-[#ff8f00] drop-shadow-[0_0_15px_rgba(255,143,0,0.5)]' : 'text-white/50'}>
                {displayT1Score}
              </span>
              <span className="mx-6 text-white/20 text-4xl">:</span>
              <span className={displayT2Score > displayT1Score ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-white/50'}>
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

            <div className="mt-8 flex flex-col items-center gap-3">
              <button 
                onClick={() => setSelectedResultTab('overall')}
                className={`w-full max-w-md px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 border cursor-pointer ${selectedResultTab === 'overall' ? 'bg-white/10 border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'bg-transparent border-white/5 text-white/40 hover:bg-white/5 hover:border-white/10'}`}
              >
                ОБЩАЯ СТАТИСТИКА
              </button>
              {mapsList.length > 0 && (
                <div className="flex justify-center gap-3 flex-wrap">
                  {mapsList.map((mapItem: any, i: number) => {
                    const mName = mapItem?.mapName || mapItem?.name || `Карта ${i + 1}`;
                    const mSc1 = mapItem?.team1Score ?? mapItem?.score1 ?? 0;
                    const mSc2 = mapItem?.team2Score ?? mapItem?.score2 ?? 0;

                    return (
                      <button 
                        key={i}
                        onClick={() => setSelectedResultTab(i)}
                        className={`relative overflow-hidden group w-[120px] h-[80px] rounded-xl font-bold transition-all cursor-pointer ${selectedResultTab === i ? 'ring-2 ring-white/50 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'opacity-70 hover:opacity-100 hover:ring-1 hover:ring-white/20'}`}
                      >
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url('/maps/${mName.toLowerCase()}.jpg')` }}
                          title={mName}
                        />
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                          <span className="text-[10px] text-white/70 uppercase tracking-widest mb-1 drop-shadow-md">{mName}</span>
                          <span className="font-black text-xl text-white drop-shadow-lg">
                            {mSc1}:{mSc2}
                          </span>
                        </div>
                      </button>
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
                  <StatsTable teamName={`${t1Name} (Всего)`} colorClass="text-[#ff8f00]" borderClass="border-[#ff8f00]/30" stats={match?.team1Stats} />
                  <StatsTable teamName={`${t2Name} (Всего)`} colorClass="text-blue-500" borderClass="border-blue-500/30" stats={match?.team2Stats} />
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
                  <StatsTable teamName={t1Name} colorClass="text-[#ff8f00]" borderClass="border-[#ff8f00]/30" stats={selectedMapObj.team1Stats} />
                  <StatsTable teamName={t2Name} colorClass="text-blue-500" borderClass="border-blue-500/30" stats={selectedMapObj.team2Stats} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
