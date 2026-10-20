import { MatchEngine } from '../engine/MatchEngine';
import { CALLS_CONFIG } from '../config/CallsConfig';

function createPlayer(id: string, role: string, calls?: number, rating: number = 100) {
    return {
        id,
        nickname: `Player-${id}`,
        role,
        rating,
        calls
    };
}

function runSim(calls1: number, calls2: number) {
    const t1 = [
        createPlayer('1', 'Captain', calls1),
        createPlayer('2', 'Rifler'),
        createPlayer('3', 'Rifler'),
        createPlayer('4', 'Rifler'),
        createPlayer('5', 'Rifler')
    ];
    const t2 = [
        createPlayer('6', 'Captain', calls2),
        createPlayer('7', 'Rifler'),
        createPlayer('8', 'Rifler'),
        createPlayer('9', 'Rifler'),
        createPlayer('10', 'Rifler')
    ];
    
    let t1Wins = 0;
    for (let i = 0; i < 50; i++) {
        const state = MatchEngine.createInitialState(t1, t2, true, 'mirage', 'MR12', i);
        const result = MatchEngine.simulateEntireMatch(state);
        if (result.team1Score > result.team2Score) t1Wins++;
    }
    return t1Wins;
}

console.log('Running CALLS validation...');
const wins90 = runSim(90, 70);
const wins91 = runSim(91, 70);
console.log(`Wins with CALLS 90: ${wins90}/50`);
console.log(`Wins with CALLS 91: ${wins91}/50`);
console.log('CALLS influence test:', wins91 > wins90 ? 'PASSED' : 'POTENTIALLY FAILED (or variance)');
