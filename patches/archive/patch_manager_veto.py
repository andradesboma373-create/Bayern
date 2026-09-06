import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
content = content.replace(
    "import TeamLogo from '../TeamLogo';",
    "import TeamLogo from '../TeamLogo';\nimport MatchVetoModal from './MatchVetoModal';\nimport Top20Modal from './Top20Modal';"
)

# Add states for Veto
content = content.replace(
    "const [isSwapMode, setIsSwapMode] = useState(false);",
    "const [isSwapMode, setIsSwapMode] = useState(false);\n  const [vetoMatch, setVetoMatch] = useState<any>(null);\n  const [showTop20, setShowTop20] = useState(false);"
)

# Render VetoModal
veto_modal_code = """
      {vetoMatch && (
        <MatchVetoModal 
          user={user}
          team1={vetoMatch.team1}
          team2={vetoMatch.team2}
          game={activeTournament.settings.game || 'cs2'}
          bo={activeTournament.settings.bestOf || 1}
          tournamentId={activeTournament.id}
          onClose={() => setVetoMatch(null)}
          onMatchComplete={(s1, s2) => {
            // Apply score
            import('./storage').then(({ updateBetaTournamentMatchResult }) => {
                updateBetaTournamentMatchResult(user.uid, activeTournament.id, vetoMatch.team1.name, vetoMatch.team2.name, s1, s2);
                setTournaments(loadTournaments(user.uid));
                const updated = loadTournaments(user.uid).find(t => t.id === activeTournament.id);
                if (updated) setActiveTournament(updated);
            });
            setVetoMatch(null);
          }}
        />
      )}
      {showTop20 && activeTournament && (
        <Top20Modal user={user} tournamentId={activeTournament.id} onClose={() => setShowTop20(false)} />
      )}
"""

content = content.replace(
    "export const BG_THEMES = {",
    "export const BG_THEMES = {"
) # Just a marker, actually let's insert before `return (`

content = content.replace(
    "return (\n    <div className=\"flex flex-col gap-6\">",
    "return (\n    <div className=\"flex flex-col gap-6\">\n" + veto_modal_code
)

# Add button "Завершить Турнир"
btn_code = """
                      {activeTournament.status === 'ongoing' && (
                          <button 
                            onClick={() => {
                                const t = {...activeTournament, status: 'completed'};
                                saveTournament(user.uid, t);
                                setActiveTournament(t);
                                setTournaments(loadTournaments(user.uid));
                                setShowTop20(true);
                            }} 
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                          >
                            Завершить турнир
                          </button>
                      )}
                      {activeTournament.status === 'completed' && (
                          <button 
                            onClick={() => setShowTop20(true)} 
                            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                          >
                            Топ 20 Игроков
                          </button>
                      )}
"""

content = content.replace(
    "<button onClick={handleExport}",
    btn_code + "\n                      <button onClick={handleExport}"
)

# And if status is 'setup', we need "Начать Турнир"
btn_start = """
                      {activeTournament.status === 'setup' && (
                          <button 
                            onClick={() => {
                                const t = {...activeTournament, status: 'ongoing'};
                                saveTournament(user.uid, t);
                                setActiveTournament(t);
                                setTournaments(loadTournaments(user.uid));
                            }} 
                            className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                          >
                            Начать турнир
                          </button>
                      )}
"""
content = content.replace(
    "<button onClick={handleExport}",
    btn_start + "\n                      <button onClick={handleExport}"
)

# Also expose vetoMatch via window or pass a prop down. Wait, SingleEliminationStage doesn't have onVetoMatch prop!
# We can just define a global event or pass it down. Let's pass it down.
# Let's add `onVetoMatch={(team1, team2) => setVetoMatch({team1, team2})}` to Stages!
content = content.replace(
    "<SingleEliminationStage",
    "<SingleEliminationStage onVetoMatch={(team1, team2) => setVetoMatch({team1, team2})} "
)
content = content.replace(
    "<GroupStage",
    "<GroupStage onVetoMatch={(team1, team2) => setVetoMatch({team1, team2})} "
)
content = content.replace(
    "<SwissStage",
    "<SwissStage onVetoMatch={(team1, team2) => setVetoMatch({team1, team2})} "
)

with open('src/components/setka_tourn/TournamentManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
