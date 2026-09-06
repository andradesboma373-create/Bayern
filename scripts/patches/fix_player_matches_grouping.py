import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

grouping_logic = """    // 3. Group matches by tournament and opponent to avoid showing each map separately for BO3/BO5
    const groupedMatches = new Map<string, any>();
    matchesList.forEach(m => {
      const isBO = m.tourneyName.includes('(BO');
      if (isBO) {
        groupedMatches.set(m.id, m);
      } else {
        const key = `${m.tourneyName.split(' (')[0]}-${m.enemyTeamName}`;
        if (groupedMatches.has(key)) {
          const existing = groupedMatches.get(key);
          if (!existing.grouped) {
            existing.grouped = true;
            existing.myScoreCount = existing.won ? 1 : 0;
            existing.oppScoreCount = !existing.won ? 1 : 0;
            existing.mapsCount = 1;
          }
          existing.myScoreCount += (m.won ? 1 : 0);
          existing.oppScoreCount += (!m.won ? 1 : 0);
          existing.mapsCount += 1;
          
          existing.score = `${existing.myScoreCount} : ${existing.oppScoreCount}`;
          existing.won = existing.myScoreCount > existing.oppScoreCount;
          existing.tourneyName = `${existing.tourneyName.split(' (')[0]} (BO${existing.mapsCount})`;
          
          // Accumulate stats
          existing.kills += m.kills;
          existing.deaths += m.deaths;
          existing.assists += m.assists;
          // Approximate combined rating and adr
          existing.adr = Math.round((existing.adr * (existing.mapsCount - 1) + m.adr) / existing.mapsCount);
          existing.rating = ((parseFloat(existing.rating) * (existing.mapsCount - 1) + parseFloat(m.rating)) / existing.mapsCount).toFixed(2);
        } else {
          groupedMatches.set(key, { ...m, grouped: false });
        }
      }
    });
    
    const finalMatchesList = Array.from(groupedMatches.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getZero = () => '0.00';
    return {
      kd: matchesCount > 0 ? (totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2)) : getZero(),
      kast: matchesCount > 0 ? (70 + (Math.random() * 10)).toFixed(1) : '0.0', // Estimated
      impact: matchesCount > 0 ? impact.toFixed(2) : getZero(),
      adr: matchesCount > 0 ? adr.toFixed(1) : '0.0',
      kpr: matchesCount > 0 ? kpr.toFixed(2) : getZero(),
      rating: matchesCount > 0 ? rating.toFixed(2) : getZero(),
      totalMatches: matchesCount,
      totalMvps: matchesCount > 0 ? totalMvps : 0,
      headshots: matchesCount > 0 ? (40 + (Math.random() * 20)).toFixed(1) : '0.0', // Estimated
      mapsPlayed: matchesCount, // Approximation
      matchesList: finalMatchesList,
      trophies: trophyList,
      totalPrizeMoney,
      mvpCount,
      evpCount
    };"""

content = re.sub(r'    const getZero = \(\) => \'0\.00\';\n    return \{\n      kd: matchesCount > 0 \? \(totalDeaths > 0 \? \(totalKills / totalDeaths\)\.toFixed\(2\) : totalKills\.toFixed\(2\)\) : getZero\(\),\n      kast: matchesCount > 0 \? \(70 \+ \(Math\.random\(\) \* 10\)\)\.toFixed\(1\) : \'0\.0\', // Estimated\n      impact: matchesCount > 0 \? impact\.toFixed\(2\) : getZero\(\),\n      adr: matchesCount > 0 \? adr\.toFixed\(1\) : \'0\.0\',\n      kpr: matchesCount > 0 \? kpr\.toFixed\(2\) : getZero\(\),\n      rating: matchesCount > 0 \? rating\.toFixed\(2\) : getZero\(\),\n      totalMatches: matchesCount,\n      totalMvps: matchesCount > 0 \? totalMvps : 0,\n      headshots: matchesCount > 0 \? \(40 \+ \(Math\.random\(\) \* 20\)\)\.toFixed\(1\) : \'0\.0\', // Estimated\n      mapsPlayed: matchesCount, // Approximation\n      matchesList,\n      trophies: trophyList,\n      totalPrizeMoney,\n      mvpCount,\n      evpCount\n    \};', grouping_logic, content)

with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)

print("Done PlayerProfileModal grouping")
