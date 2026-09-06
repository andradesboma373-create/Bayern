import re

with open('src/components/MatchDetails.tsx', 'r') as f:
    content = f.read()

old_sort = """  const sortedStats = [...stats].sort((a, b) => {
    const rA = parseFloat(a?.hltvRating || a?.rating || '0');
    const rB = parseFloat(b?.hltvRating || b?.rating || '0');
    return rB - rA;
  });"""

new_sort = """  const sortedStats = [...stats].sort((a, b) => {
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
            const adrFloat = p?.adr ? Number(p.adr) : (104 * kpr + 10);
            const baseHltv = 0.30 * (kpr / 0.68) + 0.20 * (adrFloat / 72) + 0.10 * (Math.max(0, impact) / 0.8) + 0.25 * (1 - dpr);
            hltv = Math.max(0.65, Math.min(2.15, baseHltv * 1.04)).toFixed(2);
        }
        return parseFloat(hltv || '0');
    };
    return getHltv(b) - getHltv(a);
  });"""

content = content.replace(old_sort, new_sort)

with open('src/components/MatchDetails.tsx', 'w') as f:
    f.write(content)
