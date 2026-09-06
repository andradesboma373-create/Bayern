import re

with open('src/components/TeamProfileModal.tsx', 'r') as f:
    content = f.read()

old_return = """    return {
      totalMatches,
      wins,
      losses,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      totalPrizeMoney,
      matchesList,
      trophyList,
      mapStats
    };"""

new_return = """    return {
      totalMatches,
      wins,
      losses,
      winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
      totalPrizeMoney,
      matchesList,
      trophyList,
      mapStats
    };"""

print("Done TeamProfileModal")
