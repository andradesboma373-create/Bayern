import { Team, Match } from './types';

export const generateNextSwissRound = (
    teams: Team[], 
    previousRounds: Match[][], 
    winsToAdvance: number, 
    lossesToEliminate: number
): Match[] | null => {
    // 1. Первый раунд: формируем пары строго по порядку команд (как выставил пользователь)
    if (previousRounds.length === 0) {
        const list = teams.filter(t => t.id !== 'BYE');
        if (list.length === 0) return null;

        const newRound: Match[] = [];
        const matchCount = Math.floor(list.length / 2);
        const hasBye = list.length % 2 !== 0;

        for (let i = 0; i < matchCount; i++) {
            const t1 = list[i * 2];
            const t2 = list[i * 2 + 1];
            newRound.push({
                id: `swiss-r0-m${i}`,
                team1: t1,
                team2: t2,
                score1: 0,
                score2: 0,
                winnerId: null
            });
        }

        if (hasBye) {
            const byeTeam = list[list.length - 1];
            newRound.push({
                id: `swiss-r0-m${matchCount}`,
                team1: byeTeam,
                team2: { id: 'BYE', name: 'BYE' },
                score1: 0,
                score2: 0,
                winnerId: byeTeam.id
            });
        }

        return newRound;
    }

    // 2. Последующие раунды: расчет статистики по сыгранным матчам
    const stats = new Map<string, { w: number, l: number, team: Team }>();
    teams.filter(t => t.id !== 'BYE').forEach(t => {
        stats.set(t.id, { w: 0, l: 0, team: t });
    });

    const playedPairs = new Set<string>();
    const teamsWithBye = new Set<string>();

    previousRounds.flat().forEach(m => {
        if (m.team1 && m.team2) {
            if (m.team1.id === 'BYE' && m.team2.id !== 'BYE') teamsWithBye.add(m.team2.id);
            if (m.team2.id === 'BYE' && m.team1.id !== 'BYE') teamsWithBye.add(m.team1.id);

            if (m.team1.id !== 'BYE' && m.team2.id !== 'BYE') {
                playedPairs.add([m.team1.id, m.team2.id].sort().join(':::'));
            }
        }

        if (m.winnerId) {
            if (m.team1 && m.team1.id !== 'BYE' && stats.has(m.team1.id)) {
                if (m.winnerId === m.team1.id) stats.get(m.team1.id)!.w++;
                else stats.get(m.team1.id)!.l++;
            }
            if (m.team2 && m.team2.id !== 'BYE' && stats.has(m.team2.id)) {
                if (m.winnerId === m.team2.id) stats.get(m.team2.id)!.w++;
                else stats.get(m.team2.id)!.l++;
            }
        }
    });

    // Фильтруем только активных участников (не выбыли и еще не вышли дальше)
    const activeTeams = Array.from(stats.values())
        .filter(s => s.w < winsToAdvance && s.l < lossesToEliminate);

    if (activeTeams.length < 2) return null; // Закончилось или осталась 1 команда

    let byeTeam: Team | null = null;
    let pool = [...activeTeams];

    // Если нечетное число команд, выбираем кому дать BYE (предпочтение тем у кого меньше W и кто еще не получал BYE)
    if (pool.length % 2 !== 0) {
        const candidates = [...pool].sort((a, b) => {
            if (a.w !== b.w) return a.w - b.w;
            return b.l - a.l;
        });

        const byeCandidate = candidates.find(c => !teamsWithBye.has(c.team.id)) || candidates[0];
        byeTeam = byeCandidate.team;
        pool = pool.filter(c => c.team.id !== byeTeam!.id);
    }

    // Сортируем pool по корзинам очков (победы убывают, поражения возрастают)
    pool.sort((a, b) => {
        if (a.w !== b.w) return b.w - a.w;
        if (a.l !== b.l) return a.l - b.l;
        return 0;
    });

    // Подбор пар без повторов
    const findPairing = (rem: typeof pool): [Team, Team][] | null => {
        if (rem.length === 0) return [];

        const first = rem[0];
        
        // Кандидаты для первого: сначала из той же корзины, затем без ранее сыгранных матчей
        const candidates = rem.slice(1).sort((a, b) => {
            const scoreDiffA = Math.abs(a.w - first.w) + Math.abs(a.l - first.l);
            const scoreDiffB = Math.abs(b.w - first.w) + Math.abs(b.l - first.l);

            if (scoreDiffA !== scoreDiffB) return scoreDiffA - scoreDiffB;

            const playedA = playedPairs.has([first.team.id, a.team.id].sort().join(':::'));
            const playedB = playedPairs.has([first.team.id, b.team.id].sort().join(':::'));

            if (playedA !== playedB) return playedA ? 1 : -1;

            return 0;
        });

        for (const candidate of candidates) {
            const nextRem = rem.filter(c => c.team.id !== first.team.id && c.team.id !== candidate.team.id);
            const subPairs = findPairing(nextRem);
            if (subPairs) {
                return [[first.team, candidate.team], ...subPairs];
            }
        }

        return null;
    };

    let resultPairs = findPairing(pool);

    // Фоллбэк если невозможно спарить абсолютно всех без конфликтов
    if (!resultPairs) {
        const fallbackPairs: [Team, Team][] = [];
        const rem = [...pool];
        while (rem.length >= 2) {
            const t1 = rem.shift()!;
            const t2 = rem.shift()!;
            fallbackPairs.push([t1.team, t2.team]);
        }
        resultPairs = fallbackPairs;
    }

    const roundIndex = previousRounds.length;
    const newRound: Match[] = [];

    resultPairs.forEach(([t1, t2], idx) => {
        newRound.push({
            id: `swiss-r${roundIndex}-m${idx}`,
            team1: t1,
            team2: t2,
            score1: 0,
            score2: 0,
            winnerId: null
        });
    });

    if (byeTeam) {
        newRound.push({
            id: `swiss-r${roundIndex}-m${resultPairs.length}`,
            team1: byeTeam,
            team2: { id: 'BYE', name: 'BYE' },
            score1: 0,
            score2: 0,
            winnerId: byeTeam.id
        });
    }

    return newRound;
};

