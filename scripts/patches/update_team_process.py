import re

with open('src/components/TeamProfileModal.tsx', 'r') as f:
    content = f.read()

old_block = """          if (m.maps && Array.isArray(m.maps) && m.maps.length > 0) {
            m.maps.forEach((mapObj: any, idx: number) => {
              const team1S = mapObj.team1Score ?? 0;
              const team2S = mapObj.team2Score ?? 0;
              if (team1S === 0 && team2S === 0) return; // Skip unplayed map
              
              totalMatches++;
              const isWin = isTeamA ? team1S > team2S : team2S > team1S;
              if (isWin) wins++; else losses++;
              
              const mapName = mapObj.mapName || mapObj.map || 'Unknown Map';
              if (!mapStats[mapName]) {
                mapStats[mapName] = { played: 0, won: 0 };
              }
              mapStats[mapName].played++;
              if (isWin) mapStats[mapName].won++;
              
              matchesList.push({
                id: `${mId}-map${idx}`,
                tournamentName: tournamentName || 'Матч',
                opponentName,
                myScore: isTeamA ? team1S : team2S,
                oppScore: isTeamA ? team2S : team1S,
                isWin,
                map: mapName,
                date: m.date ? new Date(m.date).toLocaleDateString('ru-RU') : 'Ранее'
              });
            });
          }"""

new_block = """          if (m.maps && Array.isArray(m.maps) && m.maps.length > 0) {
            m.maps.forEach((mapObj: any, idx: number) => {
              const team1S = mapObj.team1Score ?? 0;
              const team2S = mapObj.team2Score ?? 0;
              if (team1S === 0 && team2S === 0) return; // Skip unplayed map
              
              totalMatches++; // Count maps
              const isWin = isTeamA ? team1S > team2S : team2S > team1S;
              if (isWin) wins++; else losses++;
              
              const mapName = mapObj.mapName || mapObj.map || 'Unknown Map';
              if (!mapStats[mapName]) {
                mapStats[mapName] = { played: 0, won: 0 };
              }
              mapStats[mapName].played++;
              if (isWin) mapStats[mapName].won++;
            });
            
            // Push ONE match record for the series
            matchesList.push({
              id: mId,
              tournamentName: tournamentName || 'Матч',
              opponentName,
              myScore,
              oppScore,
              isWin: myScore > oppScore,
              map: `BO${m.maps.length}`,
              date: m.date ? new Date(m.date).toLocaleDateString('ru-RU') : 'Ранее'
            });
          }"""

content = content.replace(old_block, new_block)

with open('src/components/TeamProfileModal.tsx', 'w') as f:
    f.write(content)
