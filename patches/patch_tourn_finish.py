import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r') as f:
    content = f.read()

old_code = """                      {activeTournament.status === 'in_progress' && isTournamentFinished() && (
                          <div className="mt-12 flex justify-center animate-fade-in-up">"""

new_code = """                      {activeTournament.status === 'in_progress' && isTournamentFinished() && !isExporting && (
                          <div className="mt-12 flex justify-center animate-fade-in-up">"""

content = content.replace(old_code, new_code)

with open('src/components/setka_tourn/TournamentManager.tsx', 'w') as f:
    f.write(content)
