import re

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Import PlayerAvatar
content = content.replace(
    "import { Team } from './types';",
    "import { Team } from './types';\nimport PlayerAvatar from '../PlayerAvatar';"
)

# Fetch captains inside MatchVetoModal
fetch_captains_code = """
  const [captain1, setCaptain1] = useState<any>(null);
  const [captain2, setCaptain2] = useState<any>(null);

  useEffect(() => {
    try {
      const localTeams = JSON.parse(localStorage.getItem(`teams_${user?.uid}`) || '[]');
      const t1 = localTeams.find((t: any) => t.id === team1.id);
      const t2 = localTeams.find((t: any) => t.id === team2.id);
      
      if (t1 && t1.players && t1.players.length > 0) {
        setCaptain1(t1.players[0]);
      }
      if (t2 && t2.players && t2.players.length > 0) {
        setCaptain2(t2.players[0]);
      }
    } catch (e) {}
  }, [team1, team2, user]);
"""

content = content.replace(
    "  const [isSimulating, setIsSimulating] = useState(false);",
    "  const [isSimulating, setIsSimulating] = useState(false);\n" + fetch_captains_code
)

# Render captains in UI
captains_ui = """
          {/* Captains UI */}
          <div className="flex items-center justify-between mt-6 px-10">
            <div className="flex flex-col items-center gap-2">
              <PlayerAvatar playerName={captain1?.nickname || '?'} game={game} sizeClassName="w-24 h-24 text-4xl" className="border-4 border-[#ff8f00]/30 shadow-[0_0_20px_rgba(255,143,0,0.2)]" />
              <div className="text-white font-black uppercase tracking-wider">{captain1?.nickname || 'Капитан 1'}</div>
              <div className="text-xs text-[#ff8f00] font-bold">({team1.name})</div>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="text-[#ff8f00] font-black text-3xl mb-2">VETO</div>
              <div className="text-white/40 text-sm font-bold uppercase">Бан / Пик</div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <PlayerAvatar playerName={captain2?.nickname || '?'} game={game} sizeClassName="w-24 h-24 text-4xl" className="border-4 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]" />
              <div className="text-white font-black uppercase tracking-wider">{captain2?.nickname || 'Капитан 2'}</div>
              <div className="text-xs text-cyan-400 font-bold">({team2.name})</div>
            </div>
          </div>
"""

# Inject before the maps grid
content = content.replace(
    '<div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">',
    captains_ui + '\n\n          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">'
)

# Smart auto-ban/pick instead of Math.random()
# We will use the map name string length and team name to make a deterministic pseudo-random choice, 
# simulating "statistics" so they always ban the same way against each other.
smart_pick_logic = """
    // Умный авто-бан/пик на основе симуляции статистики встреч и процентов карт
    // Используем детерминированный выбор на основе ID команд и названия карты,
    // чтобы создать иллюзию того, что они всегда банят "неудобные" для себя карты.
    const team = currentStep.teamIndex === 1 ? team1 : team2;
    const opponent = currentStep.teamIndex === 1 ? team2 : team1;
    
    // Сортируем оставшиеся карты по "весу" (вычисляется детерминированно)
    const sortedMaps = [...remainingMaps].sort((a, b) => {
      const weightA = (a.name.length * team.name.length) % 10 - (a.name.length * opponent.name.length) % 10;
      const weightB = (b.name.length * team.name.length) % 10 - (b.name.length * opponent.name.length) % 10;
      return weightB - weightA;
    });
    
    // Если бан - берем карту с наихудшим для нас "весом" (последнюю в отсортированном списке)
    // Если пик - берем карту с наилучшим "весом" (первую)
    let m = remainingMaps[0];
    if (currentStep.action === 'ban') {
      m = sortedMaps[sortedMaps.length - 1];
    } else {
      m = sortedMaps[0];
    }
"""

content = content.replace(
    'const m = remainingMaps[Math.floor(Math.random() * remainingMaps.length)];',
    smart_pick_logic
)

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
