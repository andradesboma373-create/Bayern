import { simulateMatchSeries } from './simulation';
import { db, collection, addDoc } from '../firebase';
import { saveMatchesToLocalStorage } from './utils';

const TEAMS = [
  {
    id: 'navi', name: 'Natus Vincere', game: 'cs2',
    players: [
      { id: '1', nickname: 'Aleksib', role: 'captain', rating: 98 },
      { id: '2', nickname: 'jL', role: 'rifler', rating: 110 },
      { id: '3', nickname: 'b1t', role: 'entry', rating: 108 },
      { id: '4', nickname: 'w0nderful', role: 'sniper', rating: 112 },
      { id: '5', nickname: 'iM', role: 'rifler', rating: 105 }
    ]
  },
  {
    id: 'spirit', name: 'Team Spirit', game: 'cs2',
    players: [
      { id: '6', nickname: 'chopper', role: 'captain', rating: 95 },
      { id: '7', nickname: 'donk', role: 'entry', rating: 125 },
      { id: '8', nickname: 'sh1ro', role: 'sniper', rating: 118 },
      { id: '9', nickname: 'magixx', role: 'support', rating: 100 },
      { id: '10', nickname: 'zont1x', role: 'rifler', rating: 106 }
    ]
  },
  {
    id: 'vitality', name: 'Team Vitality', game: 'cs2',
    players: [
      { id: '11', nickname: 'apEX', role: 'captain', rating: 96 },
      { id: '12', nickname: 'ZywOo', role: 'sniper', rating: 122 },
      { id: '13', nickname: 'Spinx', role: 'rifler', rating: 112 },
      { id: '14', nickname: 'flameZ', role: 'entry', rating: 109 },
      { id: '15', nickname: 'mezii', role: 'support', rating: 102 }
    ]
  },
  {
    id: 'g2', name: 'G2 Esports', game: 'cs2',
    players: [
      { id: '16', nickname: 'HooXi', role: 'captain', rating: 90 },
      { id: '17', nickname: 'm0NESY', role: 'sniper', rating: 121 },
      { id: '18', nickname: 'NiKo', role: 'rifler', rating: 115 },
      { id: '19', nickname: 'huNter-', role: 'entry', rating: 105 },
      { id: '20', nickname: 'nexa', role: 'support', rating: 95 }
    ]
  },
  {
    id: 'faze', name: 'FaZe Clan', game: 'cs2',
    players: [
      { id: '21', nickname: 'karrigan', role: 'captain', rating: 93 },
      { id: '22', nickname: 'broky', role: 'sniper', rating: 113 },
      { id: '23', nickname: 'ropz', role: 'lurker', rating: 111 },
      { id: '24', nickname: 'frozen', role: 'rifler', rating: 110 },
      { id: '25', nickname: 'rain', role: 'entry', rating: 104 }
    ]
  }
];

const MAPS = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Vertigo'];
const FORMATS = ['BO1', 'BO3'];

export async function generateDemoMatches(userId: string) {
  const matches = [];
  const now = new Date();
  
  for (let i = 0; i < 100; i++) {
    // Pick two random teams
    let t1Idx = Math.floor(Math.random() * TEAMS.length);
    let t2Idx = Math.floor(Math.random() * TEAMS.length);
    while (t2Idx === t1Idx) t2Idx = Math.floor(Math.random() * TEAMS.length);
    
    const team1 = TEAMS[t1Idx];
    const team2 = TEAMS[t2Idx];
    const format = FORMATS[Math.random() > 0.3 ? 1 : 0]; // 70% BO3, 30% BO1
    
    // Pick maps
    const matchMaps = [];
    const availableMaps = [...MAPS];
    const mapCount = format === 'BO1' ? 1 : 3;
    for (let m = 0; m < mapCount; m++) {
      const idx = Math.floor(Math.random() * availableMaps.length);
      matchMaps.push(availableMaps.splice(idx, 1)[0]);
    }

    const t1Form = Math.floor(Math.random() * 21) - 10;
    const t2Form = Math.floor(Math.random() * 21) - 10;
    
    const simRes = simulateMatchSeries(
      team1.players, team2.players,
      50, 50,
      'balanced', 'balanced',
      matchMaps, 'MR12', true, 'Demo Tournament',
      t1Form, t2Form
    );
    
    // Create match date (spread over last 30 days)
    const matchDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    const matchDoc = {
      userId,
      channelId: userId, // for backend
      team1: team1.id,
      team2: team2.id,
      team1Name: team1.name,
      team2Name: team2.name,
      team1Score: simRes.team1Score,
      team2Score: simRes.team2Score,
      winner: simRes.team1Score > simRes.team2Score ? 1 : 2,
      maps: simRes.maps,
      format,
      gameMode: 'cs2',
      team1Stats: simRes.team1Stats,
      team2Stats: simRes.team2Stats,
      
      date: matchDate.toISOString(),
      timestamp: matchDate.getTime()
    };
    
    matches.push(matchDoc);
  }
  
  // Sort matches by timestamp descending
  matches.sort((a, b) => b.timestamp - a.timestamp);
  
  // Save to db
  for (const match of matches) {
    try {
      await addDoc(collection(db, 'matches'), match);
    } catch (e) {
      console.error(e);
    }
  }
  
  return matches;
}
