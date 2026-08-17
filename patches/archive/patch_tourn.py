import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the end of SingleEliminationStage
insertion_point = content.find("</SingleEliminationStage>")
if insertion_point == -1:
    insertion_point = content.find("isSwapMode={isSwapMode} />\n                      )}")
    if insertion_point != -1:
        insertion_point += len("isSwapMode={isSwapMode} />\n                      )}")

new_button = """
                      {activeTournament.status === 'in_progress' && activeTournament.winnerName && (
                          <div className="mt-12 flex justify-center animate-fade-in-up">
                              <button
                                  onClick={() => {
                                      const t = { ...activeTournament, status: 'completed' };
                                      updateTournamentLocal(user.uid, t);
                                      setTournaments(loadTournaments(user.uid));
                                      setShowTop20(true);
                                  }}
                                  className="px-12 py-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl font-black text-2xl uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:scale-105 transition-all hover:shadow-[0_0_60px_rgba(239,68,68,0.6)] flex flex-col items-center gap-2"
                              >
                                  <span>Завершить турнир</span>
                                  <span className="text-sm font-bold text-white/70">Подвести итоги и Топ-20</span>
                              </button>
                          </div>
                      )}
"""

if insertion_point != -1:
    content = content[:insertion_point] + new_button + content[insertion_point:]

with open('src/components/setka_tourn/TournamentManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
