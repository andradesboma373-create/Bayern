import re

with open('src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace computeRoundWinChance with something short, or just leave it. We won't use it.
# We will completely replace `export function simulateMap` with our new version.
# We'll locate the start of `export function simulateMap` and the start of `function finalizeStats`
# and replace everything in between.

def get_block(start_marker, end_marker, text):
    start = text.find(start_marker)
    end = text.find(end_marker)
    return text[:start], text[end:]

before_sim, after_sim = get_block("export function simulateMap(", "function finalizeStats(", content)

new_simulate_map = """
export function simulateMap(
    team1: any[], team2: any[], 
    team1Synergy: number, team2Synergy: number, 
    team1Tactic: string, team2Tactic: string, 
    mapName: string, format: string, isCS2: boolean,
    team1Form: number = 0, team2Form: number = 0,
    team1MapExp: number = 50, team2MapExp: number = 50
) {
    let currentRoundTarget = format === 'MR15' ? 16 : (format === 'MR12' ? 13 : 10);
    let regularMaxRounds = format === 'MR15' ? 30 : (format === 'MR12' ? 24 : 18);
    if (!isCS2) {
        currentRoundTarget = 13;
        regularMaxRounds = 24;
    }
    
    const mapResult = {
        mapName,
        team1Score: 0,
        team2Score: 0,
        winner: 0,
        team1Stats: team1.map(p => ({ id: p.id, nickname: p.nickname, kills: 0, deaths: 0, assists: 0, damage: 0, roundsWon: 0, totalRounds: 0 })),
        team2Stats: team2.map(p => ({ id: p.id, nickname: p.nickname, kills: 0, deaths: 0, assists: 0, damage: 0, roundsWon: 0, totalRounds: 0 })),
        roundLogs: [] as any[],
    };

    let t1Money = isCS2 ? 4000 : 4000;
    let t2Money = isCS2 ? 4000 : 4000;
    let t1Momentum = 0;
    let t2Momentum = 0;
    let t1Streak = 0;
    let t2Streak = 0;

    const rewards = isCS2 ? CS2_SITUATION_REWARDS : SITUATION_REWARDS;
    let round = 0;
    let inOvertime = false;
    let isMatchOver = false;
    let lastPistolWinner: 1 | 2 | null = null;

    // We will use 5v5 simulation for each round
    // Add characteristic generator
    const getCharacteristics = (p: any) => {
        let r = parseFloat(p.rating) || 100;
        if (r < 10) r = r * 100; // normalize
        
        let aim = r;
        let reaction = r;
        let intellect = r;
        
        if (p.role === 'sniper') { aim *= 1.1; reaction *= 1.2; intellect *= 0.9; }
        if (p.role === 'opener' || p.role === 'entry') { reaction *= 1.25; aim *= 1.05; intellect *= 0.8; }
        if (p.role === 'captain' || p.role === 'igl') { intellect *= 1.4; reaction *= 0.85; aim *= 0.9; }
        if (p.role === 'lurker') { intellect *= 1.2; aim *= 1.05; }
        if (p.role === 'support') { intellect *= 1.1; aim *= 0.95; }
        
        return { aim, reaction, intellect };
    };

    while (!isMatchOver) {
        let isT1Tside;
        let isPistolRound = false;
        if (!inOvertime) {
            isT1Tside = round < (regularMaxRounds / 2);
            isPistolRound = (round === 0 || round === regularMaxRounds / 2);
            if (round === regularMaxRounds / 2) {
                t1Money = 4000; t2Money = 4000;
                t1Momentum = 0; t2Momentum = 0;
                t1Streak = 0; t2Streak = 0;
                lastPistolWinner = null;
            }
        } else {
            const otRound = round - regularMaxRounds;
            const otHalfRound = otRound % 6;
            isT1Tside = otHalfRound < 3; 
            isPistolRound = false;
            if (otRound % 3 === 0) {
                t1Money = 50000; t2Money = 50000;
                t1Momentum = 0; t2Momentum = 0;
                t1Streak = 0; t2Streak = 0;
                lastPistolWinner = null;
            }
        }

        const isSecondRound = !inOvertime && (round === 1 || round === (regularMaxRounds / 2) + 1);
        const t1IsPistolWinner = isSecondRound && lastPistolWinner === 1;
        const t2IsPistolWinner = isSecondRound && lastPistolWinner === 2;

        const t1Eco = getEconomy(t1Money, t1Momentum, isPistolRound, isCS2, isT1Tside, isSecondRound, t1IsPistolWinner);
        const t2Eco = getEconomy(t2Money, t2Momentum, isPistolRound, isCS2, !isT1Tside, isSecondRound, t2IsPistolWinner);
        
        // Cost
        t1Money = Math.max(0, t1Money - t1Eco.cost);
        t2Money = Math.max(0, t2Money - t2Eco.cost);

        // Map bias
        const mapBias = (isCS2 ? MAP_POOL_CS2 : MAP_POOL_S2).find(m => m.name === mapName) || { tSideBias: 0.5, ctSideBias: 0.5 };
        const t1MapMult = isT1Tside ? mapBias.tSideBias * 2 : mapBias.ctSideBias * 2;
        const t2MapMult = !isT1Tside ? mapBias.tSideBias * 2 : mapBias.ctSideBias * 2;

        // Tactic mults
        let t1TacticMult = 1.0;
        let t2TacticMult = 1.0;
        if (team1Tactic === 'aggressive' && isT1Tside) t1TacticMult = 1.1;
        if (team2Tactic === 'defensive' && !isT1Tside) t2TacticMult = 1.1;

        // Base eco mults
        const t1BasePower = t1Eco.power * t1MapMult * t1TacticMult * (1 + team1Synergy/1000);
        const t2BasePower = t2Eco.power * t2MapMult * t2TacticMult * (1 + team2Synergy/1000);

        // Round simulation loop (5v5)
        let t1Alive = [...team1];
        let t2Alive = [...team2];
        let roundLogsT1 = [];
        let roundLogsT2 = [];

        // Distribute positions and decisions
        while (t1Alive.length > 0 && t2Alive.length > 0) {
            // Pick duelists
            // Players with higher Reaction or openers are more likely to take early duels.
            const getDuelist = (aliveArr: any[]) => {
                let weights = aliveArr.map(p => {
                    let w = getCharacteristics(p).reaction;
                    if (aliveArr.length > 3 && (p.role === 'opener' || p.role === 'sniper')) w *= 2;
                    if (aliveArr.length <= 2 && p.role === 'lurker') w *= 2; // lurkers take late duels
                    return w;
                });
                let total = weights.reduce((a,b)=>a+b, 0);
                let r = Math.random() * total;
                for (let i = 0; i < aliveArr.length; i++) {
                    r -= weights[i];
                    if (r <= 0) return { player: aliveArr[i], index: i };
                }
                return { player: aliveArr[aliveArr.length-1], index: aliveArr.length-1 };
            };

            const d1 = getDuelist(t1Alive);
            const d2 = getDuelist(t2Alive);
            
            const p1 = d1.player;
            const p2 = d2.player;
            
            const p1Chars = getCharacteristics(p1);
            const p2Chars = getCharacteristics(p2);
            
            // Aim + Form + Intellect logic
            let p1Score = (p1Chars.aim * 0.6 + p1Chars.reaction * 0.3 + p1Chars.intellect * 0.1) * (1 + team1Form/100) * t1BasePower;
            let p2Score = (p2Chars.aim * 0.6 + p2Chars.reaction * 0.3 + p2Chars.intellect * 0.1) * (1 + team2Form/100) * t2BasePower;
            
            // Add wide spread to ratings using exponent (HLTV 2.0 scale tuning)
            p1Score = Math.pow(p1Score, 2.8);
            p2Score = Math.pow(p2Score, 2.8);

            // Add slight random noise (less than before, more deterministic based on stats)
            p1Score *= (0.85 + Math.random() * 0.3);
            p2Score *= (0.85 + Math.random() * 0.3);

            const p1WinProb = p1Score / (p1Score + p2Score);
            
            if (Math.random() < p1WinProb) {
                // p1 wins duel
                const stat1 = mapResult.team1Stats.find(s => s.id === p1.id);
                const stat2 = mapResult.team2Stats.find(s => s.id === p2.id);
                if (stat1) { stat1.kills++; stat1.damage += 100; }
                if (stat2) stat2.deaths++;
                
                t2Alive.splice(d2.index, 1);
                
                // Intellect helps get assists
                if (Math.random() < 0.25 && t1Alive.length > 1) {
                    const assistPool = t1Alive.filter(a => a.id !== p1.id);
                    if (assistPool.length > 0) {
                        const aPlayer = assistPool[Math.floor(Math.random() * assistPool.length)];
                        const aStat = mapResult.team1Stats.find(s => s.id === aPlayer.id);
                        if (aStat) { aStat.assists++; aStat.damage += 50; }
                    }
                }
            } else {
                // p2 wins duel
                const stat1 = mapResult.team1Stats.find(s => s.id === p1.id);
                const stat2 = mapResult.team2Stats.find(s => s.id === p2.id);
                if (stat2) { stat2.kills++; stat2.damage += 100; }
                if (stat1) stat1.deaths++;
                
                t1Alive.splice(d1.index, 1);

                if (Math.random() < 0.25 && t2Alive.length > 1) {
                    const assistPool = t2Alive.filter(a => a.id !== p2.id);
                    if (assistPool.length > 0) {
                        const aPlayer = assistPool[Math.floor(Math.random() * assistPool.length)];
                        const aStat = mapResult.team2Stats.find(s => s.id === aPlayer.id);
                        if (aStat) { aStat.assists++; aStat.damage += 50; }
                    }
                }
            }
        }

        const t1Wins = t1Alive.length > 0;
        let scenario = 'elimination';
        if (t1Wins && isT1Tside && Math.random() < 0.3) scenario = 'bomb_exploded';
        if (t1Wins && !isT1Tside && Math.random() < 0.2) scenario = 'bomb_defused';
        if (!t1Wins && !isT1Tside && Math.random() < 0.3) scenario = 'bomb_exploded';
        if (!t1Wins && isT1Tside && Math.random() < 0.2) scenario = 'bomb_defused';

        // Apply some non-lethal chip damage based on surviving players
        t1Alive.forEach(p => {
            if (Math.random() < 0.4) {
                const stat = mapResult.team1Stats.find(s => s.id === p.id);
                if (stat) stat.damage += Math.floor(Math.random() * 40);
            }
        });
        t2Alive.forEach(p => {
            if (Math.random() < 0.4) {
                const stat = mapResult.team2Stats.find(s => s.id === p.id);
                if (stat) stat.damage += Math.floor(Math.random() * 40);
            }
        });

        // Round concluded
        const t1Kills = team2.length - t2Alive.length;
        const t2Kills = team1.length - t1Alive.length;

        const roundLog = {
            round: round + 1,
            winner: t1Wins ? 1 : 2,
            scenario: scenario,
            score: t1Wins ? `${mapResult.team1Score + 1}:${mapResult.team2Score}` : `${mapResult.team1Score}:${mapResult.team2Score + 1}`,
            t1Eco, t2Eco,
            t1Kills, t2Kills,
            t1Alive: t1Alive.length,
            t2Alive: t2Alive.length,
            aces: []
        };
        mapResult.roundLogs.push(roundLog);

        if (t1Wins) {
            mapResult.team1Score++;
            t1Momentum = Math.min(100, t1Momentum + 25);
            t2Momentum = Math.max(0, t2Momentum - 20);
            t1Streak++;
            t2Streak = 0;
            if (isPistolRound) lastPistolWinner = 1;
            
            t1Money += rewards.win_elimination;
            let lossBonus = getLossBonus(t2Streak, rewards);
            t2Money += lossBonus;
            // surviving T2 players get 0 loss bonus if CT and time limit (omitted for simplicity, just base eco)
        } else {
            mapResult.team2Score++;
            t2Momentum = Math.min(100, t2Momentum + 25);
            t1Momentum = Math.max(0, t1Momentum - 20);
            t2Streak++;
            t1Streak = 0;
            if (isPistolRound) lastPistolWinner = 2;
            
            t2Money += rewards.win_elimination;
            let lossBonus = getLossBonus(t1Streak, rewards);
            t1Money += lossBonus;
        }

        mapResult.team1Stats.forEach(s => s.totalRounds = round + 1);
        mapResult.team2Stats.forEach(s => s.totalRounds = round + 1);

        round++;

        const t1MatchPoint = mapResult.team1Score >= currentRoundTarget;
        const t2MatchPoint = mapResult.team2Score >= currentRoundTarget;
        const isTie = mapResult.team1Score === currentRoundTarget - 1 && mapResult.team2Score === currentRoundTarget - 1;

        if (isTie && !inOvertime) {
            inOvertime = true;
            regularMaxRounds = (currentRoundTarget - 1) * 2; 
        }

        if (inOvertime) {
            const otTarget = regularMaxRounds / 2 + 1; // MR3 OT target
            if (mapResult.team1Score >= otTarget || mapResult.team2Score >= otTarget) {
                const diff = Math.abs(mapResult.team1Score - mapResult.team2Score);
                if (diff >= 2) {
                    isMatchOver = true;
                }
            }
            if (!isMatchOver && mapResult.team1Score === otTarget - 1 && mapResult.team2Score === otTarget - 1) {
                regularMaxRounds += 6;
            }
        } else {
            if (t1MatchPoint || t2MatchPoint) {
                isMatchOver = true;
            }
        }
    }

    mapResult.winner = mapResult.team1Score > mapResult.team2Score ? 1 : 2;
    finalizeStats(mapResult.team1Stats);
    finalizeStats(mapResult.team2Stats);

    return mapResult;
}
"""

with open('src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(before_sim + new_simulate_map + "\n" + after_sim)

