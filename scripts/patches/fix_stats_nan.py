import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

# Replace final return object for playerStats
old_return = """    return {
      kd: totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2),
      kast: (70 + (Math.random() * 10)).toFixed(1), // Estimated
      impact: impact.toFixed(2),
      adr: adr.toFixed(1),
      kpr: kpr.toFixed(2),
      rating: rating.toFixed(2),
      totalMatches: matchesCount,
      totalMvps: totalMvps,
      headshots: (40 + (Math.random() * 20)).toFixed(1), // Estimated
      mapsPlayed: matchesCount, // Approximation
      matchesList,
      trophies: trophyList,
      totalPrizeMoney,
      mvpCount,
      evpCount
    };
  }, [uid, player.nickname, player.id, currentTeam?.name]);"""

new_return = """    const getZero = () => '0.00';
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
      matchesList,
      trophies: trophyList,
      totalPrizeMoney,
      mvpCount,
      evpCount
    };
  }, [uid, player.nickname, player.id, currentTeam?.name]);"""

content = content.replace(old_return, new_return)

with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)

print("Done PlayerProfileModal")
