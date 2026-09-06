import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

old_process = """    const processMatchObj = (m: any, tourney: any) => {
      if (!m || (m.team1Score === 0 && m.team2Score === 0 && !m.isFinished && !m.completed)) return;

      const processStats = (st: any, mapObj: any, isTeam1: boolean, isLegacy: boolean) => {
        if (!st) return;
        const k = st.kills || 0;
        const d = st.deaths || 0;
        const a = st.assists || 0;
        const dmg = st.damage || 0;
        const r = st.totalRounds || st.rounds || mapObj.team1Score + mapObj.team2Score || 1;
        const mvp = st.mvps || 0;
        
        if (k === 0 && d === 0 && r <= 1) return;

        totalKills += k;
        totalDeaths += d;
        totalAssists += a;
        totalDamage += dmg;
        totalRounds += r;
        totalMvps += mvp;
        matchesCount++;

        const mKd = d > 0 ? k / d : k;
        const mAdr = r > 0 ? dmg / r : 0;
        const mImpact = 0.8 + (mKd * 0.3) + (mAdr * 0.003) + (a / Math.max(r, 1)) * 0.1;
        const mRating = parseFloat(st.hltvRating) || (0.5 + (mKd * 0.35) + (mAdr * 0.004) + (mImpact * 0.15));

        const enemyTeam = isTeam1 ? (mapObj.team2 || m.team2) : (mapObj.team1 || m.team1);
        const enemyName = enemyTeam?.name || (isTeam1 ? mapObj.team2Name : mapObj.team1Name) || 'Opponent';
        const myScore = isTeam1 ? mapObj.team1Score : mapObj.team2Score;
        const enemyScore = isTeam1 ? mapObj.team2Score : mapObj.team1Score;
        const won = myScore > enemyScore;

        matchesList.push({
          id: (isLegacy ? m.id : mapObj.id || m.id) || Math.random().toString(),
          tourneyName: tourney.name + (mapObj.mapName ? ` (${mapObj.mapName})` : ''),
          enemyTeamName: enemyName,
          enemyTeamLogo: enemyTeam?.logo || null,
          score: `${myScore ?? 0} : ${enemyScore ?? 0}`,
          won,
          kills: k,
          deaths: d,
          assists: a,
          adr: Math.round(mAdr),
          rating: mRating.toFixed(2),
          date: tourney.createdAt ? new Date(tourney.createdAt).toLocaleDateString('ru-RU') : '2026'
        });
      };

      if (m.maps && Array.isArray(m.maps) && m.maps.length > 0) {
        m.maps.forEach((mapObj: any) => {
          let st = null;
          let isTeam1 = false;
          if (mapObj.team1Stats && Array.isArray(mapObj.team1Stats)) {
            st = mapObj.team1Stats.find((p: any) => (p.nickname || '').trim().toLowerCase() === nick || (p.id && p.id === player.id));
            if (st) isTeam1 = true;
          }
          if (!st && mapObj.team2Stats && Array.isArray(mapObj.team2Stats)) {
            st = mapObj.team2Stats.find((p: any) => (p.nickname || '').trim().toLowerCase() === nick || (p.id && p.id === player.id));
          }
          processStats(st, mapObj, isTeam1, false);
        });
      } else {
        let st = null;
        let isTeam1 = false;

        if (m.team1Stats && Array.isArray(m.team1Stats)) {
          st = m.team1Stats.find((p: any) => (p.nickname || '').trim().toLowerCase() === nick || (p.id && p.id === player.id));
          if (st) isTeam1 = true;
        }
        if (!st && m.team2Stats && Array.isArray(m.team2Stats)) {
          st = m.team2Stats.find((p: any) => (p.nickname || '').trim().toLowerCase() === nick || (p.id && p.id === player.id));
        }

        if (!st && m.playerStats) {
          let foundKey = Object.keys(m.playerStats).find(k => k.trim().toLowerCase() === nick);
          if (!foundKey && player.id) foundKey = Object.keys(m.playerStats).find(k => k === player.id);
          if (foundKey) {
            st = m.playerStats[foundKey];
            isTeam1 = m.team1?.name === currentTeam?.name || m.team1?.players?.some((tp: any) => (tp.nickname || '').trim().toLowerCase() === nick);
          }
        }
        
        processStats(st, m, isTeam1, true);
      }
    };"""

new_process = """    const processMatchObj = (m: any, tourney: any) => {
      if (!m || (m.team1Score === 0 && m.team2Score === 0 && !m.isFinished && !m.completed)) return;

      let seriesK = 0, seriesD = 0, seriesA = 0, seriesDmg = 0, seriesR = 0, seriesMvps = 0;
      let hasStats = false;
      let isTeam1Global = false;

      const processStats = (st: any, mapObj: any, isTeam1: boolean) => {
        if (!st) return;
        const k = st.kills || 0;
        const d = st.deaths || 0;
        const a = st.assists || 0;
        const dmg = st.damage || 0;
        const r = st.totalRounds || st.rounds || mapObj.team1Score + mapObj.team2Score || 1;
        const mvp = st.mvps || 0;
        
        if (k === 0 && d === 0 && r <= 1) return;

        totalKills += k;
        totalDeaths += d;
        totalAssists += a;
        totalDamage += dmg;
        totalRounds += r;
        totalMvps += mvp;
        matchesCount++;

        seriesK += k;
        seriesD += d;
        seriesA += a;
        seriesDmg += dmg;
        seriesR += r;
        seriesMvps += mvp;
        hasStats = true;
        isTeam1Global = isTeam1;
      };

      if (m.maps && Array.isArray(m.maps) && m.maps.length > 0) {
        m.maps.forEach((mapObj: any) => {
          let st = null;
          let isTeam1 = false;
          if (mapObj.team1Stats && Array.isArray(mapObj.team1Stats)) {
            st = mapObj.team1Stats.find((p: any) => (p.nickname || '').trim().toLowerCase() === nick || (p.id && p.id === player.id));
            if (st) isTeam1 = true;
          }
          if (!st && mapObj.team2Stats && Array.isArray(mapObj.team2Stats)) {
            st = mapObj.team2Stats.find((p: any) => (p.nickname || '').trim().toLowerCase() === nick || (p.id && p.id === player.id));
          }
          processStats(st, mapObj, isTeam1);
        });

        if (hasStats) {
          const enemyTeam = isTeam1Global ? m.team2 : m.team1;
          const enemyName = enemyTeam?.name || (isTeam1Global ? m.team2Name : m.team1Name) || 'Opponent';
          const myScore = isTeam1Global ? (m.score1 ?? m.team1Score ?? 0) : (m.score2 ?? m.team2Score ?? 0);
          const enemyScore = isTeam1Global ? (m.score2 ?? m.team2Score ?? 0) : (m.score1 ?? m.team1Score ?? 0);
          
          const mKd = seriesD > 0 ? seriesK / seriesD : seriesK;
          const mAdr = seriesR > 0 ? seriesDmg / seriesR : 0;
          const mImpact = 0.8 + (mKd * 0.3) + (mAdr * 0.003) + (seriesA / Math.max(seriesR, 1)) * 0.1;
          const mRating = (0.5 + (mKd * 0.35) + (mAdr * 0.004) + (mImpact * 0.15));

          matchesList.push({
            id: m.id || Math.random().toString(),
            tourneyName: tourney.name + ` (BO${m.maps.length})`,
            enemyTeamName: enemyName,
            enemyTeamLogo: enemyTeam?.logo || null,
            score: `${myScore ?? 0} : ${enemyScore ?? 0}`,
            won: myScore > enemyScore,
            kills: seriesK,
            deaths: seriesD,
            assists: seriesA,
            adr: Math.round(mAdr),
            rating: mRating.toFixed(2),
            date: tourney.createdAt ? new Date(tourney.createdAt).toLocaleDateString('ru-RU') : '2026'
          });
        }
      } else {
        let st = null;
        let isTeam1 = false;

        if (m.team1Stats && Array.isArray(m.team1Stats)) {
          st = m.team1Stats.find((p: any) => (p.nickname || '').trim().toLowerCase() === nick || (p.id && p.id === player.id));
          if (st) isTeam1 = true;
        }
        if (!st && m.team2Stats && Array.isArray(m.team2Stats)) {
          st = m.team2Stats.find((p: any) => (p.nickname || '').trim().toLowerCase() === nick || (p.id && p.id === player.id));
        }

        if (!st && m.playerStats) {
          let foundKey = Object.keys(m.playerStats).find(k => k.trim().toLowerCase() === nick);
          if (!foundKey && player.id) foundKey = Object.keys(m.playerStats).find(k => k === player.id);
          if (foundKey) {
            st = m.playerStats[foundKey];
            isTeam1 = m.team1?.name === currentTeam?.name || m.team1?.players?.some((tp: any) => (tp.nickname || '').trim().toLowerCase() === nick);
          }
        }
        
        processStats(st, m, isTeam1);

        if (hasStats) {
          const enemyTeam = isTeam1Global ? m.team2 : m.team1;
          const enemyName = enemyTeam?.name || (isTeam1Global ? m.team2Name : m.team1Name) || 'Opponent';
          const myScore = isTeam1Global ? (m.score1 ?? m.team1Score ?? 0) : (m.score2 ?? m.team2Score ?? 0);
          const enemyScore = isTeam1Global ? (m.score2 ?? m.team2Score ?? 0) : (m.score1 ?? m.team1Score ?? 0);
          
          const mKd = seriesD > 0 ? seriesK / seriesD : seriesK;
          const mAdr = seriesR > 0 ? seriesDmg / seriesR : 0;
          const mImpact = 0.8 + (mKd * 0.3) + (mAdr * 0.003) + (seriesA / Math.max(seriesR, 1)) * 0.1;
          const mRating = parseFloat(st.hltvRating) || (0.5 + (mKd * 0.35) + (mAdr * 0.004) + (mImpact * 0.15));

          matchesList.push({
            id: m.id || Math.random().toString(),
            tourneyName: tourney.name + (m.map ? ` (${m.map})` : ''),
            enemyTeamName: enemyName,
            enemyTeamLogo: enemyTeam?.logo || null,
            score: `${myScore ?? 0} : ${enemyScore ?? 0}`,
            won: myScore > enemyScore,
            kills: seriesK,
            deaths: seriesD,
            assists: seriesA,
            adr: Math.round(mAdr),
            rating: mRating.toFixed(2),
            date: tourney.createdAt ? new Date(tourney.createdAt).toLocaleDateString('ru-RU') : '2026'
          });
        }
      }
    };"""

content = content.replace(old_process, new_process)
with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)
