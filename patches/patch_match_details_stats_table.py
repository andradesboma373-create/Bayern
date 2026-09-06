import re

with open('src/components/MatchDetails.tsx', 'r') as f:
    content = f.read()

old_table = """  return (
    <div>
      <h3 className={`${colorClass} font-black uppercase tracking-wider mb-4 pb-2 border-b ${borderClass}`}>{teamName}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[300px]">
          <thead>
            <tr className="text-white/30 uppercase tracking-wider text-[10px] border-b border-white/5">
              <th className="py-2 font-medium">Игрок</th>
              <th className="py-2 text-center font-medium">K-A-D</th>
              <th className="py-2 text-center font-medium">+/-</th>
              <th className="py-2 text-center font-medium">ADR</th>
              <th className="py-2 text-center font-medium">K/D</th>
              <th className="py-2 text-center font-medium">Rating</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((p: any, idx: number) => {
              const nickname = p?.nickname || p?.name || `Игрок ${idx + 1}`;
              const kills = p?.kills ?? 0;
              const assists = p?.assists ?? 0;
              const deaths = p?.deaths ?? 0;
              const diff = kills - deaths;
              const adrVal = p?.adr != null && !isNaN(Number(p.adr)) ? Number(p.adr).toFixed(1) : '-';
              
              // Если hltvRating нет (старый матч), но есть rating, который больше 10 (например 130)
              // То rating = 130 это скилл. А не рейтинг матча. Рейтинг HLTV мы можем пересчитать.
              let hltv = p?.hltvRating;
              if (!hltv && p?.rating && Number(p.rating) < 10) {
                 hltv = p.rating;
              }
              const kd = p?.kd || (deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2));
              
              if (!hltv) {
                  // Попытаемся высчитать примерный рейтинг для старых матчей
                  const rounds = p?.totalRounds || Math.max(1, kills / 0.7);
                  const kpr = kills / rounds;
                  const dpr = deaths / rounds;
                  const apr = assists / rounds;
                  const impact = 2.13 * kpr + 0.42 * apr - 0.41;
                  const adrFloat = p?.adr ? Number(p.adr) : (104 * kpr + 10);
                  const baseHltv = 0.30 * (kpr / 0.68) + 0.20 * (adrFloat / 72) + 0.10 * (Math.max(0, impact) / 0.8) + 0.25 * (1 - dpr);
                  hltv = Math.max(0.65, Math.min(2.15, baseHltv * 1.04)).toFixed(2);
              }

              return (
                <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="py-2 font-bold text-white/90">
                    <div className="flex items-center gap-2">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=random`} className="w-5 h-5 rounded-full" alt={nickname} />
                      {nickname}
                    </div>
                  </td>
                  <td className="py-2 text-center font-mono text-white/70">{kills}-{assists}-{deaths}</td>
                  <td className={`py-2 text-center font-mono font-bold ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-white/50'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </td>
                  <td className="py-2 text-center font-mono text-white/70">{adrVal}</td>
                  <td className="py-2 text-center font-mono text-white/70">{kd}</td>
                  <td className="py-2 text-center font-black text-white">{hltv}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );"""

new_table = """  return (
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
                  const adrFloat = p?.adr ? Number(p.adr) : (104 * kpr + 10);
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
                  <td className="py-2 text-center text-white/50 font-mono text-xs">{kd}</td>
                  <td className="py-2 text-right font-bold text-yellow-500/80 font-mono text-sm">{hltv}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );"""

content = content.replace(old_table, new_table)

with open('src/components/MatchDetails.tsx', 'w') as f:
    f.write(content)
