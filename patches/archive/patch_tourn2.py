import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to compute if the tournament is completely finished.
# Inside TournamentManager, around line 100 or so, we can define a check.
# Let's find "const handleAdvanceToBracket". We can add the check just before it.

helper = """
  const isTournamentFinished = () => {
      if (!activeTournament) return false;
      if (activeTournament.settings.eliminationType === 'double') {
          if (activeTournament.grandFinal && activeTournament.grandFinal.length > 0) {
              const gf = activeTournament.grandFinal;
              if (gf[0].winnerId && (!gf[1] || gf[1].winnerId || gf[0].team1?.id === gf[0].winnerId)) return true;
              if (gf[1] && gf[1].winnerId) return true;
          }
      } else {
          if (activeTournament.bracketRounds && activeTournament.bracketRounds.length > 0) {
              const lastRound = activeTournament.bracketRounds[activeTournament.bracketRounds.length - 1];
              if (lastRound && lastRound.length > 0 && lastRound[0].winnerId) return true;
          }
      }
      return false;
  };
"""

content = content.replace("const handleAdvanceToBracket =", helper + "\n  const handleAdvanceToBracket =")

# Then we update the button condition
content = content.replace("activeTournament.status === 'in_progress' && activeTournament.winnerName &&", "activeTournament.status === 'in_progress' && isTournamentFinished() &&")

with open('src/components/setka_tourn/TournamentManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
