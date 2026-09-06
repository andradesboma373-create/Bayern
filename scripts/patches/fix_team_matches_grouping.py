import re

with open('src/components/TeamProfileModal.tsx', 'r') as f:
    content = f.read()

# We can group them after processing all matches.
grouping_logic = """    // 3. Group matches by tournament and opponent to avoid showing each map separately for BO3/BO5
    const groupedMatches = new Map<string, any>();
    matchesList.forEach(m => {
      const isBO = m.map.startsWith('BO');
      if (isBO) {
        // If it's already a BO series, just add it directly (using id to ensure uniqueness)
        groupedMatches.set(m.id, m);
      } else {
        const key = `${m.tournamentName}-${m.opponentName}`;
        if (groupedMatches.has(key)) {
          const existing = groupedMatches.get(key);
          if (!existing.map.startsWith('BO')) {
            // Convert to BO format
            existing.myScore = existing.isWin ? 1 : 0;
            existing.oppScore = !existing.isWin ? 1 : 0;
            existing.map = 'BO1'; // Will be updated
            existing.mapsCount = 1;
          }
          existing.myScore += (m.isWin ? 1 : 0);
          existing.oppScore += (!m.isWin ? 1 : 0);
          existing.mapsCount = (existing.mapsCount || 1) + 1;
          existing.map = `BO${existing.mapsCount}`;
          existing.isWin = existing.myScore > existing.oppScore;
        } else {
          groupedMatches.set(key, { ...m, mapsCount: 1 });
        }
      }
    });
    
    const finalMatchesList = Array.from(groupedMatches.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalMatches,
      wins,
      losses,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      totalPrizeMoney,
      matchesList: finalMatchesList,
      trophyList,
      mapStats
    };"""

content = re.sub(r'    return \{\n      totalMatches,\n      wins,\n      losses,\n      winRate: totalMatches > 0 \? Math\.round\(\(wins / totalMatches\) \* 100\) : 0,\n      totalPrizeMoney,\n      matchesList,\n      trophyList,\n      mapStats\n    \};', grouping_logic, content)

with open('src/components/TeamProfileModal.tsx', 'w') as f:
    f.write(content)

print("Done TeamProfileModal grouping")
