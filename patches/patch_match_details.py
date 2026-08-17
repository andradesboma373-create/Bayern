import re

with open('src/components/MatchDetails.tsx', 'r') as f:
    content = f.read()

old_headers = """            <tr className="text-white/30 uppercase tracking-wider text-[10px] border-b border-white/5">
              <th className="py-2 font-medium">Игрок</th>
              <th className="py-2 text-center font-medium">K-A-D</th>
              <th className="py-2 text-center font-medium">+/-</th>
              <th className="py-2 text-center font-medium">ADR</th>
              <th className="py-2 text-center font-medium">Rating</th>
            </tr>"""

new_headers = """            <tr className="text-white/30 uppercase tracking-wider text-[10px] border-b border-white/5">
              <th className="py-2 font-medium">Игрок</th>
              <th className="py-2 text-center font-medium">K-A-D</th>
              <th className="py-2 text-center font-medium">+/-</th>
              <th className="py-2 text-center font-medium">ADR</th>
              <th className="py-2 text-center font-medium">K/D</th>
              <th className="py-2 text-center font-medium">Rating</th>
            </tr>"""

content = content.replace(old_headers, new_headers)

old_row = """              const diff = kills - deaths;
              const adrVal = p?.adr != null && !isNaN(Number(p.adr)) ? Number(p.adr).toFixed(1) : '-';
              const ratingVal = p?.hltvRating || p?.rating || '1.00';

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
                  <td className="py-2 text-center font-black text-white">{ratingVal}</td>
                </tr>"""

new_row = """              const diff = kills - deaths;
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
                </tr>"""

content = content.replace(old_row, new_row)

with open('src/components/MatchDetails.tsx', 'w') as f:
    f.write(content)
