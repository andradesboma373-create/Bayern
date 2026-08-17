import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the onClick handler of "Завершить турнир"
old_onclick = """
                                  onClick={() => {
                                      const t = { ...activeTournament, status: 'completed' };
                                      updateTournamentLocal(user.uid, t);
                                      setTournaments(loadTournaments(user.uid));
                                      setShowTop20(true);
                                  }}
"""

new_onclick = """
                                  onClick={() => {
                                      let wName = '';
                                      if (activeTournament.settings.eliminationType === 'double') {
                                          if (activeTournament.grandFinal && activeTournament.grandFinal.length > 0) {
                                              const gf = activeTournament.grandFinal;
                                              if (gf[1] && gf[1].winnerId) {
                                                  wName = gf[1].winnerId === gf[1].team1?.id ? gf[1].team1.name : (gf[1].team2 ? gf[1].team2.name : '');
                                              } else if (gf[0].winnerId) {
                                                  wName = gf[0].winnerId === gf[0].team1?.id ? gf[0].team1.name : (gf[0].team2 ? gf[0].team2.name : '');
                                              }
                                          }
                                      } else {
                                          if (activeTournament.bracketRounds && activeTournament.bracketRounds.length > 0) {
                                              const lastRound = activeTournament.bracketRounds[activeTournament.bracketRounds.length - 1];
                                              if (lastRound && lastRound.length > 0 && lastRound[0].winnerId) {
                                                  wName = lastRound[0].winnerId === lastRound[0].team1?.id ? lastRound[0].team1.name : (lastRound[0].team2 ? lastRound[0].team2.name : '');
                                              }
                                          }
                                      }
                                      const t = { ...activeTournament, status: 'completed', winnerName: wName };
                                      updateTournamentLocal(user.uid, t);
                                      setTournaments(loadTournaments(user.uid));
                                      setActiveTournament(t);
                                      setShowTop20(true);
                                  }}
"""

content = content.replace(old_onclick, new_onclick)

with open('src/components/setka_tourn/TournamentManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
